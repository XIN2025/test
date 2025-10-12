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
from app.schemas.ai.goals import Goal
from app.config import OPENAI_API_KEY, LLM_MODEL, MONGODB_URI, DB_NAME, NUDGE_SCHEDULED_COLLECTION
load_dotenv()

class NudgeService:
    def __init__(self):
        self.db = get_db()
        self.users_collection = self.db["users"]
        self.goals_collection = self.db["goals"]
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

    async def create_nudges_from_goal(self, goal_id: str) -> List[Nudge]:
        if isinstance(goal_id, str):
            goal_object_id = ObjectId(goal_id)
        else:
            goal_object_id = goal_id
            
        goal_doc_raw = await self.goals_collection.find_one(
            {"_id": goal_object_id}
        )
        
        if not goal_doc_raw:
            raise GoalNotFoundError(f"Goal not found: {goal_id}")
        
        user_email = goal_doc_raw.get("user_email", "")
        goal_title = goal_doc_raw.get("title", "")
        
        action_plan = goal_doc_raw.get("action_plan", {})
        action_items = action_plan.get("action_items", [])
        
        weekly_schedule = goal_doc_raw.get("weekly_schedule", {})
        daily_schedules = weekly_schedule.get("daily_schedules", {})
        
        if not action_items or not daily_schedules:
            return []
        
        created_nudges = []
        
        for day_name, day_schedule in daily_schedules.items():
            if not day_schedule or not isinstance(day_schedule, dict):
                continue
            
            date_str = day_schedule.get("date", "")
            time_slots = day_schedule.get("time_slots", [])
            
            for time_slot in time_slots:
                action_item_title = time_slot.get("action_item", "")
                start_time = time_slot.get("start_time", "")
                
                if not action_item_title or not start_time or not date_str:
                    continue
                
                if "T" in date_str:
                    date_part = date_str.split("T")[0]
                else:
                    date_part = date_str
                
                full_datetime_str = f"{date_part}T{start_time}"
                
                scheduled_time = datetime.fromisoformat(full_datetime_str)
                reminder_time = scheduled_time - timedelta(minutes=10)
                
                nudge = Nudge(
                    goal_id=str(goal_object_id),
                    user_email=user_email,
                    action_item_title=action_item_title,
                    type=NudgeType.REMINDER,
                    scheduled_time=reminder_time,
                    title=f"Reminder: {action_item_title}",
                    body=f"You have '{action_item_title}' scheduled in 10 minutes for your goal: {goal_title}",
                    status=NudgeStatus.PENDING
                )
                
                nudge_dict = nudge.model_dump(exclude={'id'})
                nudge_dict["created_at"] = datetime.utcnow()
                
                result = await self.nudges_collection.insert_one(
                    nudge_dict
                )
                
                nudge_data = nudge.model_dump()
                nudge_data["id"] = str(result.inserted_id)
                nudge_data["created_at"] = nudge_dict["created_at"]
                
                final_nudge = Nudge(**nudge_data)
                nudge_data = self.encryption_service.encrypt_document(nudge_data, Nudge)
                
                created_nudges.append(final_nudge)

                self.schedule_notification(
                    email=user_email,
                    title=f"Reminder: {action_item_title}",
                    body=f"You have '{action_item_title}' scheduled in 10 minutes for your goal: {goal_title}",
                    run_datetime=reminder_time
                )
    
        return created_nudges

    def schedule_notification(self, email: str, title: str, body: str, run_datetime: datetime):
        job_id = f"nudge_{email}_{run_datetime.isoformat()}"
        self.scheduler.add_job(
            self.send_fcm_notification,
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

    def schedule_daily_notifications(self):
        users = self.users_collection.find({"notifications_enabled": True})
        for user in users:
            email = user["email"]
            morning_time = datetime.now().replace(hour=8, minute=0, second=0, microsecond=0)
            if morning_time < datetime.now():
                morning_time += timedelta(days=1)
            self.scheduler.add_job(
                self.send_morning_notification,
                trigger='cron',
                hour=8,
                minute=0,
                args=[email],
                id=f"morning_{email}",
                replace_existing=True,
                coalesce=True,
            )
            evening_time = datetime.now().replace(hour=20, minute=0, second=0, microsecond=0)
            if evening_time < datetime.now():
                evening_time += timedelta(days=1)
            self.scheduler.add_job(
                self.send_evening_notification,
                trigger='cron',
                hour=20,
                minute=0,
                args=[email],
                id=f"evening_{email}",
                replace_existing=True,
                coalesce=True,
            )

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
        _nudge_service_instance.start_scheduler()
    return _nudge_service_instance