from fastapi import FastAPI, Body
from fastapi.middleware.cors import CORSMiddleware
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from contextlib import asynccontextmanager
from datetime import datetime, timedelta
import asyncio

from app.services.backend_services.db import get_db, get_client, close_db
from app.services.backend_services.email_utils import send_email
from app.services.backend_services.nudge_service import get_nudge_service
from app.routers.backend.auth import auth_router
from app.routers.backend.user import user_router
from app.routers.ai.chat import chat_router
from app.routers.backend.upload import upload_router
from app.routers.ai.goals import goals_router
from app.routers.ai.lab_report import lab_report_router
from app.routers.backend.preferences import preferences_router
from app.routers.backend.nudge import nudge_router
from app.routers.backend.health_alert import health_alert_router
from app.routers.backend.health_score import health_score_router
from app.exceptions import AppException, custom_exception_handler, generic_exception_handler
from motor.motor_asyncio import AsyncIOMotorClient
from .config import MONGODB_URI


def stop_scheduler(scheduler):
    scheduler.shutdown()
    print("🛑 Nudge scheduler stopped")


@asynccontextmanager
async def lifespan(app: FastAPI):
    get_db()
    nudge_service = get_nudge_service()
    await nudge_service.schedule_daily_notifications()
    nudge_service.start_scheduler()
    print("🚀 Nudge scheduler started")
    yield
    nudge_service.stop_scheduler()
    await close_db()
    print("✅ Shutdown complete")


app = FastAPI(
    title="Medical RAG API", 
    description="Medical RAG API with async support",
    version="1.0.0",
    lifespan=lifespan
)

app.add_exception_handler(AppException, custom_exception_handler)
app.add_exception_handler(Exception, generic_exception_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def add_async_headers(request, call_next):
    response = await call_next(request)
    response.headers["X-Async-Enabled"] = "true"
    return response

app.include_router(auth_router, tags=["auth"])
app.include_router(user_router, tags=["user"])
app.include_router(chat_router, tags=["chat"])
app.include_router(upload_router, tags=["upload"])
app.include_router(goals_router, tags=["goals"])
app.include_router(lab_report_router, tags=["lab-reports"])
app.include_router(preferences_router, tags=["preferences"])
app.include_router(nudge_router, prefix="/api", tags=["nudge"])
app.include_router(health_alert_router, prefix="/api/health-alert", tags=["health-alert"])
app.include_router(health_score_router, prefix="/api/health-score", tags=["health-score"])

@app.get("/")
async def root():
    try:
        db = get_db()
        client = get_client()
        
        collections = await db.list_collection_names()
        server_info = await client.server_info()
        
        return {
            "message": "Hello World", 
            "mongodb": "connected", 
            "collections_count": len(collections),
            "mongodb_version": server_info.get("version", "unknown")
        }
    except Exception as e:
        return {"message": "Hello World", "mongodb": f"connection error: {str(e)}"}

@app.post("/send-email")
def send_email_endpoint(
    to_email: str = Body(...),
    subject: str = Body(...),
    body: str = Body(...)
):
    send_email(to_email, subject, body)
    return {"message": "Email sent successfully"}