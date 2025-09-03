from fastapi import FastAPI, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import asyncio
from .services.backend_services.db import get_db, close_db
from .services.miscellaneous.vector_store import get_vector_store
from .services.backend_services.document_manager import get_document_manager
from .routers.backend.auth import auth_router
from .routers.backend.user import user_router
from .routers.ai.chat import chat_router
from .routers.backend.upload import upload_router
from .routers.ai.goals import goals_router
from .routers.backend.preferences import preferences_router
from .services.backend_services.email_utils import send_email




app = FastAPI(
    title="Medical RAG API", 
    description="Medical RAG API with async support",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add async middleware for better concurrency
@app.middleware("http")
async def add_async_headers(request, call_next):
    response = await call_next(request)
    response.headers["X-Async-Enabled"] = "true"
    return response

app.include_router(auth_router)
app.include_router(user_router)
app.include_router(chat_router)
app.include_router(upload_router)
app.include_router(goals_router)
app.include_router(preferences_router)

@app.get("/")
async def root():
    db = get_db()
    try:
        server_info = db.client.server_info()
        return {"message": "Hello World", "mongodb": "connected", "version": server_info.get("version", "unknown")}
    except Exception as e:
        return {"message": "Hello World", "mongodb": f"connection error: {str(e)}"}

@app.post("/send-email")
def send_email_endpoint(
    to_email: str = Body(...),
    subject: str = Body(...),
    body: str = Body(...)
):
    try:
        send_email(to_email, subject, body)
        return {"message": "Email sent successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send email: {str(e)}")
