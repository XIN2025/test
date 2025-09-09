from fastapi import FastAPI, Body
from fastapi.middleware.cors import CORSMiddleware
from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from contextlib import asynccontextmanager
from datetime import datetime, timedelta
import asyncio

from app.services.backend_services.db import get_db, get_client, close_db
from app.services.backend_services.email_utils import send_email
from app.services.backend_services.nudge_service import NudgeService
from app.routers.backend.auth import auth_router
from app.routers.backend.user import user_router
from app.routers.ai.chat import chat_router
from app.routers.backend.upload import upload_router
from app.routers.ai.goals import goals_router
from app.routers.backend.preferences import preferences_router
from app.routers.backend.nudge import nudge_router
from app.exceptions import AppException, custom_exception_handler, generic_exception_handler


async def check_and_send_nudges():
    db = get_db()
    nudges_collection = db["nudges"]
    nudge_service = NudgeService()

    now = datetime.utcnow()
    ten_minutes_later = now + timedelta(minutes=10)

    pending_nudges = await nudges_collection.find({
        "status": "pending",
        "scheduled_time": {
            "$gte": now,
            "$lt": ten_minutes_later
        }
    }).to_list(length=None)

    print(f"🔍 Found {len(pending_nudges)} nudges at {now}")

    async def process_nudge(nudge):
        try:
            await nudge_service.send_fcm_notification(
                email=nudge.get("user_email"),
                title=nudge.get("title", f"Reminder: {nudge.get('action_item_title', '')}"),
                body=nudge.get("body", "You have a scheduled action coming up.")
            )

            await nudges_collection.update_one(
                {"_id": nudge["_id"]},
                {"$set": {"status": "sent", "sent_at": datetime.utcnow()}}
            )
            print(f"✅ Sent nudge: {nudge.get('title')} to {nudge.get('user_email')}")

        except Exception as e:
            await nudges_collection.update_one(
                {"_id": nudge["_id"]},
                {"$set": {"status": "failed", "error": str(e), "failed_at": datetime.utcnow()}}
            )
            print(f"❌ Failed to send nudge to {nudge.get('user_email')}: {e}")

    tasks = [asyncio.create_task(process_nudge(n)) for n in pending_nudges]
    if tasks:
        await asyncio.gather(*tasks)


def nudge_job_wrapper():
    try:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            loop.run_until_complete(check_and_send_nudges())
        finally:
            loop.close()
    except Exception as e:
        print(f"❌ Error in nudge job: {e}")


def start_scheduler():
    scheduler = BackgroundScheduler()
    scheduler.add_job(nudge_job_wrapper, CronTrigger(minute="*/1"))  
    scheduler.start()
    print("✅ Nudge scheduler started")
    return scheduler


def stop_scheduler(scheduler):
    scheduler.shutdown()
    print("🛑 Nudge scheduler stopped")


@asynccontextmanager
async def lifespan(app: FastAPI):
    get_db()
    print("🚀 Starting Medical RAG API with Async Nudge Scheduler...")
    scheduler = start_scheduler()

    yield

    stop_scheduler(scheduler)
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
app.include_router(preferences_router, tags=["preferences"])
app.include_router(nudge_router, prefix="/api", tags=["nudge"])


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