import asyncio
import logging
import json
from typing import Optional, Callable
import websockets
from app.config import DEEPGRAM_API_KEY

logger = logging.getLogger(__name__)

class TranscriptionService:
    def __init__(self):
        logger.info(f"🔧 Initializing TranscriptionService, API key present: {bool(DEEPGRAM_API_KEY)}")
        if not DEEPGRAM_API_KEY:
            logger.error("❌ DEEPGRAM_API_KEY not found in environment variables!")
            raise ValueError("DEEPGRAM_API_KEY not found in environment variables. Please add it to your .env file.")
        
        self.api_key = DEEPGRAM_API_KEY
        self.websocket = None
        self.receive_task = None
        logger.info("✅ TranscriptionService initialized successfully")
        
    async def create_connection(self, on_message_callback: Callable, on_error_callback: Callable):
        """Create a direct WebSocket connection to Deepgram API"""
        try:
            params = [
                "model=nova-2",
                "language=en-US",
                "punctuate=true",
                "interim_results=true",
                "smart_format=true",
                "encoding=linear16",  # Raw PCM audio - TRUE streaming format
                "sample_rate=16000",
                "channels=1",
            ]
            
            print(f"🔗 [DEEPGRAM] Connecting to: {params}")
            
            url = f"wss://api.deepgram.com/v1/listen?{'&'.join(params)}"
            
            self.websocket = await websockets.connect(
                url,
                additional_headers={"Authorization": f"Token {self.api_key}"},
                ping_interval=5,
                ping_timeout=10
            )
            
            logger.info("✅ Deepgram WebSocket connection established")
            
            self.receive_task = asyncio.create_task(
                self._receive_messages(on_message_callback, on_error_callback)
            )
            
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to create Deepgram connection: {e}", exc_info=True)
            return False
    
    async def _receive_messages(self, on_message_callback: Callable, on_error_callback: Callable):
        """Receive and process messages from Deepgram"""
        try:
            print("👂 [DEEPGRAM] Started listening for messages from Deepgram...")
            async for message in self.websocket:
                try:
                    data = json.loads(message)
                    print(f"📨 [DEEPGRAM] Raw message: {json.dumps(data)[:200]}")
                    
                    if "channel" in data and data["channel"]["alternatives"]:
                        transcript = data["channel"]["alternatives"][0]["transcript"]
                        confidence = data["channel"]["alternatives"][0].get("confidence", 0.0)
                        is_final = data.get("is_final", False)
                        speech_final = data.get("speech_final", False)
                        
                        if transcript:
                            print(f"✅ [DEEPGRAM] Got transcript ({'final' if is_final else 'interim'}, conf={confidence:.2f}): '{transcript}'")
                            await on_message_callback(is_final, transcript)
                        else:
                            print(f"🔇 [DEEPGRAM] Empty transcript (silence, final={is_final}, speech_final={speech_final})")
                    elif "error" in data:
                        print(f"❌ [DEEPGRAM] Error from Deepgram: {data['error']}")
                        await on_error_callback(data["error"])
                    else:
                        print(f"ℹ️ [DEEPGRAM] Metadata message: {list(data.keys())}")
                        
                except Exception as e:
                    print(f"❌ [DEEPGRAM] Error processing message: {e}")
                    
        except websockets.exceptions.ConnectionClosed as e:
            print(f"🔌 [DEEPGRAM] Deepgram connection closed: {e.code} {e.reason}")
            if e.code != 1000:  # 1000 is normal closure
                await on_error_callback(f"Deepgram closed unexpectedly: {e.code} {e.reason}")
        except Exception as e:
            print(f"❌ [DEEPGRAM] Exception in receive loop: {e}")
            await on_error_callback(str(e))
    
    async def send_audio(self, audio_data: bytes):
        """Send audio data to Deepgram for transcription"""
        try:
            if self.websocket:
                print(f"📡 [DEEPGRAM] Sending {len(audio_data)} bytes to Deepgram...")
                await self.websocket.send(audio_data)
                print(f"✅ [DEEPGRAM] Sent successfully")
            else:
                print("⚠️ [DEEPGRAM] No websocket connection, skipping audio chunk")
        except websockets.exceptions.ConnectionClosed as e:
            print(f"⚠️ [DEEPGRAM] Deepgram connection closed while sending: {e}")
            self.websocket = None
        except Exception as e:
            print(f"❌ [DEEPGRAM] Error sending audio: {e}")
    
    async def finalize_stream(self):
        """Send finalize message to Deepgram to signal end of audio"""
        try:
            if self.websocket:
                print("📤 [DEEPGRAM] Sending finalize message (empty byte string)...")
                await self.websocket.send(b'')
        except Exception:
            pass

    async def close_connection(self):
        """Close the Deepgram connection"""
        try:
            await self.finalize_stream()
            await asyncio.sleep(0.5)
            
            if self.receive_task and not self.receive_task.done():
                self.receive_task.cancel()
                try: 
                    await self.receive_task
                except asyncio.CancelledError: 
                    pass
            
            if self.websocket:
                await self.websocket.close()
                logger.info("✅ Deepgram connection closed")
                
        except Exception:
            pass
        finally:
            self.websocket = None
            self.receive_task = None

def get_transcription_service() -> TranscriptionService:
    return TranscriptionService()
