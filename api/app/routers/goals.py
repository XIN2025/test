from fastapi import APIRouter, HTTPException, Query, Body
from typing import List, Optional
from datetime import datetime, timedelta
from ..schemas.goals import (
    GoalCreate, GoalUpdate, Goal, GoalProgressUpdate, GoalNote,
    WeeklyReflection, GoalStats, GoalResponse
)
from ..schemas.preferences import PillarTimePreferences
from ..services.goals_service import GoalsService
from pydantic import EmailStr

goals_router = APIRouter()
goals_service = GoalsService()

@goals_router.post("/api/goals", response_model=GoalResponse)
async def create_goal(goal_data: GoalCreate):
    try:
        goal = goals_service.create_goal(goal_data)
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
        goals = goals_service.get_user_goals(user_email, week_start_date)
        return GoalResponse(success=True, message="Goals retrieved successfully", data={"goals": [goal.dict() for goal in goals]})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@goals_router.get("/api/goals/{goal_id}", response_model=GoalResponse)
async def get_goal(goal_id: str, user_email: EmailStr = Query(...)):
    try:
        goal = goals_service.get_goal_by_id(goal_id, user_email)
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
        goal = goals_service.update_goal(goal_id, user_email, goal_data)
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
        deleted = goals_service.delete_goal(goal_id, user_email)
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
        goal = goals_service.update_goal_progress(goal_id, user_email, progress_data.current_value, progress_data.note)
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
        goal = goals_service.add_goal_note(goal_id, user_email, note_data.note)
        if not goal:
            raise HTTPException(status_code=404, detail="Goal not found")
        return GoalResponse(success=True, message="Note added successfully", data={"goal": goal.dict()})
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@goals_router.post("/api/goals/reflection", response_model=GoalResponse)
async def save_weekly_reflection(reflection_data: WeeklyReflection):
    try:
        result = goals_service.save_weekly_reflection(reflection_data)
        return GoalResponse(success=True, message="Weekly reflection saved successfully", data=result["data"])
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@goals_router.get("/api/goals/reflection", response_model=GoalResponse)
async def get_weekly_reflection(user_email: EmailStr = Query(...), week_start: str = Query(...)):
    try:
        try:
            week_start_date = datetime.fromisoformat(week_start.replace('Z', '+00:00'))
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid week_start date format")
        reflection = goals_service.get_weekly_reflection(user_email, week_start_date)
        return GoalResponse(success=True, message="Weekly reflection retrieved successfully", data={"reflection": reflection})
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@goals_router.get("/api/goals/stats", response_model=GoalResponse)
async def get_goal_stats(user_email: EmailStr = Query(...), weeks: int = Query(4, ge=1, le=52)):
    try:
        stats = goals_service.get_goal_stats(user_email, weeks)
        return GoalResponse(success=True, message="Goal statistics retrieved successfully", data={"stats": stats.dict()})
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
        goals = goals_service.get_user_goals(user_email, week_start)
        return GoalResponse(success=True, message="Current week goals retrieved successfully", data={"week_start": week_start.isoformat(), "goals": [goal.dict() for goal in goals]})
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
            goal_id=goal_id,
            user_email=user_email,
            pillar_preferences=pillar_preferences
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