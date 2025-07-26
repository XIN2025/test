from fastapi import APIRouter, UploadFile, File, HTTPException, BackgroundTasks
from fastapi.responses import StreamingResponse
from typing import Dict, Any
import asyncio
import json
import logging
from ..services.document_processor import DocumentProcessor
from ..services.progress_tracker import ProgressTracker

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
        logger.info(f"Read {len(content)} bytes from file {file.filename}")
        
        # Start processing in background with the file content
        background_tasks.add_task(
            process_document_background,
            upload_id,
            file.filename,
            content,
            file_extension
        )
        
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
        raise HTTPException(status_code=404, detail="Upload session not found")
    
    return {
        "upload_id": upload_id,
        "progress": progress
    }

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