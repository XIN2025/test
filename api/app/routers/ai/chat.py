from fastapi import APIRouter, HTTPException, Form, WebSocket, WebSocketDisconnect
from fastapi.responses import StreamingResponse
import json
import logging
import asyncio
import base64
from typing import Optional

from app.services.ai_services.chat_service import get_chat_service
from app.services.ai_services.mongodb_vectorstore import get_vector_store
from app.services.ai_services.transcription_service import get_transcription_service

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

@chat_router.websocket("/transcribe-stream")
async def transcribe_stream(websocket: WebSocket):
    """
    WebSocket endpoint for real-time audio transcription using Deepgram.
    
    Expected message format from client:
    - {"type": "audio", "data": "base64_encoded_audio_chunk"}
    - {"type": "stop"}
    
    Response format to client:
    - {"is_final": false, "text": "interim transcription"}
    - {"is_final": true, "text": "final transcription"}
    """
    try:
        await websocket.accept()
        print("🎤 [TRANSCRIBE] WebSocket connection accepted for transcription")
        logger.info("🎤 WebSocket connection accepted for transcription")
    except Exception as e:
        print(f"❌ [TRANSCRIBE] Failed to accept WebSocket: {e}")
        logger.error(f"❌ Failed to accept WebSocket: {e}", exc_info=True)
        return
    
    transcription_service = None
    
    try:
        print("🔧 [TRANSCRIBE] Creating transcription service instance...")
        logger.info("🔧 Creating transcription service instance...")
        transcription_service = get_transcription_service()
        print("✅ [TRANSCRIBE] Transcription service instance created")
        logger.info("✅ Transcription service instance created")
        
        # Callback for handling Deepgram transcription results
        async def on_message(is_final: bool, text: str):
            try:
                # Send transcription to frontend
                await websocket.send_json({
                    "is_final": is_final,
                    "text": text
                })
                
                logger.info(f"📝 Transcription ({'final' if is_final else 'interim'}): {text[:50]}...")
                    
            except Exception as e:
                logger.error(f"❌ Error processing Deepgram message: {e}", exc_info=True)
        
        # Callback for handling Deepgram errors
        async def on_error(error: str):
            logger.error(f"❌ Deepgram error: {error}")
            try:
                await websocket.send_json({
                    "error": str(error),
                    "is_final": False,
                    "text": ""
                })
            except:
                pass
        
        # Create Deepgram connection
        print("🔌 [TRANSCRIBE] Attempting to create Deepgram connection...")
        logger.info("🔌 Attempting to create Deepgram connection...")
        connection_success = await transcription_service.create_connection(
            on_message_callback=on_message,
            on_error_callback=on_error
        )
        
        if not connection_success:
            print("❌ [TRANSCRIBE] Failed to establish Deepgram connection")
            logger.error("❌ Failed to establish Deepgram connection")
            await websocket.send_json({
                "error": "Failed to connect to transcription service",
                "is_final": False,
                "text": ""
            })
            await websocket.close()
            return
        
        print("✅ [TRANSCRIBE] Transcription service ready, waiting for audio chunks from frontend...")
        logger.info("✅ Transcription service ready, waiting for audio chunks from frontend...")
        
        # Listen for audio data from frontend
        audio_chunks_received = 0
        while True:
            try:
                # Receive message from frontend
                message = await websocket.receive_json()
                print(f"📥 [TRANSCRIBE] Received message from frontend: type={message.get('type')}")
                logger.info(f"📥 Received message from frontend: type={message.get('type')}")
                
                if message.get("type") == "stop":
                    print(f"🛑 [TRANSCRIBE] Stop signal received after {audio_chunks_received} audio chunks")
                    logger.info(f"🛑 Stop signal received after {audio_chunks_received} audio chunks")
                    
                    # Wait a bit for any final transcriptions from Deepgram
                    print("⏳ [TRANSCRIBE] Waiting 2 seconds for final transcription from Deepgram...")
                    await asyncio.sleep(2)
                    print("✅ [TRANSCRIBE] Done waiting, closing connection")
                    break
                
                if message.get("type") == "audio":
                    # Decode base64 audio data
                    audio_base64 = message.get("data", "")
                    print(f"🔍 [TRANSCRIBE] Audio data length: {len(audio_base64) if audio_base64 else 0}")
                    
                    if audio_base64:
                        audio_chunks_received += 1
                        # Decode base64 to bytes
                        audio_bytes = base64.b64decode(audio_base64)
                        print(f"🎵 [TRANSCRIBE] Audio chunk {audio_chunks_received}: {len(audio_bytes)} bytes decoded, sending to Deepgram...")
                        logger.info(f"🎵 Audio chunk {audio_chunks_received}: {len(audio_bytes)} bytes decoded, sending to Deepgram...")
                        
                        # Send audio to Deepgram
                        await transcription_service.send_audio(audio_bytes)
                        print(f"✅ [TRANSCRIBE] Audio chunk {audio_chunks_received} sent to Deepgram")
                    else:
                        print("⚠️ [TRANSCRIBE] Received empty audio data")
                        logger.warning("⚠️ Received empty audio data")
                        
            except WebSocketDisconnect:
                logger.info(f"🔌 WebSocket disconnected by client after {audio_chunks_received} chunks")
                break
            except Exception as e:
                logger.error(f"❌ Error receiving/processing audio: {e}", exc_info=True)
                break
    
    except Exception as e:
        logger.error(f"❌ WebSocket error: {e}", exc_info=True)
        try:
            await websocket.send_json({
                "error": str(e),
                "is_final": False,
                "text": ""
            })
        except:
            pass
    
    finally:
        # Clean up
        if transcription_service:
            await transcription_service.close_connection()
        
        try:
            await websocket.close()
        except:
            pass
        
        logger.info("✅ Transcription WebSocket closed")
