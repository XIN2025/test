from fastapi import APIRouter, UploadFile, File, HTTPException, BackgroundTasks
from fastapi.responses import StreamingResponse
from typing import Dict, Any
import asyncio
import json
import logging
from ..services.document_processor import DocumentProcessor
from ..services.progress_tracker import ProgressTracker
from ..config import MAX_FILE_SIZE
from ..services.db import get_db
from ..services.graph_db import get_graph_db
from datetime import datetime
from bson import ObjectId

logger = logging.getLogger(__name__)
upload_router = APIRouter(prefix="/upload", tags=["upload"])

# Global progress tracker
progress_tracker = ProgressTracker()

@upload_router.post("/document")
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...)
):
    """Upload and process a document with progress tracking"""
    
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
        # Read file content immediately before the request handler completes
        content = await file.read()
        if len(content) > MAX_FILE_SIZE:
            logger.error(f"File too large: {len(content)} bytes")
            progress_tracker.update_progress(upload_id, 0, "File too large", "failed")
            raise HTTPException(status_code=400, detail=f"File too large. Maximum size: {MAX_FILE_SIZE // (1024*1024)}MB")
        logger.info(f"Read {len(content)} bytes from file {file.filename}")
        
        # Start processing in background with the file content
        background_tasks.add_task(
            process_document_background,
            upload_id,
            file.filename,
            content,
            file_extension
        )
        
        # Create initial Mongo record (status = processing)
        db = get_db()
        files_col = db.get_collection("uploaded_files")
        files_col.insert_one({
            "upload_id": upload_id,
            "filename": file.filename,
            "size": len(content),
            "extension": file_extension,
            "status": "processing",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "entities": [],
            "relationships": []
        })

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
async def list_uploaded_files():
    """List persisted uploaded files from MongoDB"""
    db = get_db()
    col = db.get_collection("uploaded_files")
    docs = list(col.find().sort("created_at", -1))
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

async def process_document_background(upload_id: str, filename: str, content: bytes, file_extension: str):
    """Background task to process uploaded document with real-time progress updates"""
    logger.info(f"Starting background processing for upload {upload_id}")
    
    def progress_callback(percentage: int, message: str):
        """Callback function to update progress"""
        progress_tracker.update_progress(
            upload_id, 
            percentage, 
            message, 
            "processing"
        )
        logger.info(f"Progress update for {upload_id}: {percentage}% - {message}")
    
    try:
        # Initialize document processor
        try:
            processor = DocumentProcessor()
            logger.info("Document processor initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize document processor: {e}")
            raise Exception(f"Failed to initialize document processor: {str(e)}")

        # Initial progress update
        progress_tracker.update_progress(upload_id, 20, "Starting document analysis...", "processing")

        # Process document based on type with progress callback
        if file_extension == 'pdf':
            result = processor.process_pdf_file(content, filename, progress_callback)
        elif file_extension in ['docx', 'doc']:
            # For now, treat as text file since we don't have Word processing
            text_content = content.decode('utf-8')
            result = processor.process_text_file(text_content, filename, progress_callback)
        else:  # txt file
            text_content = content.decode('utf-8')
            result = processor.process_text_file(text_content, filename, progress_callback)

        # Check if processing was successful
        if not result.get('success'):
            raise Exception(result.get('error', 'Unknown processing error'))

        entities = result.get('entities', [])
        relationships = result.get('relationships', [])

        # Persist entities/relationships to Mongo record
        try:
            db = get_db()
            col = db.get_collection("uploaded_files")
            col.update_one(
                {"upload_id": upload_id},
                {"$set": {
                    "status": "completed",
                    "updated_at": datetime.utcnow(),
                    "entities": entities,
                    "relationships": relationships,
                }}
            )
        except Exception as e:
            logger.error(f"Failed updating Mongo record for upload {upload_id}: {e}")

        # Final progress update with completion
        progress_tracker.update_progress(
            upload_id,
            100,
            f"Analysis complete! Extracted {len(entities)} entities and {len(relationships)} relationships",
            "completed",
            entities_count=len(entities),
            relationships_count=len(relationships)
        )

        logger.info(f"Document processing completed for upload {upload_id}")

    except Exception as e:
        logger.error(f"Error processing document for upload {upload_id}: {e}")
        progress_tracker.update_progress(
            upload_id, 
            0, 
            f"Processing failed: {str(e)}", 
            "failed", 
            error_message=str(e)
        ) 
        # Update record status to failed
        try:
            db = get_db()
            col = db.get_collection("uploaded_files")
            col.update_one({"upload_id": upload_id}, {"$set": {"status": "failed", "updated_at": datetime.utcnow(), "error": str(e)}})
        except Exception:
            pass