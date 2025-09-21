from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from enum import Enum
from datetime import datetime
from typing import Optional
from enum import Enum

class NudgeType(str, Enum):
    REMINDER = "reminder"
    HEALTH_ALERT = "health_alert"

class NudgeStatus(str, Enum):
    PENDING = "pending"
    SENT = "sent"
    FAILED = "failed"

# TODO: Maybe creating a NudgeCreate schema would be better here
class Nudge(BaseModel):
    id: Optional[str] = None
    user_email: EmailStr
    scheduled_time: datetime
    title: str = Field(..., min_length=1, max_length=200)
    body: str = Field(..., min_length=1, max_length=500)
    status: NudgeStatus = NudgeStatus.PENDING
    created_at: Optional[datetime] = None

class GoalNudge(Nudge):
    goal_id: str
    action_item_title: str
    type: NudgeType.REMINDER

class HealthAlertNudge(Nudge):
    health_data_id: str
    type: NudgeType.HEALTH_ALERT

class FCMTokenRequest(BaseModel):
    email: EmailStr
    fcm_token: str

class FCMTokenResponse(BaseModel):
    success: bool
    message: str