from datetime import datetime, timedelta, time, date
from typing import List, Optional, Dict, Any, Tuple
from bson import ObjectId
from ...schemas.ai.goals import GoalCreate, GoalUpdate, Goal, WeeklyReflection, GoalStats
from ...schemas.ai.planner import ActionPlan, WeeklyActionSchedule
from ...schemas.backend.scheduler import WeeklySchedule
from ...schemas.backend.preferences import PillarTimePreferences
from ...schemas.backend.action_completions import (
    ActionItemCompletion, ActionItemCompletionCreate, ActionItemCompletionUpdate,
    DailyCompletionStats, WeeklyCompletionStats
)
from app.services.ai_services.mongodb_vectorstore import get_vector_store
from ..backend_services.db import get_db
from .planner_service import get_planner_service
from ..backend_services.scheduler_service import get_scheduler_service
from ..backend_services.nudge_service import NudgeService
from ..miscellaneous.graph_db import get_graph_db
import logging

# Set up logging
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

class GoalsService:
    vectorstore = get_vector_store()
    async def get_daily_completion(self, user_email: str, month: int, year: int) -> Dict[str, int]:
        """
        Returns a mapping of YYYY-MM-DD to number of completed action items for the user in the given month/year.
        """
        from calendar import monthrange
        start_date = datetime(year, month, 1)
        last_day = monthrange(year, month)[1]
        end_date = datetime(year, month, last_day, 23, 59, 59)
        # Query all completions for this user in the month
        completions = self.action_completions_collection.find({
            "user_email": user_email,
            "completed": True,
            "completion_date": {"$gte": start_date, "$lte": end_date}
        })
        daily_counts = {}
        async for c in completions:
            # Normalize to YYYY-MM-DD string
            dt = c.get("completion_date")
            if isinstance(dt, datetime):
                day_str = dt.strftime("%Y-%m-%d")
            elif isinstance(dt, date):
                day_str = dt.isoformat()
            else:
                continue
            daily_counts[day_str] = daily_counts.get(day_str, 0) + 1
        return daily_counts
    def __init__(self):
        self.db = get_db()
        self.goals_collection = self.db["goals"]
        self.reflections_collection = self.db["weekly_reflections"]
        self.habits_collection = self.db["habit_goals"]
        self.action_plans_collection = self.db["action_plans"]
        self.schedules_collection = self.db["weekly_schedules"]
        self.action_completions_collection = self.db["action_completions"]
        self.planner_service = get_planner_service()
        self.scheduler_service = get_scheduler_service()
        self.nudge_service = NudgeService()
        self.graph_db = get_graph_db()

    async def create_goal(self, goal_data: GoalCreate) -> Goal:
        goal_dict = goal_data.dict()
        goal_dict["_id"] = ObjectId()
        goal_dict["current_value"] = 0
        goal_dict["completed"] = False
        goal_dict["notes"] = []
        goal_dict["created_at"] = datetime.utcnow()
        goal_dict["updated_at"] = datetime.utcnow()
        if goal_dict.get("target_value"):
            goal_dict["completed"] = goal_dict["current_value"] >= goal_dict["target_value"]
        result = await self.goals_collection.insert_one(goal_dict)
        goal_dict["id"] = str(result.inserted_id)
        return Goal(**goal_dict)

    async def get_user_goals(self, user_email: str, week_start: Optional[datetime] = None) -> List[Dict[str, Any]]:
        query = {"user_email": user_email}
        if week_start:
            week_end = week_start + timedelta(days=7)
            query["created_at"] = {"$gte": week_start, "$lt": week_end}
        goals = await self.goals_collection.find(query).sort("created_at", -1).to_list(None)
        
        goals_with_plans = []
        for goal in goals:
            goal["id"] = str(goal["_id"])
            del goal["_id"]
            goal_obj = Goal(**goal)
            goal_dict = goal_obj.dict()
            
            # Get action plan and schedule
            goal_plan = await self.get_goal_plan(str(goal_obj.id), user_email)
            if goal_plan:
                goal_dict["action_plan"] = goal_plan["action_plan"]
                goal_dict["weekly_schedule"] = goal_plan["weekly_schedule"]
            
            goals_with_plans.append(goal_dict)
            
        return goals_with_plans

    async def get_goal_by_id(self, goal_id: str, user_email: str) -> Optional[Goal]:
        goal = await self.goals_collection.find_one({"_id": ObjectId(goal_id), "user_email": user_email})
        if not goal:
            return None
        goal["id"] = str(goal["_id"])
        del goal["_id"]
        return Goal(**goal)

    async def update_goal(self, goal_id: str, user_email: str, update_data: GoalUpdate) -> Optional[Goal]:
        update_dict = update_data.dict(exclude_unset=True)
        update_dict["updated_at"] = datetime.utcnow()
        if "current_value" in update_dict or "target_value" in update_dict:
            goal = await self.get_goal_by_id(goal_id, user_email)
            if goal:
                current_val = update_dict.get("current_value", goal.current_value or 0)
                target_val = update_dict.get("target_value", goal.target_value)
                if target_val:
                    update_dict["completed"] = current_val >= target_val
        result = await self.goals_collection.update_one(
            {"_id": ObjectId(goal_id), "user_email": user_email},
            {"$set": update_dict}
        )
        if result.modified_count == 0:
            return None
        return await self.get_goal_by_id(goal_id, user_email)

    async def delete_goal(self, goal_id: str, user_email: str) -> bool:
        result = await self.goals_collection.delete_one({"_id": ObjectId(goal_id), "user_email": user_email})
        return result.deleted_count > 0

    async def update_goal_progress(self, goal_id: str, user_email: str, current_value: float, note: Optional[str] = None) -> Optional[Goal]:
        update_data = {"current_value": current_value, "updated_at": datetime.utcnow()}
        goal = await self.get_goal_by_id(goal_id, user_email)
        if not goal:
            return None
        if goal.target_value:
            update_data["completed"] = current_value >= goal.target_value
        if note:
            update_data["notes"] = goal.notes + [note]
        result = await self.goals_collection.update_one(
            {"_id": ObjectId(goal_id), "user_email": user_email},
            {"$set": update_data}
        )
        if result.modified_count == 0:
            return None
        return await self.get_goal_by_id(goal_id, user_email)

    async def add_goal_note(self, goal_id: str, user_email: str, note: str) -> Optional[Goal]:
        goal = await self.get_goal_by_id(goal_id, user_email)
        if not goal:
            return None
        new_notes = goal.notes + [note]
        result = await self.goals_collection.update_one(
            {"_id": ObjectId(goal_id), "user_email": user_email},
            {"$set": {"notes": new_notes, "updated_at": datetime.utcnow()}}
        )
        if result.modified_count == 0:
            return None
        return await self.get_goal_by_id(goal_id, user_email)

    async def save_weekly_reflection(self, reflection_data: WeeklyReflection) -> Dict[str, Any]:
        reflection_dict = reflection_data.dict()
        reflection_dict["_id"] = ObjectId()
        reflection_dict["created_at"] = datetime.utcnow()
        result = await self.reflections_collection.insert_one(reflection_dict)
        reflection_dict["id"] = str(result.inserted_id)
        # Remove non-serializable ObjectId before returning
        if "_id" in reflection_dict:
            del reflection_dict["_id"]
        return {
            "success": True,
            "message": "Weekly reflection saved successfully",
            "data": reflection_dict
        }

    async def get_weekly_reflection(self, user_email: str, week_start: datetime) -> Optional[Dict[str, Any]]:
        week_end = week_start + timedelta(days=7)
        reflection = await self.reflections_collection.find_one({
            "user_email": user_email,
            "week_start": {"$gte": week_start, "$lt": week_end}
        })
        if reflection:
            reflection["id"] = str(reflection["_id"])
            del reflection["_id"]
        return reflection

    async def get_goal_stats(self, user_email: str, weeks: int = 4) -> GoalStats:
        start_date = datetime.utcnow() - timedelta(weeks=weeks)
        goals = await self.goals_collection.find({
            "user_email": user_email,
            "created_at": {"$gte": start_date}
        }).to_list(None)
        total_goals = len(goals)
        completed_goals = len([g for g in goals if g.get("completed", False)])
        completion_rate = (completed_goals / total_goals * 100) if total_goals > 0 else 0
        reflections = await self.reflections_collection.find({
            "user_email": user_email,
            "created_at": {"$gte": start_date}
        }).to_list(None)
        average_rating = None
        if reflections:
            ratings = [r.get("rating", 0) for r in reflections if r.get("rating")]
            if ratings:
                average_rating = sum(ratings) / len(ratings)
        weekly_streak = await self._calculate_weekly_streak(user_email)
        return GoalStats(
            total_goals=total_goals,
            completed_goals=completed_goals,
            completion_rate=completion_rate,
            average_rating=average_rating,
            weekly_streak=weekly_streak
        )

    async def _calculate_weekly_streak(self, user_email: str) -> int:
        current_week = datetime.utcnow()
        streak = 0
        for i in range(52):
            week_start = current_week - timedelta(weeks=i)
            week_end = week_start + timedelta(days=7)
            goals = await self.goals_collection.find({
                "user_email": user_email,
                "created_at": {"$gte": week_start, "$lt": week_end}
            }).to_list(None)
            if not goals:
                break
            completed_goals = [g for g in goals if g.get("completed", False)]
            if completed_goals:
                streak += 1
            else:
                break
        return streak

    async def generate_goal_plan(
    self,
    goal_id: str,
    user_email: str,
    pillar_preferences: List[PillarTimePreferences]
) -> Dict[str, Any]:
        """Generate action plan and weekly schedule for a goal using vector search instead of graph DB"""
        try:
            # 1. Get the goal
            goal = await self.get_goal_by_id(goal_id, user_email)
            if not goal:
                return {"success": False, "message": "Goal not found"}

            # 2. Build query text from goal details
            goal_text = f"{goal.title} {goal.description or ''} {goal.category or ''}".strip()

            # 3. Retrieve context from vector store
            try:
                search_results = self.vectorstore.search(
                    query=goal_text,
                    user_email=user_email,
                    top_k=5
                )
                context_list = [doc.get("text", "") for doc in search_results if doc.get("text")]
            except Exception as e:
                logger.error(f"Error retrieving vector search context: {str(e)}")
                context_list = []

            # 4. Generate action plan using context
            try:
                action_plan = self.planner_service.create_action_plan(
                    goal=goal,
                    context=context_list,
                    user_email=user_email
                )
            except Exception as e:
                logger.error(f"Error creating action plan: {str(e)}")
                raise

            # 5. Generate weekly schedule using preferences
            try:
                weekly_schedule = self.scheduler_service.create_weekly_schedule(
                    action_plan=action_plan,
                    pillar_preferences=pillar_preferences,
                    start_date=datetime.utcnow().replace(
                        hour=0, minute=0, second=0, microsecond=0
                    )
                )
            except Exception as e:
                logger.error(f"Error generating weekly schedule: {str(e)}")
                raise

            # 6. Distribute weekly schedule to action items
            for action_item in action_plan.action_items:
                action_slots = {}
                pillar_times = {}
                total_duration = timedelta()

                for day, schedule in weekly_schedule.daily_schedules.items():
                    if not schedule or not schedule.time_slots:
                        continue

                    day_slots = []
                    for slot in schedule.time_slots:
                        if slot.action_item == action_item.title:
                            # Normalize duration format
                            duration_str = slot.duration if isinstance(slot.duration, str) else str(slot.duration)
                            if ":" not in duration_str:
                                duration_td = timedelta(seconds=float(duration_str))
                                hours = int(duration_td.total_seconds() // 3600)
                                minutes = int((duration_td.total_seconds() % 3600) // 60)
                                seconds = int(duration_td.total_seconds() % 60)
                                duration_str = f"{hours:02d}:{minutes:02d}:{seconds:02d}"

                            slot_dict = {
                                "start_time": slot.start_time.strftime("%H:%M") if hasattr(slot.start_time, 'strftime') else slot.start_time,
                                "end_time": slot.end_time.strftime("%H:%M") if hasattr(slot.end_time, 'strftime') else slot.end_time,
                                "duration": duration_str,
                                "pillar": slot.pillar,
                                "frequency": slot.frequency,
                                "priority": slot.priority,
                                "health_notes": slot.health_notes or []
                            }
                            day_slots.append(slot_dict)

                            # Track pillar distribution
                            try:
                                h, m, s = duration_str.split(":")
                                slot_duration = timedelta(hours=int(h), minutes=int(m), seconds=int(s))
                                total_duration += slot_duration
                                if slot.pillar:
                                    pillar_times[slot.pillar] = pillar_times.get(slot.pillar, timedelta()) + slot_duration
                            except Exception:
                                logger.warning(f"Could not parse duration: {duration_str}")

                    if day_slots:
                        action_slots[day] = {
                            "date": schedule.date.isoformat() if hasattr(schedule.date, 'isoformat') else schedule.date,
                            "time_slots": day_slots,
                            "total_duration": duration_str
                        }

                # Pillar distribution
                total_seconds = total_duration.total_seconds()
                pillar_distribution = {
                    pillar: duration.total_seconds() / total_seconds
                    for pillar, duration in pillar_times.items()
                } if total_seconds > 0 else {}

                # Format total weekly duration
                hours = int(total_duration.total_seconds() // 3600)
                minutes = int((total_duration.total_seconds() % 3600) // 60)
                seconds = int(total_duration.total_seconds() % 60)
                total_duration_str = f"{hours:02d}:{minutes:02d}:{seconds:02d}"

                # Attach schedule to action item
                action_item.weekly_schedule = {
                    "monday": action_slots.get("monday"),
                    "tuesday": action_slots.get("tuesday"),
                    "wednesday": action_slots.get("wednesday"),
                    "thursday": action_slots.get("thursday"),
                    "friday": action_slots.get("friday"),
                    "saturday": action_slots.get("saturday"),
                    "sunday": action_slots.get("sunday"),
                    "total_weekly_duration": total_duration_str,
                    "pillar_distribution": pillar_distribution
                }

            # 7. Save plan + schedule
            goal_dict = goal.dict()
            action_plan_dict = action_plan.dict() if hasattr(action_plan, "dict") else action_plan
            weekly_schedule_dict = weekly_schedule.dict() if hasattr(weekly_schedule, "dict") else weekly_schedule

            stored_plan = self._store_action_plan(goal_id, user_email, action_plan)
            stored_schedule = self._store_weekly_schedule(goal_id, user_email, weekly_schedule)

            # 8. Update goal document
            self.goals_collection.update_one(
                {"_id": ObjectId(goal_id)},
                {
                    "$set": {
                        "action_plan": stored_plan,
                        "weekly_schedule": stored_schedule,
                        "updated_at": datetime.utcnow()
                    }
                }
            )
            await self.nudge_service.create_nudges_from_goal(goal_id)

            return {
                "success": True,
                "message": "Plan generated successfully",
                "data": {
                    "goal": goal_dict,
                    "action_plan": stored_plan,
                    "weekly_schedule": stored_schedule
                }
            }
        except Exception as e:
            logger.error(f"Error generating plan: {str(e)}")
            return {"success": False, "message": f"Failed to generate plan: {str(e)}"}

    def _convert_time_objects_to_str(self, obj: Any) -> Any:
        """Recursively convert time-related objects to string format"""
        if isinstance(obj, dict):
            return {key: self._convert_time_objects_to_str(value) for key, value in obj.items()}
        elif isinstance(obj, list):
            return [self._convert_time_objects_to_str(item) for item in obj]
        elif isinstance(obj, timedelta):
            total_seconds = int(obj.total_seconds())
            hours = total_seconds // 3600
            minutes = (total_seconds % 3600) // 60
            seconds = total_seconds % 60
            return f"{hours:02d}:{minutes:02d}:{seconds:02d}"
        elif isinstance(obj, datetime):
            return obj.isoformat()
        elif isinstance(obj, time):
            return obj.strftime("%H:%M:%S")
        return obj

    def _store_action_plan(self, goal_id: str, user_email: str, action_plan: ActionPlan) -> Dict:
        """Store action plan in database"""
        # Convert the action plan to dict and handle timedelta objects
        plan_dict = action_plan.dict()
        plan_dict = self._convert_time_objects_to_str(plan_dict)
        
        # Add metadata
        plan_dict["_id"] = ObjectId()
        plan_dict["goal_id"] = goal_id
        plan_dict["user_email"] = user_email
        plan_dict["created_at"] = datetime.utcnow()
        
        # Store in database
        self.action_plans_collection.insert_one(plan_dict)
        plan_dict["id"] = str(plan_dict["_id"])
        del plan_dict["_id"]
        return plan_dict

    def _store_weekly_schedule(self, goal_id: str, user_email: str, schedule: WeeklySchedule) -> Dict:
        """Store weekly schedule in database"""
        # Convert the schedule to dict and handle timedelta objects
        schedule_dict = schedule.dict()
        schedule_dict = self._convert_time_objects_to_str(schedule_dict)
        
        # Add metadata
        schedule_dict["_id"] = ObjectId()
        schedule_dict["goal_id"] = goal_id
        schedule_dict["user_email"] = user_email
        schedule_dict["created_at"] = datetime.utcnow()
        
        # Store in database
        self.schedules_collection.insert_one(schedule_dict)
        schedule_dict["id"] = str(schedule_dict["_id"])
        del schedule_dict["_id"]
        return schedule_dict

    async def get_goal_plan(self, goal_id: str, user_email: str) -> Optional[Dict[str, Any]]:
        """Get stored action plan and schedule for a goal"""
        action_plan = await self.action_plans_collection.find_one({
            "goal_id": goal_id,
            "user_email": user_email
        })
        weekly_schedule = await self.schedules_collection.find_one({
            "goal_id": goal_id,
            "user_email": user_email
        })
        
        if not action_plan and not weekly_schedule:
            return None

        if action_plan:
            action_plan["id"] = str(action_plan["_id"])
            del action_plan["_id"]
        
        if weekly_schedule:
            weekly_schedule["id"] = str(weekly_schedule["_id"])
            del weekly_schedule["_id"]

        return {
            "action_plan": action_plan,
            "weekly_schedule": weekly_schedule
        }

    def get_weekly_progress(self, user_email: str, week_start: datetime) -> Dict[str, Any]:
        week_end = week_start + timedelta(days=7)
        goals = self.get_user_goals(user_email, week_start)
        reflection = self.get_weekly_reflection(user_email, week_start)

        # Get action plans and schedules for each goal (goals are dicts already)
        goals_with_plans = []
        for goal in goals:
            goal_dict = dict(goal)
            goal_plan = self.get_goal_plan(goal_dict.get("id"), user_email)
            if goal_plan:
                goal_dict["action_plan"] = goal_plan["action_plan"]
                goal_dict["weekly_schedule"] = goal_plan["weekly_schedule"]
            goals_with_plans.append(goal_dict)

        total_goals = len(goals)
        completed_goals = len([g for g in goals if g.get("completed")])
        completion_rate = (completed_goals / total_goals * 100) if total_goals > 0 else 0

        return {
            "week_start": week_start,
            "week_end": week_end,
            "goals": goals_with_plans,
            "reflection": reflection,
            "stats": {
                "total_goals": total_goals,
                "completed_goals": completed_goals,
                "completion_rate": completion_rate
            }
        }

    # Action Item Completion Tracking Methods
    
    async def mark_action_item_completion(self, user_email: str, completion_data: ActionItemCompletionCreate) -> ActionItemCompletion:
        """Mark an action item as completed or update its completion status"""
        logger.info(f"Marking action item completion: user={user_email}, goal_id={completion_data.goal_id}, action_item={completion_data.action_item_title}, completed={completion_data.completed}")
        
        completion_dict = completion_data.dict()
        completion_dict["user_email"] = user_email
        completion_dict["created_at"] = datetime.utcnow()
        completion_dict["_id"] = ObjectId()
        
        # Ensure completion_date is a naive UTC datetime at start of day (MongoDB expects naive UTC)
        completion_date = completion_data.completion_date
        if isinstance(completion_date, date) and not isinstance(completion_date, datetime):
            completion_date = datetime.combine(completion_date, time.min)
        elif isinstance(completion_date, str):
            completion_date = datetime.fromisoformat(completion_date.replace('Z', '+00:00'))
        # Normalize to naive (UTC) and zero time to avoid tz-aware/naive mismatches
        if isinstance(completion_date, datetime):
            completion_date = completion_date.replace(hour=0, minute=0, second=0, microsecond=0, tzinfo=None)
        completion_dict["completion_date"] = completion_date
        
        # Check if completion already exists for this date and action item
        existing = self.action_completions_collection.find_one({
            "user_email": user_email,
            "goal_id": completion_data.goal_id,
            "action_item_title": completion_data.action_item_title,
            "completion_date": completion_date
        })
        
        if existing:
            # Update existing completion
            self.action_completions_collection.update_one(
                {"_id": existing["_id"]},
                {"$set": {
                    "completed": completion_data.completed,
                    "notes": completion_data.notes,
                    "updated_at": datetime.utcnow()
                }}
            )
            existing.update({
                "completed": completion_data.completed,
                "notes": completion_data.notes
            })
            result = ActionItemCompletion(**existing)
        else:
            # Create new completion record
            db_result = self.action_completions_collection.insert_one(completion_dict)
            completion_dict["id"] = str(db_result.inserted_id)
            result = ActionItemCompletion(**completion_dict)
        
        # Update the weekly completion status in the action plan
        logger.info(f"About to update weekly completion status...")
        await self._update_weekly_completion_status(
            user_email, 
            completion_data.goal_id, 
            completion_data.action_item_title, 
            completion_date, 
            completion_data.completed
        )
        logger.info(f"Finished updating weekly completion status")
        
        return result

    async def _update_weekly_completion_status(self, user_email: str, goal_id: str, action_item_title: str, completion_date: datetime, completed: bool):
        """Update the weekly completion status in the action plan"""
        try:
            # Find the Monday of the week for the completion date
            days_since_monday = completion_date.weekday()
            week_start = completion_date.replace(hour=0, minute=0, second=0, microsecond=0) - timedelta(days=days_since_monday)
            
            logger.info(f"Updating weekly completion: goal_id={goal_id}, action_item={action_item_title}, week_start={week_start.date()}, completed={completed}")
            
            # Find the action plan for this goal
            action_plan = self.action_plans_collection.find_one({
                "goal_id": goal_id,
                "user_email": user_email
            })
            
            if not action_plan:
                logger.warning(f"No action plan found for goal {goal_id}")
                return
            
            # Update the weekly completion status for the specific action item
            action_items = action_plan.get("action_items", [])
            updated = False
            for action_item in action_items:
                if action_item.get("title") == action_item_title:
                    logger.info(f"Found matching action item: {action_item_title}")
                    # Initialize weekly_completion if it doesn't exist
                    if "weekly_completion" not in action_item:
                        logger.info(f"Initializing weekly_completion for action item: {action_item_title}")
                        action_item["weekly_completion"] = []
                    weekly_completion = action_item.get("weekly_completion", [])
                    # Find or create the weekly completion entry for this week
                    week_entry = None
                    for completion in weekly_completion:
                        completion_week_start = completion.get("week_start")
                        if isinstance(completion_week_start, str):
                            completion_week_start = datetime.fromisoformat(completion_week_start.replace('Z', '+00:00'))
                        if completion_week_start and completion_week_start.date() == week_start.date():
                            week_entry = completion
                            break
                    if week_entry:
                        logger.info(f"Updating existing week entry for {week_start.date()}: {completed}")
                        week_entry["is_complete"] = completed
                        updated = True
                    else:
                        logger.info(f"Creating new week entry for {week_start.date()}: {completed}")
                        # Add new weekly completion entry
                        weekly_completion.append({
                            "week_start": week_start,
                            "is_complete": completed
                        })
                        action_item["weekly_completion"] = weekly_completion
                        updated = True
                    break
            
            if updated:
                # Update the action plan in the database
                result = self.action_plans_collection.update_one(
                    {"_id": action_plan["_id"]},
                    {"$set": {"action_items": action_items, "updated_at": datetime.utcnow()}}
                )
                logger.info(f"Database update result - matched: {result.matched_count}, modified: {result.modified_count}")
                logger.info(f"Successfully updated weekly completion status for {action_item_title} in goal {goal_id}")
            else:
                logger.warning(f"No update performed for action item {action_item_title} in goal {goal_id}")
            
        except Exception as e:
            logger.error(f"Error updating weekly completion status: {str(e)}")
            import traceback
            logger.error(f"Traceback: {traceback.format_exc()}")

    def get_goal_completion_stats(self, goal_id: str, user_email: str, week_start: date) -> WeeklyCompletionStats:
        """Calculate completion statistics for a goal for a specific week"""
        week_end = week_start + timedelta(days=6)
        
        # Get the goal's weekly schedule
        goal_plan = self.get_goal_plan(goal_id, user_email)
        if not goal_plan or not goal_plan.get("weekly_schedule"):
            return WeeklyCompletionStats(
                goal_id=goal_id,
                week_start=datetime.combine(week_start, time.min),  # Convert to datetime
                week_end=datetime.combine(week_end, time.min),      # Convert to datetime
                total_scheduled_days=0,
                completed_days=0,
                daily_stats=[],
                overall_completion_percentage=0.0
            )
        
        weekly_schedule = goal_plan["weekly_schedule"]
        daily_schedules = weekly_schedule.get("daily_schedules", {})
        
        daily_stats = []
        total_scheduled_days = 0
        completed_days = 0
        
        # Check each day of the week
        days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
        for i, day in enumerate(days):
            current_date = week_start + timedelta(days=i)
            day_schedule = daily_schedules.get(day, {})
            time_slots = day_schedule.get("time_slots", [])
            
            if time_slots:  # If there are scheduled action items for this day
                total_scheduled_days += 1
                
                # Convert date to datetime for MongoDB query (MongoDB expects datetime objects)
                current_datetime = datetime.combine(current_date, time.min)
                
                # Get completed action items for this date
                completed_items = list(self.action_completions_collection.find({
                    "user_email": user_email,
                    "goal_id": goal_id,
                    "completion_date": current_datetime,
                    "completed": True
                }))
                
                # Get all scheduled action items for this day
                scheduled_action_items = []
                for slot in time_slots:
                    action_item = slot.get("action_item", "")
                    if action_item and action_item not in scheduled_action_items:
                        scheduled_action_items.append(action_item)
                
                completed_action_items = [item["action_item_title"] for item in completed_items]
                completion_percentage = (len(completed_action_items) / len(scheduled_action_items) * 100) if scheduled_action_items else 0
                
                # If all action items for the day are completed, count as completed day
                if completion_percentage == 100:
                    completed_days += 1
                
                daily_stats.append(DailyCompletionStats(
                    date=current_datetime,  # Use datetime instead of date
                    total_scheduled_items=len(scheduled_action_items),
                    completed_items=len(completed_action_items),
                    completion_percentage=completion_percentage,
                    action_items=completed_action_items  # Store completed items instead of scheduled items
                ))
        
        overall_completion_percentage = (completed_days / total_scheduled_days * 100) if total_scheduled_days > 0 else 0
        
        return WeeklyCompletionStats(
            goal_id=goal_id,
            week_start=datetime.combine(week_start, time.min),  # Convert to datetime
            week_end=datetime.combine(week_end, time.min),      # Convert to datetime
            total_scheduled_days=total_scheduled_days,
            completed_days=completed_days,
            daily_stats=daily_stats,
            overall_completion_percentage=overall_completion_percentage
        )

    def get_all_goals_completion_stats(self, user_email: str, week_start: date) -> Dict[str, WeeklyCompletionStats]:
        """Get completion statistics for all user goals for a specific week"""
        goals = self.get_user_goals(user_email)
        completion_stats = {}
        
        for goal in goals:
            goal_id = goal.get("id") or str(goal.get("_id"))
            stats = self.get_goal_completion_stats(goal_id, user_email, week_start)
            completion_stats[goal_id] = stats
        
        return completion_stats