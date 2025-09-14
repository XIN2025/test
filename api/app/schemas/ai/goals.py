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

class GoalBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=1000)
    priority: GoalPriority = GoalPriority.MEDIUM
    category: GoalCategory = GoalCategory.HEALTH
    target_value: Optional[float] = Field(None, ge=0)
    unit: Optional[str] = Field(None, max_length=50)
    due_date: Optional[datetime] = None

class GoalCreate(GoalBase):
    user_email: EmailStr

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

class Goal(GoalBase):
    id: str
    user_email: EmailStr
    current_value: Optional[float] = Field(0, ge=0)
    completed: bool = False
    notes: List[str] = []
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class GoalProgressUpdate(BaseModel):
    goal_id: str
    current_value: float = Field(..., ge=0)
    note: Optional[str] = Field(None, max_length=500)

class GoalNote(BaseModel):
    goal_id: str
    note: str = Field(..., min_length=1, max_length=500)

class WeeklyReflection(BaseModel):
    user_email: EmailStr
    week_start: datetime
    week_end: datetime
    rating: int = Field(..., ge=1, le=5)
    reflection: Optional[str] = Field(None, max_length=2000)
    next_week_goals: List[str] = Field(default_factory=list)

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

class DailySchedule(BaseModel):
    date: datetime
    start_time: datetime
    end_time: datetime
    note: Optional[str] = None
    complete: bool = False

class WeeklyActionSchedule(BaseModel):
    monday: Optional[DailySchedule] = None
    tuesday: Optional[DailySchedule] = None
    wednesday: Optional[DailySchedule] = None
    thursday: Optional[DailySchedule] = None
    friday: Optional[DailySchedule] = None
    saturday: Optional[DailySchedule] = None
    sunday: Optional[DailySchedule] = None

class ActionItem(BaseModel):
    id: str
    goal_id: str
    title: str
    description: str
    priority: ActionPriority
    weekly_schedule: Optional[WeeklyActionSchedule] = None 