from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from fastapi.responses import StreamingResponse
import json
import logging
from typing import Optional

from ...services.ai_services.chat_service import get_chat_service
from ...services.miscellaneous.graph_db import get_graph_db
from ...services.ai_services.mongodb_vectorstore import get_vector_store
from ...config import ALLOWED_EXTENSIONS, MAX_FILE_SIZE

logger = logging.getLogger(__name__)

chat_router = APIRouter(prefix="/chat", tags=["chat"])

@chat_router.post("/send")
async def send_message(message: str = Form(...), user_email: str = Form(...)):
    """
    Send a chat message and get a context-aware response from the RAG system.
    """
    try:
        chat_service = get_chat_service()
        result = await chat_service.chat(message, user_email)
        
        if not result.get("success", False):
             raise HTTPException(status_code=500, detail=result.get("error", "Chat processing failed."))

        return {
            "success": result["success"],
            "response": result["response"],
            "follow_up_questions": result.get("follow_up_questions", []),
            "context_used": result.get("context_used", 0)
        }
    except Exception as e:
        logger.error(f"Error in /chat/send endpoint: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred in the chat endpoint: {str(e)}")

@chat_router.post("/stream")
async def stream_chat(message: str = Form(...), user_email: str = Form(...)):
    """
    Stream a chat response in real-time using Server-Sent Events (SSE).
    """
    try:
        chat_service = get_chat_service()
        
        async def generate():
            async for chunk in chat_service.chat_stream(message, user_email):
                yield f"data: {json.dumps(chunk)}\n\n"
        
        return StreamingResponse(
            generate(),
            media_type="text/event-stream",
            headers={"Cache-Control": "no-cache", "Connection": "keep-alive"}
        )
    except Exception as e:
        logger.error(f"Error in /chat/stream endpoint: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred during streaming: {str(e)}")

@chat_router.get("/graph-stats")
async def get_graph_stats():
    """Get statistics about the graph database and the unified vector store"""
    try:
        graph_db = get_graph_db()
        vector_store = get_vector_store()
        
        nodes, relationships = graph_db.get_graph_data()
        vector_stats = vector_store.get_stats()
        
        return {
            "graph_database": {
                "nodes_count": len(nodes),
                "relationships_count": len(relationships),
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

@chat_router.delete("/clear-all-knowledge")
async def clear_all_knowledge():
    """
    DANGER: Clear all data from the Neo4j graph AND the MongoDB vector store.
    This will delete all learned knowledge from uploaded documents.
    """
    try:
        # Clear Neo4j
        graph_db = get_graph_db()
        graph_db.clear_database()
        
        # Clear MongoDB Vector Store
        vector_store = get_vector_store()
        vector_store.collection.delete_many({})
        
        logger.warning("Cleared all data from graph database and vector store.")
        
        return {
            "success": True,
            "message": "Graph database and vector store cleared successfully."
        }
    except Exception as e:
        logger.error(f"Error clearing knowledge bases: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Clear error: {str(e)}")
