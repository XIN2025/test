from datetime import datetime, timedelta, time, date, timezone
from pprint import pprint
from typing import List, Optional, Dict, Any, Tuple
from bson import ObjectId
from ...schemas.ai.goals import GoalUpdate, Goal, WeeklyReflectionCreate, WeeklyReflection, GoalStats, GoalWithActionItems, ActionItem, ActionItemCreate, ActionPriority, WeeklyActionSchedule, DailySchedule, StreakScore
from ...schemas.backend.preferences import PillarTimePreferences
from ...schemas.backend.action_completions import (
    ActionItemCompletion, ActionItemCompletionCreate, ActionItemCompletionUpdate,
    DailyCompletionStats, WeeklyCompletionStats
)
from app.services.ai_services.mongodb_vectorstore import get_vector_store
from ..backend_services.db import get_db
from ..backend_services.nudge_service import NudgeService
from app.prompts import (
    CONTEXT_CATEGORY_SCHEMA,
    ACTION_ITEM_SCHEMA,
    GENERATE_ACTION_PLAN_WITH_SCHEDULE_SYSTEM_PROMPT,
    GENERATE_ACTION_PLAN_WITH_SCHEDULE_USER_PROMPT,
)
from langchain_openai import ChatOpenAI
from langchain.prompts import ChatPromptTemplate
from app.config import OPENAI_API_KEY, LLM_MODEL
from app.services.backend_services.nudge_service import NudgeService
from calendar import monthrange

class GoalsService:
    def __init__(self):
        self.db = get_db()
        self.goals_collection = self.db["goals"]
        self.action_items_collection = self.db["action_items"]
        self.reflections_collection = self.db["weekly_reflections"]
        self.vector_store = get_vector_store()
        self.nudge_service = NudgeService()

    async def _invoke_structured_llm(
        self, schema: dict, system_prompt: str, user_prompt: str, input_vars: dict
    ) -> dict:
        llm = ChatOpenAI(
            model=LLM_MODEL, openai_api_key=OPENAI_API_KEY
        ).with_structured_output(schema)
        prompt = ChatPromptTemplate.from_messages(
            [("system", system_prompt), ("user", user_prompt)]
        )
        chain = prompt | llm
        return await chain.ainvoke(input_vars)

    # TODO: Complete the schema for daily completion and daily completion response
    # TODO: Add user_email in action_items schema because it is needed here to filter action items by user
    async def get_current_daily_completion(self, user_email: str, month: int, year: int) -> Dict[str, int]:
        start_date = datetime(year, month, 1, tzinfo=timezone.utc)
        last_day = monthrange(year, month)[1]
        end_date = datetime(year, month, last_day, 23, 59, 59, tzinfo=timezone.utc)
        action_items = await self.action_items_collection.find({
            "user_email": user_email
        }).to_list(None)
        daily_counts = {}
        for item in action_items:
            weekly_schedule = item.get("weekly_schedule", {})
            if not weekly_schedule:
                continue
            for daily_schedule in weekly_schedule.values():
                if not daily_schedule:
                    continue
                completed = daily_schedule.get("complete", False)
                action_item_date = datetime.strptime(daily_schedule.get("date"), "%Y-%m-%d").replace(tzinfo=timezone.utc)
                if completed and start_date <= action_item_date <= end_date:
                    day_str = action_item_date.strftime("%Y-%m-%d")
                    daily_counts[day_str] = daily_counts.get(day_str, 0) + 1
        return daily_counts

    # TODO: This function can actually replace get_current_daily_completion because it is more generic
    async def get_all_daily_completions(self, user_email: str) -> Dict[str, int]:
        action_items = await self.action_items_collection.find({
            "user_email": user_email
        }).to_list(None)

        daily_counts = {}
        for item in action_items:
            weekly_schedule = item.get("weekly_schedule", {})
            if not weekly_schedule:
                continue
            for daily_schedule in weekly_schedule.values():
                if not daily_schedule:
                    continue
                completed = daily_schedule.get("complete", False)
                action_item_date = datetime.strptime(daily_schedule.get("date"), "%Y-%m-%d").replace(tzinfo=timezone.utc)
                if completed:
                    day_str = action_item_date.strftime("%Y-%m-%d")
                    daily_counts[day_str] = daily_counts.get(day_str, 0) + 1
        return daily_counts

    async def create_goal(self, goal_data: Goal) -> Goal:
        goal_dict = goal_data.model_dump()
        goal_dict["_id"] = ObjectId()
        goal_dict["created_at"] = datetime.now(timezone.utc)
        result = await self.goals_collection.insert_one(goal_dict)
        goal_dict["id"] = str(result.inserted_id)
        del goal_dict["_id"]  
        return Goal(**goal_dict)

    async def get_user_goals(self, user_email: str) -> List[Dict[str, Any]]:
        goals = await self.goals_collection.find({
            "user_email": user_email
        }).to_list(None)

        goals_with_action_items = []
        for goal in goals:
            goal["id"] = str(goal["_id"])
            del goal["_id"]  
            action_items = await self.action_items_collection.find({
                "goal_id": goal["id"]
            }).to_list(None)
            for action_item in action_items:
                action_item["id"] = str(action_item["_id"])
                del action_item["_id"]
            goal["action_items"] = [ActionItem(**item) for item in action_items]
            goals_with_action_items.append(GoalWithActionItems(**goal))
        
        goals_with_action_items.sort(key=lambda g: g.created_at, reverse=True)
            
        return goals_with_action_items

    async def get_goal_by_id(self, goal_id: str, user_email: str) -> Optional[Goal]:
        goal = await self.goals_collection.find_one({"_id": ObjectId(goal_id), "user_email": user_email})
        if not goal:
            return None
        print(goal)
        goal["id"] = str(goal["_id"])
        del goal["_id"]
        return Goal(**goal)

    async def delete_goal(self, goal_id: str, user_email: str) -> bool:
        try:
            obj_id = ObjectId(goal_id)
        except Exception:
            return False
        goals_deleted = await self.goals_collection.delete_one({"_id": obj_id, "user_email": user_email})
        await self.action_items_collection.delete_many({"goal_id": goal_id, "user_email": user_email})
        return goals_deleted.deleted_count > 0

    async def save_weekly_reflection(self, reflection_create: WeeklyReflectionCreate) -> WeeklyReflection:
        reflection_dict = reflection_create.model_dump()
        reflection_dict["created_at"] = datetime.now(timezone.utc)
        result = await self.reflections_collection.insert_one(reflection_dict)
        return WeeklyReflection(**reflection_dict, id=str(result.inserted_id))

    async def get_goal_stats(self, user_email: str) -> GoalStats:
        goals = await self.goals_collection.find({
            "user_email": user_email,
        }).to_list(None)
        if not goals:
            return GoalStats(
                total_goals=0,
                completed_goals=0,
                completion_rate=0.0,
                average_rating=None,
                weekly_streak=0,
                total_weekly_streak_count=0
            )
        total_goals = len(goals)
        completed_goals = await self._calculate_completed_goals(user_email)
        completion_rate = await self._calculate_monthly_completion_rate(user_email)
        average_rating = await self._calculate_monthly_average_rating(user_email)
        weekly_streak = await self._calculate_current_weekly_streak(user_email)
        total_weekly_streak_count = await self._calculate_total_weekly_streak_count(user_email)
        # weekly_streak = 0
        return GoalStats(
            total_goals=total_goals,
            completed_goals=completed_goals,
            completion_rate=completion_rate,
            average_rating=average_rating,
            weekly_streak=weekly_streak,
            total_weekly_streak_count=total_weekly_streak_count
        )

    # TODO: Work on weekly streak logic because get_current_daily_completion is working on monthly basis so it might break in the end of the month
    # TODO: You can another stat for maximum stream ever or maximum monthly streak
    async def _calculate_current_weekly_streak(self, user_email: str) -> int:
        daily_completions = await self.get_current_daily_completion(user_email, datetime.now(timezone.utc).month, datetime.now(timezone.utc).year)
        if not daily_completions:
            return 0
        dates = sorted(
            [datetime.strptime(date_str, "%Y-%m-%d").replace(tzinfo=timezone.utc) for date_str in daily_completions.keys()],
            reverse=True
        )
        streak = 0
        if not dates:
            return 0
        current_date = dates[0]
        while True:
            date_str = current_date.strftime("%Y-%m-%d")
            if daily_completions.get(date_str, 0) > 0:
                streak += 1
                current_date -= timedelta(days=1)
            else:
                break
        return streak
    
    async def _calculate_total_weekly_streak_count(self, user_email: str) -> int:
        daily_completions = await self.get_all_daily_completions(user_email)
        if not daily_completions:
            return 0
        dates = sorted(
            [datetime.strptime(date_str, "%Y-%m-%d").replace(tzinfo=timezone.utc) for date_str in daily_completions.keys()],
            reverse=True
        )
        if not dates:
            return 0
        current_date = dates[0]
        end_date = min(dates)
        total_weeks = 0
        while current_date >= end_date:
            week_dates = {current_date - timedelta(days=i) for i in range(7)}
            is_week_complete = any(date in week_dates and daily_completions.get(date.strftime("%Y-%m-%d"), 0) > 0 for date in dates)
            if is_week_complete:
                total_weeks += 1
            current_date -= timedelta(weeks=1)
        return total_weeks

    # TODO: Logic for missing streak is not integrated yet, _calculate_current_weekly_streak needs to be updated to return missed days too
    # TODO: _calculate_current_weekly_streak is returning the latest daily streak and where we are considering it week wise
    async def get_streak_score(self, user_email: str) -> StreakScore:
        weekly_streak = await self._calculate_current_weekly_streak(user_email)
        score = 0.0
        if weekly_streak == 0:
            score = 0.0
        elif weekly_streak == 1:
            score = 10.0
        elif weekly_streak == 2:
            score = 11.0
        elif weekly_streak == 3:
            score = 12.0
        elif 4 <= weekly_streak <= 25:
            score = 12.0 + 0.5 * (weekly_streak - 3)
        else:
            score = 25.0

        score = min(score, 25.0)

        return StreakScore(week=weekly_streak, score=score)
    
    async def _calculate_monthly_average_rating(self, user_email: str) -> Optional[float]:
        start_date = datetime.now(timezone.utc) - timedelta(weeks=4)
        reflections = await self.reflections_collection.find({
            "user_email": user_email,
            "created_at": {"$gte": start_date}
        }).to_list(None)
        if not reflections:
            return None
        ratings = [r.get("rating", 0) for r in reflections if r.get("rating")]
        if not ratings:
            return None
        return sum(ratings) / len(ratings)
    
    async def _calculate_monthly_completion_rate(self, user_email: str) -> Optional[float]:
        start_date = datetime.now(timezone.utc) - timedelta(weeks=4)
        action_items = await self.action_items_collection.find({
            "user_email": user_email,
        }).to_list(None)
        if not action_items:
            return None
        total_action_items = 0
        completed_action_items = 0
        for action_item in action_items:
            weekly_schedule = action_item.get("weekly_schedule", {})
            if not weekly_schedule:
                continue
            for daily_schedule in weekly_schedule.values():
                if not daily_schedule:
                    continue
                action_item_date = datetime.strptime(daily_schedule.get("date"), "%Y-%m-%d").replace(tzinfo=timezone.utc)
                if action_item_date < start_date:
                    continue
                total_action_items += 1
                if daily_schedule.get("completed"):
                    completed_action_items += 1
        if total_action_items == 0:
            return None
        return (completed_action_items / total_action_items) * 100

    async def _calculate_completed_goals(self, user_email: str) -> Optional[int]:
        goals = await self.goals_collection.find({
            "user_email": user_email,
        }).to_list(None)
        if not goals:
            return None
        completed_goals = 0
        for goal in goals:
            action_items = await self.action_items_collection.find({
                "goal_id": str(goal["_id"]),
                "user_email": user_email
            }).to_list(None)
            if not action_items:
                continue
            goal_completed = True
            for action_item in action_items:
                weekly_schedule = action_item.get("weekly_schedule", {})
                if not weekly_schedule:
                    continue
                for daily_schedule in weekly_schedule.values():
                    if not daily_schedule or not daily_schedule.get("completed"):
                        goal_completed = False
                        break
            if goal_completed:
                completed_goals += 1
        return completed_goals

    # TODO: Fix the pillar preferences schema it's not coming well on swagger
    async def generate_goal_plan(
        self,
        goal_id: str,
        user_email: str,
        pillar_preferences: Optional[List[PillarTimePreferences]],
    ) -> dict:
        try:
            goal = await self.get_goal_by_id(goal_id, user_email)
            if not goal:
                return {"success": False, "message": "Goal not found."}

            print(type(goal))

            goal_text = (
                f"{goal.title} {goal.description or ''} {goal.category or ''}".strip()
            )


            try:
                search_results = self.vector_store.search(
                    query=goal_text, user_email=user_email, top_k=5
                )
                context_list = [
                    doc.get("text", "") for doc in search_results if doc.get("text")
                ]
            except Exception as e:
                print(f"Error retrieving vector search context: {str(e)}")
                context_list = []

            health_context = {
                "medical_context": [],
                "lifestyle_factors": [],
                "risk_factors": [],
                "other_context": [],
            }
            try:
                health_context = await self._invoke_structured_llm(
                    schema=CONTEXT_CATEGORY_SCHEMA,
                    system_prompt="Categorize the following context items into a health goal",
                    user_prompt="Context items: {context_items}",
                    input_vars={"context_items": "\n".join(context_list)},
                )
            except Exception as e:
                print(f"Context categorization failed, using raw context: {str(e)}")
                health_context["lifestyle_factors"] = context_list

            # TODO: Look into if we really need this and will it be a good idea to transfer it to utility class
            def format_pillar_preferences(prefs: Optional[List[PillarTimePreferences]]) -> str:
                if not prefs:
                    return "None specified"
                lines = []
                for pref in prefs:
                    for pillar, time_pref in pref.preferences.items():
                        days = ", ".join(str(d) for d in time_pref.days_of_week)
                        lines.append(
                            f"{pillar}: Preferred time {time_pref.preferred_time}, "
                            f"Duration {time_pref.duration_minutes} min, Days {days}"
                        )
                return "\n".join(lines)

            pillar_pref_str = format_pillar_preferences(pillar_preferences)
            print(pillar_pref_str)

            # TODO: Make health context a separate function and add a schema for it
            action_item_with_schedule = await self._invoke_structured_llm(
                schema=ACTION_ITEM_SCHEMA,
                system_prompt=GENERATE_ACTION_PLAN_WITH_SCHEDULE_SYSTEM_PROMPT,
                user_prompt=GENERATE_ACTION_PLAN_WITH_SCHEDULE_USER_PROMPT,
                input_vars={
                    "goal_title": goal.title,
                    "goal_description": goal.description or "",
                    "medical_context": "\n".join(
                        health_context.get("medical_context", [])
                    )
                    or "None",
                    "lifestyle_factors": "\n".join(
                        health_context.get("lifestyle_factors", [])
                    )
                    or "None",
                    "risk_factors": "\n".join(health_context.get("risk_factors", []))
                    or "None",
                    "pillar_preferences": pillar_pref_str,
                },
            )

            for action_item in action_item_with_schedule.get("action_items", []):
                weekly_schedule = action_item.get("weekly_schedule", {})
                for day, schedule in weekly_schedule.items():
                    if schedule.get("start_time") is None:
                        schedule["start_time"] = ""
                    if schedule.get("end_time") is None:
                        schedule["end_time"] = ""

            pprint(action_item_with_schedule)
            action_items = [ActionItemCreate(**action_item, user_email=user_email, goal_id=goal_id) for action_item in action_item_with_schedule.get("action_items", [])]
            for index, action_item in enumerate(action_items):
                insert = await self.action_items_collection.insert_one(action_item.model_dump())
                action_item = ActionItem(
                    id=str(insert.inserted_id),
                    **action_item.model_dump()
                )
                action_items[index] = action_item

            await self.nudge_service.create_nudges_from_goal(goal_id)

            goal_dict = goal.model_dump()
            goal_dict = self._convert_time_objects_to_str(goal_dict)

            return {
                "success": True,
                "message": "Plan generated successfully",
                "data": {
                    "goal": goal_dict,
                    "action_items": [action_item.model_dump() for action_item in action_items],
                },
            }
        except Exception as e:
            print(f"Error generating plan: {str(e)}")
            return {"success": False, "message": f"Failed to generate plan: {str(e)}"}


    def _convert_time_objects_to_str(self, obj: Any) -> Any:
        """Recursively convert time-related objects and ObjectIds to string format"""
        if isinstance(obj, dict):
            return {key: self._convert_time_objects_to_str(value) for key, value in obj.items()}
        elif isinstance(obj, list):
            return [self._convert_time_objects_to_str(item) for item in obj]
        elif isinstance(obj, ObjectId):
            return str(obj)
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

    # TODO: You can create a get action_item by id function here 
    async def mark_action_item_complete(self, action_item_id: str, weekday_index: int) -> ActionItem:
        action_item = await self.action_items_collection.find_one({ "_id": ObjectId(action_item_id) })
        weekday = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"][weekday_index]
        weekly_schedule = action_item["weekly_schedule"]
        weekly_schedule[weekday]["complete"] = True
        await self.action_items_collection.update_one(
            { "_id": action_item["_id"]},
            { "$set": { "weekly_schedule": weekly_schedule } }
        )
        action_item["id"] = str(action_item["_id"])
        del action_item["_id"]
        action_item["priority"] = ActionPriority(action_item["priority"])
        pprint(action_item)
        action_item["weekly_schedule"] = WeeklyActionSchedule(**weekly_schedule)
        return ActionItem(**action_item)
    
    async def mark_action_item_incomplete(self, action_item_id: str, weekday_index: int) -> ActionItem:
        action_item = await self.action_items_collection.find_one({ "_id": ObjectId(action_item_id) })
        weekday = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"][weekday_index]
        weekly_schedule = action_item["weekly_schedule"]
        weekly_schedule[weekday]["complete"] = False
        await self.action_items_collection.update_one(
            { "_id": action_item["_id"]},
            { "$set": { "weekly_schedule": weekly_schedule } }
        )
        action_item["id"] = str(action_item["_id"])
        del action_item["_id"]
        action_item["priority"] = ActionPriority(action_item["priority"])
        pprint(action_item)
        action_item["weekly_schedule"] = WeeklyActionSchedule(**weekly_schedule)
        return ActionItem(**action_item)


def get_goals_service() -> GoalsService:
    return GoalsService()