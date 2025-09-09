from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from enum import Enum
from datetime import datetime
from typing import Optional
from enum import Enum

class NudgeType(str, Enum):
    REMINDER = "reminder"

class NudgeStatus(str, Enum):
    PENDING = "pending"
    SENT = "sent"
    FAILED = "failed"

class Nudge(BaseModel):
    id: Optional[str] = None
    goal_id: str
    user_email: EmailStr
    action_item_title: str
    type: NudgeType
    scheduled_time: datetime
    title: str = Field(..., min_length=1, max_length=200)
    body: str = Field(..., min_length=1, max_length=500)
    status: NudgeStatus = NudgeStatus.PENDING
    created_at: Optional[datetime] = None

class FCMTokenRequest(BaseModel):
    email: EmailStr
    fcm_token: str

class FCMTokenResponse(BaseModel):
    success: bool
    message: str
