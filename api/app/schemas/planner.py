from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, timedelta
from enum import Enum

class ActionPriority(str, Enum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"

class TimeEstimate(BaseModel):
    min_duration: timedelta
    max_duration: timedelta
    recommended_frequency: str  # e.g., "daily", "3 times per week", etc.
    time_of_day: Optional[str] = None  # e.g., "morning", "evening", etc.

class ActionItem(BaseModel):
    title: str
    description: str
    priority: ActionPriority
    time_estimate: TimeEstimate
    prerequisites: Optional[List[str]] = None
    success_criteria: List[str]
    adaptation_notes: Optional[List[str]] = None  # Health-specific adaptations

class ActionPlan(BaseModel):
    goal_id: str
    goal_title: str
    action_items: List[ActionItem]
    total_estimated_time_per_week: timedelta
    suggested_schedule: Optional[dict] = None  # Flexible schedule suggestions
    health_adaptations: List[str]  # Health-specific modifications to consider
    created_at: datetime = Field(default_factory=datetime.utcnow)

class PlannerResponse(BaseModel):
    success: bool
    message: str
    data: Optional[ActionPlan] = None
