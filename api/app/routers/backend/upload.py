from fastapi import APIRouter, UploadFile, File, HTTPException, BackgroundTasks, Query
from fastapi.responses import StreamingResponse
from pydantic import EmailStr
from typing import Dict, Any
import asyncio
import json
import logging
from concurrent.futures import ThreadPoolExecutor
from ...services.ai_services.document_processor import DocumentProcessor
from ...services.backend_services.progress_tracker import get_progress_tracker
from ...services.backend_services.document_manager import get_document_manager
from ...config import MAX_FILE_SIZE
from ...services.backend_services.db import get_db
from ...services.miscellaneous.graph_db import get_graph_db
from datetime import datetime
from bson import ObjectId
from urllib.parse import unquote
from app.schemas.backend.documents import DocumentType

logger = logging.getLogger(__name__)
upload_router = APIRouter(prefix="/upload", tags=["upload"])

# Global progress tracker
progress_tracker = get_progress_tracker()

# Thread pool for CPU-intensive tasks to avoid blocking the event loop
executor = ThreadPoolExecutor(max_workers=4)

@upload_router.post("/document")
async def upload_document(
    file: UploadFile = File(...),
    email: str = Query(..., description="User email for document ownership")
):
    """Upload and process a document with true async processing"""
    
    filename = unquote(file.filename)
    logger.info(f"Received upload request for file: {filename}")

    # Extract file extension
    file_extension = filename.split(".")[-1].lower() if "." in filename else "txt"
    """Upload and process a document with true async processing"""

    logger.info(f"Received upload request for file: {filename}")
    
    # Validate file type
    if not filename:
        logger.error("No filename provided")
        raise HTTPException(status_code=400, detail="No file provided")
    
    allowed_extensions = ['.pdf', '.docx', '.doc']
    file_extension = filename.lower().split('.')[-1] if '.' in filename else ''
    
    if f'.{file_extension}' not in allowed_extensions:
        raise HTTPException(
            status_code=400, 
            detail=f"Unsupported file type. Allowed types: {', '.join(allowed_extensions)}"
        )
    
    # Generate upload ID
    upload_id = progress_tracker.create_upload_session(filename)
    
    try:
        # Read file content
        content = await file.read()
        if len(content) > MAX_FILE_SIZE:
            logger.error(f"File too large: {len(content)} bytes")
            progress_tracker.update_progress(upload_id, 0, "File too large", "failed")
            raise HTTPException(status_code=400, detail=f"File too large. Maximum size: {MAX_FILE_SIZE // (1024*1024)}MB")
        
        print(f"Read {len(content)} bytes from file {filename}")
        
        # Create initial Mongo record immediately
        document_manager = get_document_manager()
        document_manager.add_document(
            upload_id=upload_id,
            content=content,
            filename=filename,
            user_email=email,
            type=DocumentType.DOCUMENT
        )
        
        # Return immediately - don't wait for processing
        return {
            "success": True,
            "upload_id": upload_id,
            "message": "Document upload started",
            "filename": filename
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
    document_manager = get_document_manager()
    documents = document_manager.get_all_documents_by_user_email(email)
    return {
        "success": True,
        "files": documents,
    }

@upload_router.delete("/files/{document_id}")
async def delete_uploaded_file(document_id: str):
    """Delete an uploaded file record and associated graph entities/relationships"""
    document_manager = get_document_manager()
    result = document_manager.delete_document_by_upload_id(document_id)
    if not result:
        raise HTTPException(status_code=404, detail="File record not found or could not be deleted")
    
    return {"success": True, "message": "File record and associated data deleted"}

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