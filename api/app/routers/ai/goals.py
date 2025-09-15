from fastapi import APIRouter, HTTPException, Query, Body
from fastapi.concurrency import run_in_threadpool
from typing import List, Optional
from datetime import datetime, timedelta, date
import asyncio
from concurrent.futures import ThreadPoolExecutor
from fastapi import Request
from ...schemas.ai.goals import (
    GoalUpdate, Goal, GoalProgressUpdate, GoalNote,
    WeeklyReflection, GoalStats, GoalResponse, GoalCreate, GoalResponse, WeeklyReflectionCreate
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

@goals_router.get("/api/goals/stats", response_model=GoalResponse)
async def get_goal_stats(user_email: EmailStr = Query(...)):
    try:
        stats = await goals_service.get_goal_stats(user_email)
        return GoalResponse(success=True, message="Goal statistics retrieved successfully", data={"stats": stats.dict()})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@goals_router.post("/api/goals/reflection", response_model=GoalResponse)
async def save_weekly_reflection(reflection_data: WeeklyReflectionCreate):
    try:
        result = await goals_service.save_weekly_reflection(reflection_data)
        return GoalResponse(success=True, message="Weekly reflection saved successfully", data=result.model_dump())
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
async def get_user_goals(user_email: EmailStr = Query(...)):
    try:
        goals = await goals_service.get_user_goals(user_email)
        return GoalResponse(success=True, message="Goals retrieved successfully", data={"goals": goals})
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

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

# TODO: Update delete_goal function of goal services for new architecture where action_items are store in a separate collection
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

@goals_router.post("/api/action-items/{action_item_id}/complete", response_model=GoalResponse)
async def mark_action_item_complete(
    action_item_id: str,
    weekday_index: int = Body(..., embed=True),
):
    try:
        completion = await goals_service.mark_action_item_complete(action_item_id, weekday_index)
        return GoalResponse(
            success=True,
            message="Action item marked completed successfully",
            data={"completion": completion.model_dump()}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@goals_router.get("/api/goals/{goal_id}/action-items", response_model=GoalResponse)
async def get_goal_action_items(
    goal_id: str,
):
    try:
        action_items = await goals_service.action_items_collection.find({
            "goal_id": goal_id,
        }).to_list(None)

        if not action_items:
            raise HTTPException(status_code=404, detail="Action items not found")

        for action_item in action_items:
            if "_id" in action_item:
                action_item["id"] = str(action_item["_id"])
                del action_item["_id"]

        return GoalResponse(
            success=True,
            message="Action items retrieved successfully",
            data={"action_items": action_items}
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))