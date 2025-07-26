from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
from bson import ObjectId
from ..schemas.goals import GoalCreate, GoalUpdate, Goal, WeeklyReflection, GoalStats
from .db import get_db
import logging

logger = logging.getLogger(__name__)

class GoalsService:
    def __init__(self):
        self.db = get_db()
        self.goals_collection = self.db["goals"]
        self.reflections_collection = self.db["weekly_reflections"]
        self.habits_collection = self.db["habit_goals"]

    def create_goal(self, goal_data: GoalCreate) -> Goal:
        goal_dict = goal_data.dict()
        goal_dict["_id"] = ObjectId()
        goal_dict["current_value"] = 0
        goal_dict["completed"] = False
        goal_dict["notes"] = []
        goal_dict["created_at"] = datetime.utcnow()
        goal_dict["updated_at"] = datetime.utcnow()
        if goal_dict.get("target_value"):
            goal_dict["completed"] = goal_dict["current_value"] >= goal_dict["target_value"]
        result = self.goals_collection.insert_one(goal_dict)
        goal_dict["id"] = str(result.inserted_id)
        return Goal(**goal_dict)

    def get_user_goals(self, user_email: str, week_start: Optional[datetime] = None) -> List[Goal]:
        query = {"user_email": user_email}
        if week_start:
            week_end = week_start + timedelta(days=7)
            query["created_at"] = {"$gte": week_start, "$lt": week_end}
        goals = list(self.goals_collection.find(query).sort("created_at", -1))
        for goal in goals:
            goal["id"] = str(goal["_id"])
            del goal["_id"]
        return [Goal(**goal) for goal in goals]

    def get_goal_by_id(self, goal_id: str, user_email: str) -> Optional[Goal]:
        goal = self.goals_collection.find_one({"_id": ObjectId(goal_id), "user_email": user_email})
        if not goal:
            return None
        goal["id"] = str(goal["_id"])
        del goal["_id"]
        return Goal(**goal)

    def update_goal(self, goal_id: str, user_email: str, update_data: GoalUpdate) -> Optional[Goal]:
        update_dict = update_data.dict(exclude_unset=True)
        update_dict["updated_at"] = datetime.utcnow()
        if "current_value" in update_dict or "target_value" in update_dict:
            goal = self.get_goal_by_id(goal_id, user_email)
            if goal:
                current_val = update_dict.get("current_value", goal.current_value or 0)
                target_val = update_dict.get("target_value", goal.target_value)
                if target_val:
                    update_dict["completed"] = current_val >= target_val
        result = self.goals_collection.update_one(
            {"_id": ObjectId(goal_id), "user_email": user_email},
            {"$set": update_dict}
        )
        if result.modified_count == 0:
            return None
        return self.get_goal_by_id(goal_id, user_email)

    def delete_goal(self, goal_id: str, user_email: str) -> bool:
        result = self.goals_collection.delete_one({"_id": ObjectId(goal_id), "user_email": user_email})
        return result.deleted_count > 0

    def update_goal_progress(self, goal_id: str, user_email: str, current_value: float, note: Optional[str] = None) -> Optional[Goal]:
        update_data = {"current_value": current_value, "updated_at": datetime.utcnow()}
        goal = self.get_goal_by_id(goal_id, user_email)
        if not goal:
            return None
        if goal.target_value:
            update_data["completed"] = current_value >= goal.target_value
        if note:
            update_data["notes"] = goal.notes + [note]
        result = self.goals_collection.update_one(
            {"_id": ObjectId(goal_id), "user_email": user_email},
            {"$set": update_data}
        )
        if result.modified_count == 0:
            return None
        return self.get_goal_by_id(goal_id, user_email)

    def add_goal_note(self, goal_id: str, user_email: str, note: str) -> Optional[Goal]:
        goal = self.get_goal_by_id(goal_id, user_email)
        if not goal:
            return None
        new_notes = goal.notes + [note]
        result = self.goals_collection.update_one(
            {"_id": ObjectId(goal_id), "user_email": user_email},
            {"$set": {"notes": new_notes, "updated_at": datetime.utcnow()}}
        )
        if result.modified_count == 0:
            return None
        return self.get_goal_by_id(goal_id, user_email)

    def save_weekly_reflection(self, reflection_data: WeeklyReflection) -> Dict[str, Any]:
        reflection_dict = reflection_data.dict()
        reflection_dict["_id"] = ObjectId()
        reflection_dict["created_at"] = datetime.utcnow()
        result = self.reflections_collection.insert_one(reflection_dict)
        reflection_dict["id"] = str(result.inserted_id)
        return {
            "success": True,
            "message": "Weekly reflection saved successfully",
            "data": reflection_dict
        }

    def get_weekly_reflection(self, user_email: str, week_start: datetime) -> Optional[Dict[str, Any]]:
        week_end = week_start + timedelta(days=7)
        reflection = self.reflections_collection.find_one({
            "user_email": user_email,
            "week_start": {"$gte": week_start, "$lt": week_end}
        })
        if reflection:
            reflection["id"] = str(reflection["_id"])
            del reflection["_id"]
        return reflection

    def get_goal_stats(self, user_email: str, weeks: int = 4) -> GoalStats:
        start_date = datetime.utcnow() - timedelta(weeks=weeks)
        goals = list(self.goals_collection.find({
            "user_email": user_email,
            "created_at": {"$gte": start_date}
        }))
        total_goals = len(goals)
        completed_goals = len([g for g in goals if g.get("completed", False)])
        completion_rate = (completed_goals / total_goals * 100) if total_goals > 0 else 0
        reflections = list(self.reflections_collection.find({
            "user_email": user_email,
            "created_at": {"$gte": start_date}
        }))
        average_rating = None
        if reflections:
            ratings = [r.get("rating", 0) for r in reflections if r.get("rating")]
            if ratings:
                average_rating = sum(ratings) / len(ratings)
        weekly_streak = self._calculate_weekly_streak(user_email)
        return GoalStats(
            total_goals=total_goals,
            completed_goals=completed_goals,
            completion_rate=completion_rate,
            average_rating=average_rating,
            weekly_streak=weekly_streak
        )

    def _calculate_weekly_streak(self, user_email: str) -> int:
        current_week = datetime.utcnow()
        streak = 0
        for i in range(52):
            week_start = current_week - timedelta(weeks=i)
            week_end = week_start + timedelta(days=7)
            goals = list(self.goals_collection.find({
                "user_email": user_email,
                "created_at": {"$gte": week_start, "$lt": week_end}
            }))
            if not goals:
                break
            completed_goals = [g for g in goals if g.get("completed", False)]
            if completed_goals:
                streak += 1
            else:
                break
        return streak

    def get_weekly_progress(self, user_email: str, week_start: datetime) -> Dict[str, Any]:
        week_end = week_start + timedelta(days=7)
        goals = self.get_user_goals(user_email, week_start)
        reflection = self.get_weekly_reflection(user_email, week_start)
        total_goals = len(goals)
        completed_goals = len([g for g in goals if g.completed])
        completion_rate = (completed_goals / total_goals * 100) if total_goals > 0 else 0
        return {
            "week_start": week_start,
            "week_end": week_end,
            "goals": [goal.dict() for goal in goals],
            "reflection": reflection,
            "stats": {
                "total_goals": total_goals,
                "completed_goals": completed_goals,
                "completion_rate": completion_rate
            }
        } 