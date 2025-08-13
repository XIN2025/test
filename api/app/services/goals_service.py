from datetime import datetime, timedelta, time
from typing import List, Optional, Dict, Any, Tuple
from bson import ObjectId
from ..schemas.goals import GoalCreate, GoalUpdate, Goal, WeeklyReflection, GoalStats
from ..schemas.planner import ActionPlan, WeeklyActionSchedule
from ..schemas.scheduler import WeeklySchedule
from ..schemas.preferences import PillarTimePreferences
from .db import get_db
from .planner_service import get_planner_service
from .scheduler_service import get_scheduler_service
from .graph_db import get_graph_db
import logging

logger = logging.getLogger(__name__)

class GoalsService:
    def __init__(self):
        self.db = get_db()
        self.goals_collection = self.db["goals"]
        self.reflections_collection = self.db["weekly_reflections"]
        self.habits_collection = self.db["habit_goals"]
        self.action_plans_collection = self.db["action_plans"]
        self.schedules_collection = self.db["weekly_schedules"]
        self.planner_service = get_planner_service()
        self.scheduler_service = get_scheduler_service()
        self.graph_db = get_graph_db()

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

    def get_user_goals(self, user_email: str, week_start: Optional[datetime] = None) -> List[Dict[str, Any]]:
        query = {"user_email": user_email}
        if week_start:
            week_end = week_start + timedelta(days=7)
            query["created_at"] = {"$gte": week_start, "$lt": week_end}
        goals = list(self.goals_collection.find(query).sort("created_at", -1))
        
        goals_with_plans = []
        for goal in goals:
            goal["id"] = str(goal["_id"])
            del goal["_id"]
            goal_obj = Goal(**goal)
            goal_dict = goal_obj.dict()
            
            # Get action plan and schedule
            goal_plan = self.get_goal_plan(str(goal_obj.id), user_email)
            if goal_plan:
                goal_dict["action_plan"] = goal_plan["action_plan"]
                goal_dict["weekly_schedule"] = goal_plan["weekly_schedule"]
            
            goals_with_plans.append(goal_dict)
            
        return goals_with_plans

    def get_goal_by_id(self, goal_id: str, user_email: str) -> Optional[Goal]:
        goal = self.goals_collection.find_one({"_id": ObjectId(goal_id), "user_email": user_email})
        if not goal:
            return None
        goal["id"] = str(goal["_id"])
        del goal["_id"]
        return Goal(**goal)

    async def update_goal(self, goal_id: str, user_email: str, update_data: GoalUpdate) -> Optional[Goal]:
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

    async def delete_goal(self, goal_id: str, user_email: str) -> bool:
        result = self.goals_collection.delete_one({"_id": ObjectId(goal_id), "user_email": user_email})
        return result.deleted_count > 0

    async def update_goal_progress(self, goal_id: str, user_email: str, current_value: float, note: Optional[str] = None) -> Optional[Goal]:
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

    async def add_goal_note(self, goal_id: str, user_email: str, note: str) -> Optional[Goal]:
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

    async def save_weekly_reflection(self, reflection_data: WeeklyReflection) -> Dict[str, Any]:
        reflection_dict = reflection_data.dict()
        reflection_dict["_id"] = ObjectId()
        reflection_dict["created_at"] = datetime.utcnow()
        result = self.reflections_collection.insert_one(reflection_dict)
        reflection_dict["id"] = str(result.inserted_id)
        # Remove non-serializable ObjectId before returning
        if "_id" in reflection_dict:
            del reflection_dict["_id"]
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

    def generate_goal_plan(self, goal_id: str, user_email: str, pillar_preferences: List[PillarTimePreferences]) -> Dict[str, Any]:
        """Generate action plan and weekly schedule for a goal with optional agent mode"""
        try:
            # Get the goal
            goal = self.get_goal_by_id(goal_id, user_email)
            if not goal:
                return {"success": False, "message": "Goal not found"}

            # Check if agent mode is enabled for each preference
            agent_mode = False
            for pref in pillar_preferences:
                if hasattr(pref, 'dict'):
                    pref_dict = pref.dict()
                    if pref_dict.get('agent_mode'):
                        agent_mode = True
                        break
                elif isinstance(pref, dict) and pref.get('agent_mode'):
                    agent_mode = True
                    break
            
            # Get graph context with user_email
            try:
                # Build a meaningful query string from goal details
                goal_text = f"{goal.title} {goal.description if goal.description else ''} {goal.category if goal.category else ''}"
                context = get_graph_db().get_context(
                    query=goal_text,
                    user_email=user_email,  # Always pass user_email
                    max_hops=2
                )
            except Exception as e:
                logger.error(f"Error extracting goal context: {str(e)}")
                context = []  # Initialize as empty list instead of None
            
            # Generate action plan using context
            try:
                # Make sure context is a list
                context_list = context if isinstance(context, list) else []
                
                # Generate action plan
                action_plan = self.planner_service.create_action_plan(
                    goal=goal,
                    context=context_list if isinstance(context_list, list) else [],
                    user_email=user_email,
                    agent_mode=agent_mode
                )
            except Exception as e:
                logger.error(f"Error creating action plan: {str(e)}")
                raise

            # Generate weekly schedule using preferences
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

            # Distribute weekly schedule to individual action items
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
                            # Convert duration string to proper format
                            duration_str = slot.duration if isinstance(slot.duration, str) else str(slot.duration)
                            if not ':' in duration_str:
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

                            # Calculate duration for pillar distribution
                            try:
                                h, m, s = duration_str.split(':')
                                slot_duration = timedelta(hours=int(h), minutes=int(m), seconds=int(s))
                                total_duration += slot_duration
                                if slot.pillar:
                                    pillar_times[slot.pillar] = pillar_times.get(slot.pillar, timedelta()) + slot_duration
                            except:
                                logger.warning(f"Could not parse duration: {duration_str}")

                    if day_slots:
                        action_slots[day] = {
                            "date": schedule.date.isoformat() if hasattr(schedule.date, 'isoformat') else schedule.date,
                            "time_slots": day_slots,
                            "total_duration": duration_str
                        }

                # Calculate pillar distribution
                total_seconds = total_duration.total_seconds()
                pillar_distribution = {
                    pillar: duration.total_seconds() / total_seconds
                    for pillar, duration in pillar_times.items()
                } if total_seconds > 0 else {}

                # Format total duration
                hours = int(total_duration.total_seconds() // 3600)
                minutes = int((total_duration.total_seconds() % 3600) // 60)
                seconds = int(total_duration.total_seconds() % 60)
                total_duration_str = f"{hours:02d}:{minutes:02d}:{seconds:02d}"

                # Set weekly schedule for the action item
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

            # Save the generated plan
            goal_dict = goal.dict()
            action_plan_dict = action_plan.dict() if hasattr(action_plan, 'dict') else action_plan
            weekly_schedule_dict = weekly_schedule.dict() if hasattr(weekly_schedule, 'dict') else weekly_schedule

            # Store plan and schedule
            stored_plan = self._store_action_plan(goal_id, user_email, action_plan)
            stored_schedule = self._store_weekly_schedule(goal_id, user_email, weekly_schedule)

            # Update goal with references
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

    def get_goal_plan(self, goal_id: str, user_email: str) -> Optional[Dict[str, Any]]:
        """Get stored action plan and schedule for a goal"""
        action_plan = self.action_plans_collection.find_one({
            "goal_id": goal_id,
            "user_email": user_email
        })
        weekly_schedule = self.schedules_collection.find_one({
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