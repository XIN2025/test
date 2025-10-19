from fastapi import APIRouter, UploadFile, File, HTTPException, Query
from fastapi.responses import StreamingResponse
from pydantic import EmailStr
import json
import logging
from urllib.parse import unquote
import asyncio

from ...services.backend_services.progress_tracker import get_progress_tracker
from ...services.backend_services.document_manager import get_document_manager
from ...config import MAX_FILE_SIZE
from app.schemas.backend.documents import DocumentType

logger = logging.getLogger(__name__)
upload_router = APIRouter(prefix="/upload", tags=["upload"])

progress_tracker = get_progress_tracker()

@upload_router.post("/document")
async def upload_document(
    file: UploadFile = File(...),
    email: str = Query(..., description="User email for document ownership")
):
    """
    Upload and process a document (PDF, DOCX) with asynchronous processing.
    Creates an upload session and returns an ID to track progress.
    """
    filename = unquote(file.filename) if file.filename else "untitled"
    logger.info(f"Received upload request for file: {filename}")

    if not file.filename:
        logger.error("No filename provided")
        raise HTTPException(status_code=400, detail="No file provided")
    
    allowed_extensions = ['.pdf', '.docx', '.doc']
    file_extension = '.' + (filename.lower().split('.')[-1] if '.' in filename else '')
    
    if file_extension not in allowed_extensions:
        raise HTTPException(
            status_code=400, 
            detail=f"Unsupported file type. Allowed types: {', '.join(allowed_extensions)}"
        )
    
    upload_id = progress_tracker.create_upload_session(filename)
    
    try:
        content = await file.read()
        if len(content) > MAX_FILE_SIZE:
            logger.error(f"File too large: {len(content)} bytes")
            progress_tracker.update_progress(upload_id, 0, "File too large", "failed")
            raise HTTPException(status_code=400, detail=f"File too large. Maximum size: {MAX_FILE_SIZE // (1024*1024)}MB")
        
        logger.info(f"Read {len(content)} bytes from file {filename}")
        
        document_manager = get_document_manager()
        # The document manager will process the file asynchronously.
        document_manager.add_document(
            upload_id=upload_id,
            content=content,
            filename=filename,
            user_email=email,
            type=DocumentType.DOCUMENT
        )
        
        return {
            "success": True,
            "upload_id": upload_id,
            "message": "Document upload started. Track progress using the upload_id.",
            "filename": filename
        }
        
    except Exception as e:
        logger.error(f"Error starting document upload: {e}", exc_info=True)
        progress_tracker.update_progress(upload_id, 0, f"Error: {str(e)}", "failed")
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

@upload_router.get("/progress/{upload_id}")
async def get_upload_progress(upload_id: str):
    """Get the progress of a document upload session."""
    progress = progress_tracker.get_progress(upload_id)
    if not progress:
        raise HTTPException(status_code=404, detail="Upload session not found.")
    return {"upload_id": upload_id, "progress": progress}

@upload_router.get("/progress/{upload_id}/stream")
async def stream_upload_progress(upload_id: str):
    """Stream real-time progress updates for a document upload."""
    
    async def progress_stream():
        while True:
            progress = progress_tracker.get_progress(upload_id)
            if not progress:
                yield f"data: {json.dumps({'error': 'Upload session not found'})}\n\n"
                break
            
            yield f"data: {json.dumps(progress)}\n\n"
            
            if progress.get('status') in ['completed', 'failed']:
                break
            
            await asyncio.sleep(1)
    
    return StreamingResponse(
        progress_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive"}
    )

@upload_router.get("/files")
async def list_uploaded_files(email: EmailStr = Query(..., description="User email to filter files")):
    """List all unique uploaded files from the vector store for a specific user."""
    document_manager = get_document_manager()
    # Offload the synchronous database call
    documents = await asyncio.to_thread(document_manager.get_all_documents_by_user_email, email)
    return {
        "success": True,
        "files": documents,
    }

@upload_router.delete("/files/{upload_id}")
async def delete_uploaded_file(upload_id: str):
    """Delete an uploaded file and its associated chunks from the vector store."""
    document_manager = get_document_manager()
    # Offload the synchronous database call
    success = await asyncio.to_thread(document_manager.delete_document_by_upload_id, upload_id)
    if not success:
        raise HTTPException(status_code=404, detail="File with given upload_id not found or could not be deleted.")
    
    return {"success": True, "message": "File record and associated data deleted."}
