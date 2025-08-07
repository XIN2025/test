from typing import List, Dict, Optional, Tuple
from datetime import datetime, time, timedelta
import logging
from ..schemas.scheduler import TimeSlot, DaySchedule, WeeklySchedule
from ..schemas.planner import ActionPlan, ActionItem
from ..schemas.goals import Goal
from ..schemas.preferences import PillarTimePreferences
import google.generativeai as genai
import os
import json

logger = logging.getLogger(__name__)

class SmartSchedulerService:
    def __init__(self):
        genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))
        self.model = genai.GenerativeModel("gemini-1.5-pro")
        
        # Default time slots (can be customized)
        self.default_slots = {
            "morning": (time(6, 0), time(12, 0)),
            "afternoon": (time(12, 0), time(17, 0)),
            "evening": (time(17, 0), time(22, 0))
        }

    async def create_weekly_schedule(
        self,
        action_plan: ActionPlan,
        pillar_preferences: List[PillarTimePreferences],
        start_date: datetime
    ) -> WeeklySchedule:
        """Create a weekly schedule based on action items and pillar preferences"""
        try:
            # 1. Analyze time preferences and constraints
            time_blocks = self._analyze_time_preferences(pillar_preferences)
            
            # 2. Prioritize and distribute actions
            prioritized_actions = self._prioritize_actions(action_plan.action_items)
            
            # 3. Generate initial schedule with Gemini
            initial_schedule = await self._generate_initial_schedule(
                prioritized_actions,
                time_blocks,
                action_plan.health_adaptations,
                start_date
            )
            
            # 4. Optimize and balance the schedule
            optimized_schedule = self._optimize_schedule(
                initial_schedule,
                pillar_preferences,
                action_plan.total_estimated_time_per_week
            )
            
            # 5. Add health adaptations and notes
            final_schedule = self._add_health_context(
                optimized_schedule,
                action_plan.health_adaptations
            )
            
            return final_schedule
            
        except Exception as e:
            logger.error(f"Error creating weekly schedule: {str(e)}")
            raise

    def _analyze_time_preferences(
        self,
        preferences: List[PillarTimePreferences]
    ) -> Dict[str, List[Tuple[time, time]]]:
        """Analyze pillar time preferences to create available time blocks"""
        time_blocks = {}
        
        for pref in preferences:
            # Process each pillar's time preferences
            for pillar, time_pref in pref.preferences.items():
                if pillar not in time_blocks:
                    time_blocks[pillar] = []
                
                # Get the preferred time and duration
                # Convert string time to time object
                hours, minutes = map(int, time_pref.preferred_time.split(':'))
                block_start = time(hour=hours, minute=minutes)
                duration_delta = timedelta(minutes=time_pref.duration_minutes)
                block_end = (
                    datetime.combine(datetime.today(), block_start) + 
                    duration_delta
                ).time()
                
                # Add the time block for each specified day
                for day in time_pref.days_of_week:
                    time_blocks[pillar].append({
                        "start": block_start,
                        "end": block_end,
                        "day": day,
                        "duration_minutes": time_pref.duration_minutes
                    })
        
        return time_blocks

    def _prioritize_actions(self, actions: List[ActionItem]) -> List[Dict]:
        """Prioritize and organize actions for scheduling"""
        # Sort actions by priority and time requirements
        return sorted(
            [self._action_to_dict(action) for action in actions],
            key=lambda x: (
                self._priority_score(x["priority"]),
                -self._frequency_score(x["time_estimate"]["recommended_frequency"])
            )
        )

    def _action_to_dict(self, action: ActionItem) -> Dict:
        """Convert ActionItem to dictionary for scheduling"""
        return {
            "title": action.title,
            "priority": action.priority,
            "time_estimate": {
                "min_duration": str(action.time_estimate.min_duration),
                "max_duration": str(action.time_estimate.max_duration),
                "recommended_frequency": action.time_estimate.recommended_frequency
            },
            "adaptation_notes": action.adaptation_notes or []
        }

    async def _generate_initial_schedule(
        self,
        prioritized_actions: List[Dict],
        time_blocks: Dict[str, List[Dict]],
        health_adaptations: List[str],
        start_date: datetime
    ) -> WeeklySchedule:
        """Generate initial schedule using Gemini"""
        try:
            prompt = self._create_schedule_prompt(
                prioritized_actions,
                time_blocks,
                health_adaptations
            )
            response = await self.model.generate_content_async(prompt)
            response_text = response.text.strip()
            
            # Try to find JSON in response
            try:
                # Look for JSON array/object start/end
                start = response_text.find("{")
                end = response_text.rfind("}") + 1
                if start >= 0 and end > start:
                    response_text = response_text[start:end]
                
                schedule_data = json.loads(response_text)
                return self._convert_to_weekly_schedule(schedule_data, start_date)
                
            except json.JSONDecodeError as e:
                logger.error(f"Error parsing schedule response: {str(e)}\nResponse: {response_text}")
                # Create a default schedule
                return self._create_default_schedule(prioritized_actions, time_blocks, start_date)
                
        except Exception as e:
            logger.error(f"Error generating initial schedule: {str(e)}")
            raise

    def _create_schedule_prompt(
        self,
        actions: List[Dict],
        time_blocks: Dict[str, List[Dict]],
        health_adaptations: List[str]
    ) -> str:
        """Create prompt for schedule generation"""
        # Convert time objects to string format for JSON serialization
        serializable_blocks = {}
        for pillar, blocks in time_blocks.items():
            serializable_blocks[pillar] = [
                {
                    "start": block["start"].strftime("%H:%M"),
                    "end": block["end"].strftime("%H:%M"),
                    "day": block["day"],
                    "duration_minutes": block["duration_minutes"]
                }
                for block in blocks
            ]
            
        return f"""You are a scheduling assistant. Create a weekly schedule in strict JSON format.
IMPORTANT: Return ONLY the JSON object, no other text.

Input Data:
{{
    "actions": {json.dumps(actions, indent=2)},
    "available_blocks": {json.dumps(serializable_blocks, indent=2)},
    "health_adaptations": {json.dumps(health_adaptations, indent=2)}
}}

Requirements:
1. Each activity must be scheduled during available time blocks
2. High priority activities should be scheduled earlier in the day
3. Include buffer time between activities for health considerations
4. Follow recommended activity frequencies
5. Consider health adaptations when scheduling

Output Format (use exactly this structure):
{{
    "daily_schedules": {{
        "monday": [
            {{
                "start_time": "08:00",
                "end_time": "08:30",
                "action_item": "Light Stretching",
                "pillar": "FITNESS",
                "notes": ["Start with gentle movements", "Monitor breathing"]
            }}
        ],
        "tuesday": [],
        "wednesday": [],
        "thursday": [],
        "friday": [],
        "saturday": [],
        "sunday": []
    }},
    "pillar_distribution": {{
        "FITNESS": 0.6,
        "HEALTH": 0.4
    }},
    "schedule_notes": [
        "Activities scheduled with rest periods in between",
        "Morning slots prioritized for higher energy activities"
    ]
}}"""

    def _optimize_schedule(
        self,
        schedule: WeeklySchedule,
        preferences: List[PillarTimePreferences],
        target_weekly_time: timedelta
    ) -> WeeklySchedule:
        """Optimize schedule for better balance and efficiency"""
        try:
            # Default distribution if no preferences
            if not preferences:
                return schedule
                
            # 1. Balance pillar distribution based on available preferences
            pillar_times = {}
            total_time = timedelta()
            
            # Calculate current time allocation per pillar
            for day_schedule in schedule.daily_schedules.values():
                for slot in day_schedule.time_slots:
                    if slot.pillar:
                        if slot.pillar not in pillar_times:
                            pillar_times[slot.pillar] = timedelta()
                        pillar_times[slot.pillar] += slot.duration
                        total_time += slot.duration
            
            # Calculate distribution percentages
            total_seconds = total_time.total_seconds()
            if total_seconds > 0:
                schedule.pillar_distribution = {
                    pillar: (time.total_seconds() / total_seconds)
                    for pillar, time in pillar_times.items()
                }
            
            # Update total weekly hours
            schedule.total_weekly_hours = total_seconds / 3600
            
            return schedule
            
        except Exception as e:
            logger.error(f"Error optimizing schedule: {str(e)}")
            return schedule

    def _balance_day_schedule(
        self,
        day_schedule: DaySchedule,
        target_dist: Dict[str, float],
        current_dist: Dict[str, float]
    ) -> None:
        """Balance a single day's schedule to better match target distribution"""
        total_minutes = day_schedule.total_duration.total_seconds() / 60
        
        for pillar, target_pct in target_dist.items():
            current_pct = current_dist.get(pillar, 0)
            if current_pct < target_pct:
                # Need to increase this pillar's time
                needed_minutes = int(total_minutes * (target_pct - current_pct))
                if needed_minutes > 0:
                    self._adjust_pillar_time(day_schedule, pillar, needed_minutes)

    def _add_health_context(
        self,
        schedule: WeeklySchedule,
        health_adaptations: List[str]
    ) -> WeeklySchedule:
        """Add health context and adaptations to the schedule"""
        # Add general health adaptations
        schedule.health_adaptations = health_adaptations
        
        # Add specific notes to time slots
        for day_schedule in schedule.daily_schedules.values():
            for slot in day_schedule.time_slots:
                relevant_adaptations = [
                    adapt for adapt in health_adaptations
                    if any(kw in adapt.lower() for kw in [
                        slot.pillar.lower() if slot.pillar else "",
                        slot.action_item.lower() if slot.action_item else ""
                    ])
                ]
                if relevant_adaptations:
                    slot.health_notes = relevant_adaptations
        
        return schedule

    @staticmethod
    def _priority_score(priority: str) -> int:
        """Convert priority to numeric score"""
        return {"high": 3, "medium": 2, "low": 1}.get(priority.lower(), 0)

    @staticmethod
    def _frequency_score(frequency: str) -> int:
        """Convert frequency to numeric score for sorting"""
        freq_map = {
            "daily": 7,
            "twice daily": 14,
            "weekly": 1,
            "twice weekly": 2,
            "3 times per week": 3,
            "4 times per week": 4,
            "5 times per week": 5
        }
        
        frequency = frequency.lower()
        for key, value in freq_map.items():
            if key in frequency:
                return value
        return 1

    def _convert_to_weekly_schedule(
        self,
        schedule_data: Dict,
        start_date: datetime
    ) -> WeeklySchedule:
        """Convert raw schedule data to WeeklySchedule object"""
        daily_schedules = {}
        
        for day, slots in schedule_data["daily_schedules"].items():
            time_slots = []
            for slot in slots:
                start = datetime.strptime(slot["start_time"], "%H:%M").time()
                end = datetime.strptime(slot["end_time"], "%H:%M").time()
                duration = datetime.combine(datetime.today(), end) - \
                          datetime.combine(datetime.today(), start)
                
                time_slots.append(TimeSlot(
                    start_time=start,
                    end_time=end,
                    duration=duration,
                    pillar=slot.get("pillar"),
                    action_item=slot["action_item"],
                    health_notes=slot.get("notes", [])
                ))
            
            daily_schedules[day] = DaySchedule(
                date=start_date + timedelta(days=self._day_to_offset(day)),
                time_slots=time_slots,
                total_duration=sum((slot.duration for slot in time_slots), timedelta()),
                pillars_covered=list(set(slot.pillar for slot in time_slots if slot.pillar))
            )
        
        return WeeklySchedule(
            start_date=start_date,
            end_date=start_date + timedelta(days=6),
            daily_schedules=daily_schedules,
            total_weekly_hours=sum(
                day.total_duration.total_seconds() / 3600 
                for day in daily_schedules.values()
            ),
            pillar_distribution=schedule_data["pillar_distribution"],
            health_adaptations=[],  # Will be filled by _add_health_context
            schedule_notes=schedule_data.get("schedule_notes", [])
        )

    def _create_default_schedule(
        self,
        actions: List[Dict],
        time_blocks: Dict[str, List[Dict]],
        start_date: datetime
    ) -> WeeklySchedule:
        """Create a default schedule when LLM generation fails"""
        daily_schedules = {}
        
        # Get available time blocks for each day
        available_times = {}
        for pillar, blocks in time_blocks.items():
            for block in blocks:
                day_idx = block["day"]
                day_name = list(self._day_to_name.keys())[day_idx].lower()
                if day_name not in available_times:
                    available_times[day_name] = []
                available_times[day_name].append({
                    "start": block["start"].strftime("%H:%M"),
                    "end": block["end"].strftime("%H:%M"),
                    "pillar": pillar
                })
        
        # Create a basic schedule
        default_schedule = {
            "daily_schedules": {},
            "pillar_distribution": {},
            "schedule_notes": [
                "Default schedule created with basic time slots",
                "Please review and adjust based on your needs"
            ]
        }
        
        # Distribute actions across available time slots
        for day in ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]:
            slots = []
            day_blocks = available_times.get(day, [])
            
            if day_blocks and actions:
                for block in day_blocks:
                    if actions:  # If we still have actions to schedule
                        action = actions[0]  # Get highest priority action
                        slots.append({
                            "start_time": block["start"],
                            "end_time": block["end"],
                            "action_item": action["title"],
                            "pillar": block["pillar"],
                            "notes": action.get("adaptation_notes", [])
                        })
                        
                default_schedule["daily_schedules"][day] = slots
            else:
                default_schedule["daily_schedules"][day] = []
                
        # Set basic pillar distribution
        if time_blocks:
            total_blocks = sum(len(blocks) for blocks in time_blocks.values())
            default_schedule["pillar_distribution"] = {
                pillar: len(blocks) / total_blocks
                for pillar, blocks in time_blocks.items()
            }
        
        return self._convert_to_weekly_schedule(default_schedule, start_date)

    @staticmethod
    def _day_to_offset(day: str) -> int:
        """Convert day name to offset from start of week"""
        days = {
            "monday": 0,
            "tuesday": 1,
            "wednesday": 2,
            "thursday": 3,
            "friday": 4,
            "saturday": 5,
            "sunday": 6
        }
        return days.get(day.lower(), 0)
        
    _day_to_name = {
        0: "MONDAY",
        1: "TUESDAY",
        2: "WEDNESDAY",
        3: "THURSDAY",
        4: "FRIDAY",
        5: "SATURDAY",
        6: "SUNDAY"
    }

# Global instance
scheduler_service = None

def get_scheduler_service() -> SmartSchedulerService:
    global scheduler_service
    if scheduler_service is None:
        scheduler_service = SmartSchedulerService()
    return scheduler_service
