from fastapi import APIRouter, UploadFile, File, HTTPException, BackgroundTasks, Query
from fastapi.responses import StreamingResponse
from pydantic import EmailStr
from typing import Dict, Any
import asyncio
import json
import logging
from concurrent.futures import ThreadPoolExecutor
from ..services.document_processor import DocumentProcessor
from ..services.progress_tracker import ProgressTracker
from ..services.document_manager import get_document_manager
from ..config import MAX_FILE_SIZE
from ..services.db import get_db
from ..services.graph_db import get_graph_db
from datetime import datetime
from bson import ObjectId

logger = logging.getLogger(__name__)
upload_router = APIRouter(prefix="/upload", tags=["upload"])

# Global progress tracker
progress_tracker = ProgressTracker()

# Thread pool for CPU-intensive tasks to avoid blocking the event loop
executor = ThreadPoolExecutor(max_workers=4)

@upload_router.post("/document")
async def upload_document(
    file: UploadFile = File(...),
    email: str = Query(..., description="User email for document ownership")
):
    """Upload and process a document with true async processing"""
    
    logger.info(f"Received upload request for file: {file.filename}")
    
    # Extract file extension
    file_extension = file.filename.split(".")[-1].lower() if "." in file.filename else "txt"
    """Upload and process a document with true async processing"""
    
    logger.info(f"Received upload request for file: {file.filename}")
    
    # Validate file type
    if not file.filename:
        logger.error("No filename provided")
        raise HTTPException(status_code=400, detail="No file provided")
    
    allowed_extensions = ['.txt', '.pdf', '.docx', '.doc']
    file_extension = file.filename.lower().split('.')[-1] if '.' in file.filename else ''
    
    if f'.{file_extension}' not in allowed_extensions:
        raise HTTPException(
            status_code=400, 
            detail=f"Unsupported file type. Allowed types: {', '.join(allowed_extensions)}"
        )
    
    # Generate upload ID
    upload_id = progress_tracker.create_upload_session(file.filename)
    
    try:
        # Read file content
        content = await file.read()
        if len(content) > MAX_FILE_SIZE:
            logger.error(f"File too large: {len(content)} bytes")
            progress_tracker.update_progress(upload_id, 0, "File too large", "failed")
            raise HTTPException(status_code=400, detail=f"File too large. Maximum size: {MAX_FILE_SIZE // (1024*1024)}MB")
        
        logger.info(f"Read {len(content)} bytes from file {file.filename}")
        
        # Create initial Mongo record immediately
        document_manager = get_document_manager()
        document_manager.create_document_record(upload_id, file.filename, len(content), file_extension, email)
        
        # Start processing in a separate task to avoid blocking
        asyncio.create_task(
            run_document_processing_async(
                upload_id, file.filename, content, file_extension, email
            )
        )
        
        # Return immediately - don't wait for processing
        return {
            "success": True,
            "upload_id": upload_id,
            "message": "Document upload started",
            "filename": file.filename
        }
        
    except Exception as e:
        logger.error(f"Error starting document upload: {e}")
        progress_tracker.update_progress(upload_id, 0, f"Error: {str(e)}", "failed")
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

@upload_router.get("/progress/{upload_id}")
async def get_upload_progress(upload_id: str):
    """Get the progress of a document upload"""
    progress = progress_tracker.get_progress(upload_id)
    if not progress:
        # Return 202 (accepted / initializing) to avoid noisy 404s during race conditions
        return {
            "upload_id": upload_id,
            "progress": {
                "upload_id": upload_id,
                "filename": None,
                "percentage": 10,
                "message": "Initializing upload session...",
                "status": "processing",
                "elapsed_time": 0,
                "entities_count": 0,
                "relationships_count": 0,
                "error_message": None,
                "last_update": None
            }
        }
    return {"upload_id": upload_id, "progress": progress}

@upload_router.get("/progress/{upload_id}/stream")
async def stream_upload_progress(upload_id: str):
    """Stream real-time progress updates for a document upload"""
    
    async def progress_stream():
        while True:
            progress = progress_tracker.get_progress(upload_id)
            
            if not progress:
                yield f"data: {json.dumps({'error': 'Upload session not found'})}\n\n"
                break
            
            # Send progress update
            yield f"data: {json.dumps(progress)}\n\n"
            
            # If processing is complete or failed, stop streaming
            if progress.get('status') in ['completed', 'failed']:
                break
            
            # Wait before next update
            await asyncio.sleep(1)
    
    return StreamingResponse(
        progress_stream(),
        media_type="text/plain",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "Content-Type": "text/event-stream"
        }
    )

@upload_router.get("/all-progress")
async def get_all_upload_progress():
    """Get progress for all active upload sessions"""
    all_progress = progress_tracker.get_all_progress()
    stats = progress_tracker.get_stats()
    
    return {
        "uploads": all_progress,
        "stats": stats
    }

@upload_router.delete("/progress/{upload_id}")
async def remove_upload_session(upload_id: str):
    """Remove an upload session (cleanup)"""
    success = progress_tracker.remove_upload(upload_id)
    
    if not success:
        raise HTTPException(status_code=404, detail="Upload session not found")
    
    return {"success": True, "message": "Upload session removed"}

@upload_router.get("/files")
async def list_uploaded_files(email: EmailStr = Query(..., description="User email to filter files")):
    """List persisted uploaded files from MongoDB for a specific user"""
    db = get_db()
    col = db.get_collection("uploaded_files")
    # Filter by user email
    docs = list(col.find({"user_email": email}).sort("created_at", -1))
    def serialize(doc):
        return {
            "id": str(doc.get("_id")),
            "upload_id": doc.get("upload_id"),
            "filename": doc.get("filename"),
            "size": doc.get("size", 0),
            "extension": doc.get("extension"),
            "status": doc.get("status"),
            "entities_count": len(doc.get("entities", [])),
            "relationships_count": len(doc.get("relationships", [])),
            "created_at": doc.get("created_at"),
            "updated_at": doc.get("updated_at"),
        }
    return {"success": True, "files": [serialize(d) for d in docs]}

@upload_router.delete("/files/{upload_id}")
async def delete_uploaded_file(upload_id: str):
    """Delete an uploaded file record and associated graph entities/relationships"""
    db = get_db()
    col = db.get_collection("uploaded_files")
    record = col.find_one({"upload_id": upload_id})
    if not record:
        raise HTTPException(status_code=404, detail="File record not found")

    # Delete relationships and then orphan entities in graph
    graph = get_graph_db()
    relationships = record.get("relationships", [])
    entities = record.get("entities", [])
    for rel in relationships:
        try:
            graph.delete_relationship(rel.get("from"), rel.get("type", "RELATED_TO"), rel.get("to"))
        except Exception as e:
            logger.error(f"Failed deleting relationship during file delete: {e}")
    for ent in entities:
        try:
            graph.delete_entity_if_isolated(ent.get("name"))
        except Exception as e:
            logger.error(f"Failed deleting entity during file delete: {e}")

    col.delete_one({"_id": record.get("_id")})
    progress_tracker.remove_upload(upload_id)

    return {"success": True, "message": "File and associated graph data deleted"}

@upload_router.get("/documents")
async def get_documents(email: str = Query(..., description="User email")):
    """Get all documents for a user"""
    try:
        document_manager = get_document_manager()
        documents = document_manager.get_all_documents(email)
        return {
            "success": True,
            "documents": documents,
            "count": len(documents)
        }
    except Exception as e:
        logger.error(f"Error getting documents: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get documents: {str(e)}")

@upload_router.get("/documents/{upload_id}")
async def get_document(upload_id: str):
    """Get a specific document by upload ID"""
    try:
        document_manager = get_document_manager()
        document = document_manager.get_document_by_upload_id(upload_id)
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")
        return {
            "success": True,
            "document": document
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting document {upload_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get document: {str(e)}")

@upload_router.get("/sync-status")
async def get_sync_status():
    """Get synchronization status between MongoDB and Graph DB"""
    try:
        document_manager = get_document_manager()
        status = document_manager.get_sync_status()
        return {
            "success": True,
            "sync_status": status
        }
    except Exception as e:
        logger.error(f"Error getting sync status: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get sync status: {str(e)}")

@upload_router.post("/sync")
async def manual_sync():
    """Manually trigger MongoDB-Graph DB synchronization"""
    try:
        document_manager = get_document_manager()
        sync_result = document_manager.sync_graph_with_mongodb()
        return {
            "success": True,
            "message": "Manual sync completed",
            "sync_result": sync_result
        }
    except Exception as e:
        logger.error(f"Error during manual sync: {e}")
        raise HTTPException(status_code=500, detail=f"Sync failed: {str(e)}")



async def run_document_processing_async(upload_id: str, filename: str, content: bytes, file_extension: str, user_email: str):
    """Run document processing in thread pool to avoid blocking the event loop"""
    try:
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(
            executor,
            process_document_sync,
            upload_id, filename, content, file_extension, user_email
        )
    except Exception as e:
        logger.error(f"Error in async document processing: {e}")
        progress_tracker.update_progress(
            upload_id, 0, f"Processing failed: {str(e)}", "failed", error_message=str(e)
        )

def process_document_sync(upload_id: str, filename: str, content: bytes, file_extension: str, user_email: str):
    """Synchronous document processing function to run in thread pool"""
    logger.info(f"Starting document processing for upload {upload_id} for user {user_email}")
    
    def progress_callback(percentage: int, message: str):
        """Callback function to update progress"""
        progress_tracker.update_progress(upload_id, percentage, message, "processing")
        logger.info(f"Progress update for {upload_id}: {percentage}% - {message}")
    
    try:
        # Initialize document processor
        processor = DocumentProcessor()
        logger.info("Document processor initialized successfully")

        # Initial progress update
        progress_tracker.update_progress(upload_id, 20, "Starting document analysis...", "processing")

        # Process document based on type
        if file_extension == 'pdf':
            result = processor.process_pdf_file(content, filename, user_email, progress_callback)
        elif file_extension in ['docx', 'doc']:
            text_content = content.decode('utf-8')
            result = processor.process_text_file(text_content, filename, user_email, progress_callback)
        else:  # txt file
            text_content = content.decode('utf-8')
            result = processor.process_text_file(text_content, filename, user_email, progress_callback)

        if not result.get('success'):
            raise Exception(result.get('error', 'Unknown processing error'))

        entities = result.get('entities', [])
        relationships = result.get('relationships', [])
        created_nodes = result.get('created_nodes', [])
        created_relationships = result.get('created_relationships', [])

        # Update MongoDB record using document manager
        document_manager = get_document_manager()
        document_manager.update_document_processing_result(
            upload_id, entities, relationships, created_nodes, created_relationships
        )

        # Final progress update
        progress_tracker.update_progress(
            upload_id, 100,
            f"Analysis complete! Extracted {len(entities)} entities and {len(relationships)} relationships",
            "completed",
            entities_count=len(entities),
            relationships_count=len(relationships)
        )

        logger.info(f"Document processing completed for upload {upload_id}")

    except Exception as e:
        logger.error(f"Error processing document for upload {upload_id}: {e}")
        progress_tracker.update_progress(
            upload_id, 0, f"Processing failed: {str(e)}", "failed", error_message=str(e)
        )
        
        # Update record status to failed
        try:
            db = get_db()
            col = db.get_collection("uploaded_files")
            col.update_one(
                {"upload_id": upload_id}, 
                {"$set": {"status": "failed", "updated_at": datetime.utcnow(), "error": str(e)}}
            )
        except Exception:
            pass