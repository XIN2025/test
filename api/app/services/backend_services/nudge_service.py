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
from typing import List
import firebase_admin
from firebase_admin import credentials, messaging
import os

class NudgeService:
    def __init__(self):
        self.db = get_db()
        self.users_collection = self.db["users"]
        self.goals_collection = self.db["goals"]
        self.nudges_collection = self.db["nudges"]
        self._initialize_firebase()
    
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
                
                created_nudges.append(final_nudge)
        
        return created_nudges

def get_nudge_service():
    return NudgeService()