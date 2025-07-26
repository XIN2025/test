from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from fastapi.responses import StreamingResponse
from typing import List, Optional
import json
import logging
from ..services.chat_service import get_chat_service
from ..services.document_processor import get_document_processor
from ..services.graph_db import get_graph_db
from ..services.vector_store import get_vector_store
from ..config import ALLOWED_EXTENSIONS, MAX_FILE_SIZE

logger = logging.getLogger(__name__)

chat_router = APIRouter(prefix="/chat", tags=["chat"])

@chat_router.post("/send")
async def send_message(message: str = Form(...)):
    """Send a chat message and get response with follow-up questions"""
    try:
        chat_service = get_chat_service()
        result = await chat_service.chat(message)
        
        return {
            "success": result["success"],
            "response": result["response"],
            "follow_up_questions": result.get("follow_up_questions", []),
            "context_used": result.get("context_used", 0)
        }
    except Exception as e:
        logger.error(f"Error in chat endpoint: {e}")
        raise HTTPException(status_code=500, detail=f"Chat error: {str(e)}")

@chat_router.post("/stream")
async def stream_chat(message: str = Form(...)):
    """Stream chat response in real-time"""
    try:
        chat_service = get_chat_service()
        
        async def generate():
            async for chunk in chat_service.chat_stream(message):
                yield f"data: {json.dumps(chunk)}\n\n"
        
        return StreamingResponse(
            generate(),
            media_type="text/plain",
            headers={"Cache-Control": "no-cache", "Connection": "keep-alive"}
        )
    except Exception as e:
        logger.error(f"Error in streaming chat: {e}")
        raise HTTPException(status_code=500, detail=f"Streaming chat error: {str(e)}")

@chat_router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    description: Optional[str] = Form(None)
):
    """Upload and process a document (text or PDF)"""
    try:
        # Validate file type
        file_extension = "." + file.filename.split(".")[-1].lower()
        if file_extension not in ALLOWED_EXTENSIONS:
            raise HTTPException(
                status_code=400, 
                detail=f"File type not allowed. Allowed types: {', '.join(ALLOWED_EXTENSIONS)}"
            )
        
        # Validate file size
        file_content = await file.read()
        if len(file_content) > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=400,
                detail=f"File too large. Maximum size: {MAX_FILE_SIZE} bytes"
            )
        
        # Process the document
        document_processor = get_document_processor()
        
        if file_extension == ".pdf":
            result = document_processor.process_pdf_file(file_content, file.filename)
        else:  # .txt
            text_content = file_content.decode('utf-8')
            result = document_processor.process_text_file(text_content, file.filename)
        
        if result["success"]:
            return {
                "success": True,
                "message": f"Document '{file.filename}' processed successfully",
                "entities_count": result["entities_count"],
                "relationships_count": result["relationships_count"],
                "entities": result.get("entities", []),
                "relationships": result.get("relationships", [])
            }
        else:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to process document: {result.get('error', 'Unknown error')}"
            )
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error uploading document: {e}")
        raise HTTPException(status_code=500, detail=f"Upload error: {str(e)}")

@chat_router.get("/graph-stats")
async def get_graph_stats():
    """Get statistics about the graph database and vector store"""
    try:
        graph_db = get_graph_db()
        vector_store = get_vector_store()
        
        # Get graph data
        nodes, relationships = graph_db.get_graph_data()
        
        # Get vector store stats
        vector_stats = vector_store.get_stats()
        
        return {
            "graph": {
                "nodes_count": len(nodes),
                "relationships_count": len(relationships),
                "node_types": list(set(node["type"] for node in nodes))
            },
            "vector_store": vector_stats
        }
    except Exception as e:
        logger.error(f"Error getting graph stats: {e}")
        raise HTTPException(status_code=500, detail=f"Stats error: {str(e)}")

@chat_router.get("/graph-data")
async def get_graph_data():
    """Get all graph data (nodes and relationships)"""
    try:
        graph_db = get_graph_db()
        nodes, relationships = graph_db.get_graph_data()
        
        return {
            "nodes": nodes,
            "relationships": relationships
        }
    except Exception as e:
        logger.error(f"Error getting graph data: {e}")
        raise HTTPException(status_code=500, detail=f"Graph data error: {str(e)}")

@chat_router.delete("/clear-graph")
async def clear_graph():
    """Clear all data from the graph database and vector store"""
    try:
        graph_db = get_graph_db()
        vector_store = get_vector_store()
        
        # Clear graph database
        graph_db.clear_database()
        
        # Clear vector store
        vector_store._create_new_index()
        vector_store.save_index()
        
        return {
            "success": True,
            "message": "Graph database and vector store cleared successfully"
        }
    except Exception as e:
        logger.error(f"Error clearing graph: {e}")
        raise HTTPException(status_code=500, detail=f"Clear error: {str(e)}")

@chat_router.post("/sync-vector-store")
async def sync_vector_store():
    """Sync the vector store with the graph database"""
    try:
        graph_db = get_graph_db()
        vector_store = get_vector_store()
        
        vector_store.sync_from_graph(graph_db)
        
        return {
            "success": True,
            "message": "Vector store synced with graph database successfully"
        }
    except Exception as e:
        logger.error(f"Error syncing vector store: {e}")
        raise HTTPException(status_code=500, detail=f"Sync error: {str(e)}") 