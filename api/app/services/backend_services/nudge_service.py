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

class NudgeService:
    def __init__(self):
        self.db = get_db()
        self.collection = self.db["fcm_tokens"]
        self.goals_collection = self.db["goals"]
        self.nudges_collection = self.db["nudges"]

    async def save_fcm_token(self, email: str, fcm_token: str) -> bool:
        result = await self.collection.update_one(
            {"email": email},
            {"$set": {"fcm_token": fcm_token}},
            upsert=True,
        )
        return result.acknowledged

    async def send_fcm_notification(self, email: str, title: str, body: str, fcm_client=None):
        token_doc_raw = await self.collection.find_one({"email": email})
        
        if not token_doc_raw:
            raise UserNotFoundError(f"User not found: {email}")
        
        if not token_doc_raw.get("fcm_token"):
            raise TokenNotFoundError(f"No Expo token found for user: {email}")
            
        if not token_doc_raw.get("notifications_enabled", True):
            raise NotificationDisabledError(f"Notifications are disabled for user: {email}")

        expo_token = token_doc_raw["fcm_token"]

        message = {
            "to": expo_token,
            "sound": "default",
            "title": title,
            "body": body,
            "icon": "https://raw.githubusercontent.com/opengig/evra-app/5e95d4e27b1b25ddc9711619e3d3a481db331703/assets/images/evra.png?token=GHSAT0AAAAAADKIQPHIYQ7APDWXEHRSSIMM2FWJV6A",
            "android": {
                "icon": "@drawable/notification_icon",
                "color": "#16A34A",
                "channelId": "default"
            },
            "data": {
                "type": "nudge",
                "iconUrl": "https://raw.githubusercontent.com/opengig/evra-app/5e95d4e27b1b25ddc9711619e3d3a481db331703/assets/images/evra.png?token=GHSAT0AAAAAADKIQPHIYQ7APDWXEHRSSIMM2FWJV6A"
            }
        }

        expo_url = 'https://exp.host/--/api/v2/push/send'
        headers = {
            'Accept': 'application/json',
            'Accept-encoding': 'gzip, deflate',
            'Content-Type': 'application/json',
        }

        timeout_config = httpx.Timeout(10.0, connect=5.0)
        
        async with httpx.AsyncClient(timeout=timeout_config) as client:
            response = await client.post(
                expo_url,
                json=message,
                headers=headers
            )
            
            if response.status_code == 200:
                return response.json()
            else:
                raise NotificationError(
                    f"Failed to send notification: {response.status_code}", 
                    details={"response": response.json(), "email": email}
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