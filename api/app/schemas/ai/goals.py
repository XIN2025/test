from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional
from datetime import datetime
from enum import Enum

class GoalPriority(str, Enum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"

class GoalCategory(str, Enum):
    HEALTH = "health"
    FITNESS = "fitness"
    NUTRITION = "nutrition"
    MENTAL = "mental"
    PERSONAL = "personal"

class GoalUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=1000)
    priority: Optional[GoalPriority] = None
    category: Optional[GoalCategory] = None
    target_value: Optional[float] = Field(None, ge=0)
    unit: Optional[str] = Field(None, max_length=50)
    current_value: Optional[float] = Field(None, ge=0)
    completed: Optional[bool] = None
    due_date: Optional[datetime] = None

class GoalPriority(str, Enum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"

# TODO: Covert user email to user_id
class GoalCreate(BaseModel):
    user_email: EmailStr
    title: str
    description: Optional[str] = None
    priority: GoalPriority
    category: GoalCategory

class Goal(GoalCreate):
    id: str
    created_at: datetime

class GoalProgressUpdate(BaseModel):
    goal_id: str
    current_value: float = Field(..., ge=0)
    note: Optional[str] = Field(None, max_length=500)

class GoalNote(BaseModel):
    goal_id: str
    note: str = Field(..., min_length=1, max_length=500)

# TODO: Change user_email to user_id
class WeeklyReflectionCreate(BaseModel):
    user_email: EmailStr
    rating: int = Field(..., ge=1, le=5)
    reflection: Optional[str] = Field(None, max_length=2000)

class WeeklyReflection(WeeklyReflectionCreate):
    id: str
    created_at: datetime

class WeeklyProgress(BaseModel):
    user_email: EmailStr
    week_start: datetime
    week_end: datetime
    goals: List[Goal]
    reflection: Optional[str] = None
    rating: Optional[int] = Field(None, ge=1, le=5)
    created_at: datetime

class HabitGoal(BaseModel):
    goal_id: str
    habit_title: str = Field(..., min_length=1, max_length=200)
    completed: bool = False
    completed_at: Optional[datetime] = None

class GoalStats(BaseModel):
    total_goals: int
    completed_goals: int
    completion_rate: float
    average_rating: Optional[float] = None
    weekly_streak: int = 0

class GoalResponse(BaseModel):
    success: bool
    message: str
    data: Optional[dict] = None 

# Action Plan Schemas

class ActionPriority(str, Enum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"

# TODO: Change date, start_time, end_time to datetime format
class DailySchedule(BaseModel):
    date: str
    start_time: str
    end_time: str
    notes: Optional[str] = None
    complete: bool = False

class WeeklyActionSchedule(BaseModel):
    monday: Optional[DailySchedule] = None
    tuesday: Optional[DailySchedule] = None
    wednesday: Optional[DailySchedule] = None
    thursday: Optional[DailySchedule] = None
    friday: Optional[DailySchedule] = None
    saturday: Optional[DailySchedule] = None
    sunday: Optional[DailySchedule] = None

# TODO: Remove priority from action items as it's already there in goal schema, convert user_email to user_id
class ActionItemCreate(BaseModel):
    goal_id: str
    user_email: EmailStr
    title: str
    description: str
    priority: ActionPriority
    weekly_schedule: WeeklyActionSchedule

class ActionItem(ActionItemCreate):
    id: str

class GoalWithActionItems(Goal):
    action_items: List[ActionItem] = []