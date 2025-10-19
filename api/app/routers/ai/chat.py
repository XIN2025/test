from fastapi import APIRouter, HTTPException, Form
from fastapi.responses import StreamingResponse
import json
import logging
import asyncio
from typing import Optional

from ...services.ai_services.chat_service import get_chat_service
from ...services.ai_services.mongodb_vectorstore import get_vector_store

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
        async def event_generator():
            async for event in chat_service.chat_stream(message, user_email):
                yield f"data: {json.dumps(event)}\n\n"
        
        return StreamingResponse(
            event_generator(),
            media_type="text/event-stream",
            headers={"Cache-Control": "no-cache", "Connection": "keep-alive"}
        )
    except Exception as e:
        logger.error(f"Error in /chat/stream endpoint: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred during streaming: {str(e)}")

@chat_router.get("/vector-store-stats")
async def get_vector_store_stats():
    """
    Get statistics about the MongoDB vector store.
    """
    try:
        vector_store = get_vector_store()
        # Offload the synchronous database call to a thread
        vector_stats = await asyncio.to_thread(vector_store.get_stats)
        
        return {
            "vector_store": vector_stats
        }
    except Exception as e:
        logger.error(f"Error getting vector store stats: {e}")
        raise HTTPException(status_code=500, detail=f"Stats error: {str(e)}")

@chat_router.delete("/clear-vector-store")
async def clear_vector_store():
    """
    DANGER: Clears all data from the MongoDB vector store.
    This will delete all learned knowledge from all uploaded documents for all users.
    """
    try:
        vector_store = get_vector_store()
        # Offload the blocking `delete_many` call to a thread to keep the server responsive
        result = await asyncio.to_thread(vector_store.collection.delete_many, {})
        
        logger.warning(f"Cleared {result.deleted_count} documents from the vector store.")
        
        return {
            "success": True,
            "message": f"Vector store cleared successfully. {result.deleted_count} documents deleted."
        }
    except Exception as e:
        logger.error(f"Error clearing vector store: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Clear error: {str(e)}")
