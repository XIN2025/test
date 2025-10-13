import email
from .db import get_db
import httpx
from datetime import datetime, timedelta
from bson import ObjectId
from app.schemas.backend.nudge import Nudge, NudgeType, NudgeStatus
from app.exceptions import (
    NotificationError,
    GoalNotFoundError,
    UserNotFoundError,
    TokenNotFoundError,
    NotificationDisabledError,
)
from typing import List, Dict
import firebase_admin
from firebase_admin import credentials, messaging
import os
from app.services.backend_services.encryption_service import get_encryption_service
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.jobstores.mongodb import MongoDBJobStore
from dotenv import load_dotenv
from app.prompts import GENERATE_MORNING_NOTIFICATION_PROMPT, GENERATE_EVENING_NOTIFICATION_PROMPT
from langchain_openai import ChatOpenAI
from langchain.prompts import ChatPromptTemplate
from app.schemas.ai.goals import Goal, ActionItem, GoalWithActionItems
from app.config import OPENAI_API_KEY, LLM_MODEL, MONGODB_URI, DB_NAME, NUDGE_SCHEDULED_COLLECTION
import asyncio
load_dotenv()

async def send_fcm_notification_job(email, title, body):
    nudge_service = get_nudge_service()
    await nudge_service.send_fcm_notification(email, title, body)

def run_async_job(coro, *args, **kwargs):
    loop = asyncio.get_event_loop()
    loop.create_task(coro(*args, **kwargs))

def morning_notification_job(email):
    loop = asyncio.get_event_loop()
    nudge_service = get_nudge_service()
    loop.create_task(nudge_service.send_morning_notification(email))

def evening_notification_job(email):
    loop = asyncio.get_event_loop()
    nudge_service = get_nudge_service()
    loop.create_task(nudge_service.send_evening_notification(email))

class NudgeService:
    def __init__(self):
        self.db = get_db()
        self.users_collection = self.db["users"]
        self.goals_collection = self.db["goals"]
        self.action_items_collection = self.db["action_items"]
        self.nudges_collection = self.db["nudges"]
        self.encryption_service = get_encryption_service()
        self._initialize_firebase()

        jobstores = {
            'default': MongoDBJobStore(
                database=DB_NAME,
                collection=NUDGE_SCHEDULED_COLLECTION,
                host=MONGODB_URI
            )
        }
        jobdefaults = {'misfire_grace_time': 15 * 60}
        self.scheduler = AsyncIOScheduler(jobstores=jobstores, jobdefaults=jobdefaults)

    def start_scheduler(self):
        self.scheduler.start()
    
    def stop_scheduler(self):
        self.scheduler.shutdown()

    async def _invoke_structured_llm(
        self, schema: dict, system_prompt: str, user_prompt: str, input_vars: dict
    ) -> dict:
        llm = ChatOpenAI(
            model=LLM_MODEL,
            openai_api_key=OPENAI_API_KEY
        ).with_structured_output(schema)
        prompt = ChatPromptTemplate.from_messages(
            [("system", system_prompt), ("user", user_prompt)]
        )
        chain = prompt | llm
        return await chain.ainvoke(input_vars)

    def _initialize_firebase(self):
        if not firebase_admin._apps:
            firebase_service_account_path = os.getenv("FIREBASE_SERVICE_ACCOUNT_PATH")
            if firebase_service_account_path and os.path.exists(firebase_service_account_path):
                cred = credentials.Certificate(firebase_service_account_path)
                firebase_admin.initialize_app(cred)
            else:
                print(f"Warning: Firebase service account file not found or FIREBASE_SERVICE_ACCOUNT_PATH not set")

    async def save_fcm_token(self, email: str, fcm_token: str) -> bool:
        result = await self.users_collection.update_one(
            {"email": email},
            {"$set": {"fcm_token": fcm_token}},
            upsert=False,
        )
        return result.acknowledged

    async def send_fcm_notification(self, email: str, title: str, body: str, fcm_client=None):
        user_doc = await self.users_collection.find_one({"email": email})
        
        if not user_doc:
            raise UserNotFoundError(f"User not found: {email}")
        
        if not user_doc.get("fcm_token"):
            raise TokenNotFoundError(f"No FCM token found for user: {email}")
            
        if not user_doc.get("notifications_enabled", True):
            raise NotificationDisabledError(f"Notifications are disabled for user: {email}")

        fcm_token = user_doc["fcm_token"]

        message = messaging.Message(
            token=fcm_token,
            notification=messaging.Notification(
                title=title,
                body=body,
            ),
            data={
                "type": "nudge",
                "email": email,
            },
            android=messaging.AndroidConfig(
                priority="high",
                notification=messaging.AndroidNotification(
                    channel_id="default",
                    sound="default",
                    color="#16A34A",
                    icon="@drawable/notification_icon",
                ),
            ),
            apns=messaging.APNSConfig(
                payload=messaging.APNSPayload(
                    aps=messaging.Aps(sound="default")
                )
            ),
        )

        try:
            message_id = messaging.send(message)
            return {"success": True, "message_id": message_id}
        except Exception as e:
            raise NotificationError(
                f"Failed to send FCM notification: {str(e)}",
                details={"email": email},
            )

    async def get_goal_by_id(self, goal_id: str) -> GoalWithActionItems:
        goal = await self.goals_collection.find_one({"_id": ObjectId(goal_id)})
        if not goal:
            return None
        action_items = await self.action_items_collection.find(
            {"goal_id": goal_id}
        ).to_list(length=None)
        goal["action_items"] = [ActionItem(
            id=str(action_item["_id"]),
            goal_id=action_item["goal_id"],
            user_email=action_item["user_email"],
            title=action_item["title"],
            description=action_item["description"],
            priority=action_item["priority"],
            weekly_schedule=action_item["weekly_schedule"],
        ) for action_item in action_items]
        goal = GoalWithActionItems(
            id=str(goal["_id"]),
            user_email=goal["user_email"],
            title=goal["title"],
            description=goal["description"],
            priority=goal["priority"],
            category=goal["category"],
            created_at=goal["created_at"],
            action_items=goal["action_items"],
        )
        goal = self.encryption_service.decrypt_document(goal, GoalWithActionItems)
        return goal
    
    async def _create_reminder_nudges(self, goal_id: str) -> List[Nudge]:
        BUFFER_MINUTES = 10
        goal = await self.get_goal_by_id(goal_id)
        if not goal:
            raise GoalNotFoundError(f"Goal not found: {goal_id}")

        nudges = []
        for action_item in goal.action_items:
            for day, daily_schedule in action_item.weekly_schedule.model_dump().items():
                if not daily_schedule:
                    continue
                date = daily_schedule.get("date")
                start_time = daily_schedule.get("start_time")
                reminder_time = datetime.fromisoformat(f"{date.split('T')[0]}T{start_time}") - timedelta(minutes=BUFFER_MINUTES)
                nudge = Nudge(
                    goal_id=goal_id,
                    user_email=goal.user_email,
                    action_item_title=action_item.title,
                    type=NudgeType.REMINDER,
                    scheduled_time=reminder_time,
                    title=f"Reminder: {action_item.title}",
                    body=f"You have '{action_item.title}' scheduled in {BUFFER_MINUTES} minutes for your goal: {goal.title}",
                    status=NudgeStatus.PENDING
                )
                nudges.append(nudge)

        return nudges

    async def create_nudges_from_goal(self, goal_id: str) -> List[Nudge]:
        nudges = await self._create_reminder_nudges(goal_id)
        for nudge in nudges:
            self.schedule_notification(
                email=nudge.user_email,
                title=nudge.title,
                body=nudge.body,
                run_datetime=nudge.scheduled_time
            )
        return nudges

    def schedule_notification(self, email: str, title: str, body: str, run_datetime: datetime):
        job_id = f"nudge_{email}_{run_datetime.isoformat()}"
        self.scheduler.add_job(
            send_fcm_notification_job,
            trigger='date',
            run_date=run_datetime,
            args=[email, title, body],
            id=job_id,
            replace_existing=True,
            coalesce=True,
        )
        print(f"Scheduled notification for {email} at {run_datetime}")
    
    async def get_goals_summary(self, user_email: str) -> str:
        goals = await self.goals_collection.find({"user_email": user_email}).to_list(None)
        goals = [self.encryption_service.decrypt_document(item, Goal) for item in goals]
        if not goals:
            return "No goals found for this user."

        summary_lines = []
        for goal in goals:
            title = goal.get("title", "Untitled Goal")
            description = goal.get("description", "")
            status = "Completed" if goal.get("completed", False) else "In Progress"
            summary_lines.append(f"- {title}: {description} [{status}]")

        summary = "\n".join(summary_lines)
        return summary

    async def send_morning_notification(self, email: str):
        # TODO: Currently we don't have a system to store chat history of the user
        chat_summaries = "..."
        plan_history = await self.get_goals_summary(email)
        recent_notifications = self.get_recent_notification_jobs(email=email, limit=10)

        input_vars = {
            "chat_summaries": chat_summaries,
            "plan_history": plan_history,
            "recent_notifications": recent_notifications
        }

        schema = {
            "title": "GenerateMorningNotification",
            "description": "Generate a personalized morning notification for the user.",
            "type": "object",
            "properties": {
                "notification": {"type": "string"}
            },
            "required": ["notification"]
        }

        system_prompt = "You are a health assistant that sends personalized morning notifications to users."
        user_prompt = GENERATE_MORNING_NOTIFICATION_PROMPT

        llm_result = await self._invoke_structured_llm(
            schema=schema,
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            input_vars=input_vars
        )
        title = "Good Morning!"
        body = llm_result.get("notification", "Start your day with positivity!")
        await self.send_fcm_notification(email, title, body)

    async def send_evening_notification(self, email: str):
        # TODO: Currently we don't have a system to store chat history of the user
        chat_summaries = "..."
        plan_history = await self.get_goals_summary(email)
        recent_notifications = self.get_recent_notification_jobs(email=email, limit=10)

        input_vars = {
            "chat_summaries": chat_summaries,
            "plan_history": plan_history,
            "recent_notifications": recent_notifications
        }

        schema = {
            "title": "GenerateEveningNotification",
            "description": "Generate a personalized evening notification for the user.",
            "type": "object",
            "properties": {
                "notification": {"type": "string"}
            },
            "required": ["notification"]
        }

        system_prompt = "You are a health assistant that sends personalized evening notifications to users."
        user_prompt = GENERATE_EVENING_NOTIFICATION_PROMPT

        llm_result = await self._invoke_structured_llm(
            schema=schema,
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            input_vars=input_vars
        )
        title = "Good Evening!"
        body = llm_result.get("notification", "Reflect on your progress today!")
        await self.send_fcm_notification(email, title, body)

    # TODO: Maybe this can be integrated using just notification property and we don't need daily_notification
    async def schedule_daily_notifications(self):
        print("Scheduling daily notifications for users...")
        users = await self.users_collection.find({"notifications_enabled": True}).to_list(length=None)
        for user in users:
            if ("daily_notifications" in user) and not user.get("daily_notifications"):
                continue
            email = user["email"]
            self.scheduler.add_job(
                morning_notification_job,
                trigger='cron',
                hour=8,
                minute=0,
                args=[email],
                id=f"morning_{email}",
                replace_existing=True,
                coalesce=True,
            )
            self.scheduler.add_job(
                evening_notification_job,
                trigger='cron',
                hour=20,
                minute=0,
                args=[email],
                id=f"evening_{email}",
                replace_existing=True,
                coalesce=True,
            )
            await self.users_collection.update_one({"email": email}, {"$set": {"daily_notifications": True}})
            print(f"Scheduled daily notifications for {email}")
        print("Daily notifications scheduled for users.")
        

    def get_recent_notification_jobs(self, email: str, limit: int = 10) -> List[Dict]:
        jobs = self.scheduler.get_jobs()
        user_jobs = [
            job for job in jobs
            if job.args and len(job.args) > 0 and job.args[0] == email
        ]
        user_jobs.sort(key=lambda job: job.next_run_time or datetime.min, reverse=True)
        return [
            {
                "id": job.id,
                "next_run_time": job.next_run_time,
                "func": str(job.func),
                "args": job.args,
                "kwargs": job.kwargs,
            }
            for job in user_jobs[:limit]
        ]


_nudge_service_instance = None

def get_nudge_service():
    global _nudge_service_instance
    if _nudge_service_instance is None:
        _nudge_service_instance = NudgeService()
    return _nudge_service_instance