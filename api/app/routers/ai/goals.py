from fastapi import APIRouter, HTTPException, Query, Body
from fastapi.concurrency import run_in_threadpool
from typing import List, Optional
from datetime import datetime, timedelta, date
import asyncio
from concurrent.futures import ThreadPoolExecutor
from fastapi import Request
from ...schemas.ai.goals import (
    GoalCreate, GoalUpdate, Goal, GoalProgressUpdate, GoalNote,
    WeeklyReflection, GoalStats, GoalResponse
)
from ...schemas.backend.preferences import PillarTimePreferences
from ...schemas.backend.action_completions import ActionItemCompletionCreateRequest, ActionItemCompletionUpdate, ActionItemCompletionCreate
from ...services.ai_services.goals_service import GoalsService
from pydantic import EmailStr

goals_router = APIRouter()
goals_service = GoalsService()


# Thread pool for CPU-intensive tasks
executor = ThreadPoolExecutor(max_workers=4)

# --- DAILY COMPLETION ENDPOINT (STATIC, PLACE ABOVE DYNAMIC ROUTES) ---
@goals_router.get("/api/goals/daily-completion", response_model=GoalResponse)
async def get_daily_completion(
    user_email: EmailStr = Query(...),
    month: int = Query(..., ge=1, le=12),
    year: int = Query(..., ge=2000, le=2100)
):
    """Return a mapping of YYYY-MM-DD to number of completed action items for the user in the given month/year."""
    try:
        # This method should be implemented in your GoalsService
        daily_completion = await goals_service.get_daily_completion(user_email, month, year)
        return GoalResponse(
            success=True,
            message="Daily completion retrieved successfully",
            data={"daily_completion": daily_completion}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Endpoint: Get daily completion counts for the user for a given month


@goals_router.get("/api/goals/stats", response_model=GoalResponse)
async def get_goal_stats(user_email: EmailStr = Query(...), weeks: int = Query(4, ge=1, le=52)):
    try:
        stats = await goals_service.get_goal_stats(user_email, weeks)
        return GoalResponse(success=True, message="Goal statistics retrieved successfully", data={"stats": stats.dict()})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@goals_router.get("/api/goals/reflection", response_model=GoalResponse)
async def get_weekly_reflection(user_email: EmailStr = Query(...), week_start: str = Query(...)):
    try:
        try:
            week_start_date = datetime.fromisoformat(week_start.replace('Z', '+00:00'))
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid week_start date format")
        reflection = await goals_service.get_weekly_reflection(user_email, week_start_date)
        return GoalResponse(success=True, message="Weekly reflection retrieved successfully", data={"reflection": reflection})
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@goals_router.post("/api/goals/reflection", response_model=GoalResponse)
async def save_weekly_reflection(reflection_data: WeeklyReflection):
    try:
        result = await goals_service.save_weekly_reflection(reflection_data)
        return GoalResponse(success=True, message="Weekly reflection saved successfully", data=result["data"])
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@goals_router.get("/api/goals/weekly-progress", response_model=GoalResponse)
async def get_weekly_progress(user_email: EmailStr = Query(...), week_start: str = Query(...)):
    try:
        try:
            week_start_date = datetime.fromisoformat(week_start.replace('Z', '+00:00'))
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid week_start date format")
        progress = goals_service.get_weekly_progress(user_email, week_start_date)
        return GoalResponse(success=True, message="Weekly progress retrieved successfully", data=progress)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@goals_router.get("/api/goals/current-week", response_model=GoalResponse)
async def get_current_week_goals(user_email: EmailStr = Query(...)):
    try:
        today = datetime.utcnow()
        days_since_monday = today.weekday()
        week_start = today - timedelta(days=days_since_monday)
        week_start = week_start.replace(hour=0, minute=0, second=0, microsecond=0)
        goals = await goals_service.get_user_goals(user_email, week_start)
        return GoalResponse(success=True, message="Current week goals retrieved successfully", data={"week_start": week_start.isoformat(), "goals": goals})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@goals_router.post("/api/goals", response_model=GoalResponse)
async def create_goal(goal_data: GoalCreate):
    try:
        goal = await goals_service.create_goal(goal_data)
        return GoalResponse(success=True, message="Goal created successfully", data={"goal": goal.dict()})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@goals_router.get("/api/goals", response_model=GoalResponse)
async def get_user_goals(user_email: EmailStr = Query(...), week_start: Optional[str] = Query(None)):
    try:
        week_start_date = None
        if week_start:
            try:
                week_start_date = datetime.fromisoformat(week_start.replace('Z', '+00:00'))
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid week_start date format")
        goals = await goals_service.get_user_goals(user_email, week_start_date)
        return GoalResponse(success=True, message="Goals retrieved successfully", data={"goals": goals})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@goals_router.get("/api/goals/completion-stats", response_model=GoalResponse)
async def get_all_goals_completion_stats(
    user_email: EmailStr = Query(...),
    week_start: str = Query(..., description="Week start date in YYYY-MM-DD format")
):
    """Get completion statistics for all user goals for a specific week"""
    try:
        try:
            week_start_date = datetime.strptime(week_start, "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid week_start date format. Use YYYY-MM-DD")
        
        stats = goals_service.get_all_goals_completion_stats(user_email, week_start_date)
        return GoalResponse(
            success=True,
            message="All goals completion statistics retrieved successfully",
            data={"completion_stats": stats}
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


## --- MOVE ALL STATIC ROUTES ABOVE DYNAMIC ROUTES --- ##

@goals_router.get("/api/goals/{goal_id}", response_model=GoalResponse)
async def get_goal(goal_id: str, user_email: EmailStr = Query(...)):
    try:
        goal = await goals_service.get_goal_by_id(goal_id, user_email)
        if not goal:
            raise HTTPException(status_code=404, detail="Goal not found")
        return GoalResponse(success=True, message="Goal retrieved successfully", data={"goal": goal.dict()})
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@goals_router.put("/api/goals/{goal_id}", response_model=GoalResponse)
async def update_goal(goal_id: str, goal_data: GoalUpdate, user_email: EmailStr = Query(...)):
    try:
        goal = await goals_service.update_goal(goal_id, user_email, goal_data)
        if not goal:
            raise HTTPException(status_code=404, detail="Goal not found")
        return GoalResponse(success=True, message="Goal updated successfully", data={"goal": goal.dict()})
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@goals_router.delete("/api/goals/{goal_id}", response_model=GoalResponse)
async def delete_goal(goal_id: str, user_email: EmailStr = Query(...)):
    try:
        deleted = await goals_service.delete_goal(goal_id, user_email)
        if not deleted:
            raise HTTPException(status_code=404, detail="Goal not found")
        return GoalResponse(success=True, message="Goal deleted successfully")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@goals_router.post("/api/goals/{goal_id}/progress", response_model=GoalResponse)
async def update_goal_progress(goal_id: str, progress_data: GoalProgressUpdate, user_email: EmailStr = Query(...)):
    try:
        goal = await goals_service.update_goal_progress(goal_id, user_email, progress_data.current_value, progress_data.note)
        if not goal:
            raise HTTPException(status_code=404, detail="Goal not found")
        return GoalResponse(success=True, message="Goal progress updated successfully", data={"goal": goal.dict()})
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@goals_router.post("/api/goals/{goal_id}/notes", response_model=GoalResponse)
async def add_goal_note(goal_id: str, note_data: GoalNote, user_email: EmailStr = Query(...)):
    try:
        goal = await goals_service.add_goal_note(goal_id, user_email, note_data.note)
        if not goal:
            raise HTTPException(status_code=404, detail="Goal not found")
        return GoalResponse(success=True, message="Note added successfully", data={"goal": goal.dict()})
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@goals_router.post("/api/goals/{goal_id}/generate-plan", response_model=GoalResponse)
async def generate_goal_plan(
    goal_id: str,
    user_email: EmailStr = Query(...),
    pillar_preferences: List[PillarTimePreferences] = Body(default=[])
):
    try:
        result = await goals_service.generate_goal_plan(
            goal_id,
            user_email,
            pillar_preferences
        )
        if not result["success"]:
            raise HTTPException(status_code=400, detail=result["message"])
        return GoalResponse(
            success=True,
            message="Goal plan generated successfully",
            data=result["data"]
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@goals_router.post("/api/goals/{goal_id}/action-items/complete", response_model=GoalResponse)
async def mark_action_item_completion(
    goal_id: str,
    completion_data: ActionItemCompletionCreateRequest,
    user_email: EmailStr = Query(...)
):
    """Mark an action item as completed for a specific date"""
    try:
        # Create the full completion data with goal_id from URL
        full_completion_data = ActionItemCompletionCreate(
            goal_id=goal_id,
            action_item_title=completion_data.action_item_title,
            completion_date=completion_data.completion_date,
            completed=completion_data.completed,
            notes=completion_data.notes
        )
        
        completion = await goals_service.mark_action_item_completion(
            user_email,
            full_completion_data
        )
        return GoalResponse(
            success=True,
            message="Action item completion recorded successfully",
            data={"completion": completion.dict()}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@goals_router.get("/api/goals/{goal_id}/action-plan", response_model=GoalResponse)
async def get_goal_action_plan(
    goal_id: str,
    user_email: EmailStr = Query(...)
):
    """Get the action plan for a goal with current weekly completion status"""
    try:
        action_plan = await goals_service.action_plans_collection.find_one({
            "goal_id": goal_id,
            "user_email": user_email
        })
        
        if not action_plan:
            raise HTTPException(status_code=404, detail="Action plan not found")
        
        # Convert ObjectId to string
        action_plan["id"] = str(action_plan["_id"])
        del action_plan["_id"]
        
        return GoalResponse(
            success=True,
            message="Action plan retrieved successfully",
            data={"action_plan": action_plan}
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@goals_router.get("/api/goals/{goal_id}/completion-stats", response_model=GoalResponse)
async def get_goal_completion_stats(
    goal_id: str,
    user_email: EmailStr = Query(...),
    week_start: str = Query(..., description="Week start date in YYYY-MM-DD format")
):
    """Get completion statistics for a goal for a specific week"""
    try:
        try:
            week_start_date = datetime.strptime(week_start, "%Y-%m-%d").date()
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid week_start date format. Use YYYY-MM-DD")
        
        stats = goals_service.get_goal_completion_stats(goal_id, user_email, week_start_date)
        return GoalResponse(
            success=True,
            message="Goal completion statistics retrieved successfully",
            data={"completion_stats": stats.dict()}
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))