from typing import List, Optional, Dict
from datetime import datetime, timedelta
import logging
import asyncio
from ..schemas.goals import Goal
from ..schemas.planner import ActionPlan, ActionItem, TimeEstimate, ActionPriority
from ..schemas.health_insights import HealthContext, HealthInsight
from ..services.health_insights_service import get_health_insights_service
from openai import OpenAI, RateLimitError
import os
import json
import time
from ..config import OPENAI_API_KEY, LLM_MODEL, LLM_TEMPERATURE

logger = logging.getLogger(__name__)

# Rate limiting parameters
MAX_RETRIES = 5
MIN_RETRY_DELAY = 1  # seconds
MAX_RETRY_DELAY = 32  # seconds

class PlannerService:
    def _sync_test_api_connection(self):
        """Test OpenAI API connection synchronously"""
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": "Simple test message. Say hi!"}],
                temperature=self.temperature
            )
            print("✅ OpenAI API test successful in PlannerService init!")
            print(f"Test response: {response.choices[0].message.content}")
            return True
        except Exception as e:
            print("❌ OpenAI API test failed in PlannerService init:")
            print(str(e))
            raise

    def __init__(self):
        if not OPENAI_API_KEY:
            raise ValueError("OpenAI API key not found in environment variables")
        print(f"Planner Service using API key: {OPENAI_API_KEY}")
        print(f"Testing OpenAI API connection with model: {LLM_MODEL}")
        
        self.client = OpenAI(api_key=OPENAI_API_KEY)
        self.model = LLM_MODEL
        self.temperature = LLM_TEMPERATURE
        
        # Test API connection synchronously
        self._sync_test_api_connection()
        
        self.health_insights_service = get_health_insights_service()

    def create_action_plan(self, goal: Goal, context: List[str] = None, user_email: str = None) -> ActionPlan:
        """Create an action plan for a goal, considering health insights and context"""
        try:
            # 1. Get health insights with context
            health_insight = self.health_insights_service.get_health_insight(goal=goal, context=context, user_email=user_email)
            
            # 2. Generate action items with OpenAI
            action_items = self._generate_action_items(goal, health_insight)
            
            # 3. Calculate total estimated time
            total_time = self._calculate_total_time(action_items)
            
            # 4. Create action plan
            return ActionPlan(
                goal_id=str(goal.id),
                goal_title=goal.title,
                action_items=action_items,
                total_estimated_time_per_week=total_time,
                health_adaptations=self._extract_health_adaptations(health_insight),
                suggested_schedule=self._suggest_schedule(action_items, health_insight)
            )
        except Exception as e:
            logger.error(f"Error creating action plan: {str(e)}")
            raise

    def _call_openai_with_retry(self, messages: List[Dict[str, str]], **kwargs) -> str:
        """Make OpenAI API call with exponential backoff retry logic"""
        for attempt in range(MAX_RETRIES):
            try:
                delay = min(MAX_RETRY_DELAY, MIN_RETRY_DELAY * (2 ** attempt))  # Exponential backoff
                if attempt > 0:
                    print(f"Retry attempt {attempt + 1} after {delay}s delay...")
                    time.sleep(delay)  # Use time.sleep instead of asyncio.sleep
                
                response = self.client.chat.completions.create(
                    model=self.model,
                    temperature=self.temperature,
                    messages=messages,
                    **kwargs
                )
                return response.choices[0].message.content.strip()
                
            except RateLimitError as e:
                if attempt == MAX_RETRIES - 1:
                    logger.error("Rate limit exceeded after all retries")
                    raise
                logger.warning(f"Rate limit hit, attempt {attempt + 1}/{MAX_RETRIES}")
                continue
            except Exception as e:
                if "quota" in str(e).lower():
                    logger.error("API quota exceeded")
                raise

    def _generate_action_items(self, goal: Goal, health_insight: HealthInsight) -> List[ActionItem]:
        """Generate action items using OpenAI, considering health insights"""
        try:
            prompt = self._create_action_items_prompt(goal, health_insight)
            print(f"Using model: {self.model}")  # Debug line
            
            messages = [
                {"role": "system", "content": "You are a specialized health and fitness planner that creates detailed action plans."},
                {"role": "user", "content": prompt}
            ]
            
            response_text = self._call_openai_with_retry(messages)
            
            # Try to find JSON array in response
            try:
                # Look for array start/end if there's extra text
                start = response_text.find("[")
                end = response_text.rfind("]") + 1
                if start >= 0 and end > start:
                    response_text = response_text[start:end]
                
                actions_data = json.loads(response_text)
                
                # Validate it's a list
                if not isinstance(actions_data, list):
                    logger.error("Response is not a JSON array")
                    actions_data = []
                
                # Ensure we have at least one action
                if not actions_data:
                    logger.warning("No actions generated, using default action")
                    actions_data = [{
                        "title": "Start slowly",
                        "description": "Begin with light exercises while monitoring how you feel",
                        "priority": "high",
                        "time_estimate": {
                            "min_duration": "PT15M",
                            "max_duration": "PT30M",
                            "recommended_frequency": "daily"
                        },
                        "prerequisites": ["Comfortable clothes", "Water bottle"],
                        "success_criteria": ["Complete without excessive fatigue", "Maintain steady breathing"],
                        "adaptation_notes": ["Stop if experiencing unusual discomfort", "Monitor heart rate"]
                    }]
                
                return [
                    ActionItem(
                        title=item["title"],
                        description=item["description"],
                        priority=item.get("priority", "medium"),
                        time_estimate=TimeEstimate(
                            min_duration=item.get("time_estimate", {}).get("min_duration", "PT15M"),
                            max_duration=item.get("time_estimate", {}).get("max_duration", "PT30M"),
                            recommended_frequency=item.get("time_estimate", {}).get("recommended_frequency", "daily")
                        ),
                        prerequisites=item.get("prerequisites", []),
                        success_criteria=item.get("success_criteria", ["Complete the activity"]),
                        adaptation_notes=item.get("adaptation_notes", [])
                    )
                    for item in actions_data
                ]
            except json.JSONDecodeError as e:
                logger.error(f"Error parsing action items response: {str(e)}\nResponse: {response_text}")
                # Return a safe default action
                return [ActionItem(
                    title="Start with basic activity",
                    description="Begin with light physical activity while monitoring your health",
                    priority="medium",
                    time_estimate=TimeEstimate(
                        min_duration="PT15M",
                        max_duration="PT30M",
                        recommended_frequency="daily"
                    ),
                    prerequisites=["Comfortable clothes", "Water bottle"],
                    success_criteria=["Complete the activity comfortably"],
                    adaptation_notes=["Stop if experiencing discomfort"]
                )]
                
        except Exception as e:
            logger.error(f"Error generating action items: {str(e)}")
            raise

    def _create_action_items_prompt(self, goal: Goal, health_insight: HealthInsight) -> str:
        """Create a prompt for generating action items"""
        # Format the health context safely
        medical_context = (', '.join(health_insight.context.medical_context) 
                         if hasattr(health_insight, 'context') and health_insight.context and health_insight.context.medical_context 
                         else "None")
        health_considerations = (', '.join(health_insight.context.medical_context) 
                              if hasattr(health_insight, 'context') and health_insight.context and health_insight.context.medical_context 
                              else "None")
        medical_precautions = (', '.join(health_insight.context.lifestyle_factors) 
                            if hasattr(health_insight, 'context') and health_insight.context and health_insight.context.lifestyle_factors 
                            else "None")
        safety_notes = (', '.join(health_insight.context.risk_factors) 
                      if hasattr(health_insight, 'context') and health_insight.context and health_insight.context.risk_factors 
                      else "None")

        return f'''You are a specialized health and fitness planner. Create a JSON array containing 2-3 specific activities based on the goal and health context below.

GOAL DETAILS:
Title: {goal.title}
Description: {goal.description}

HEALTH CONTEXT:
Medical Context: {medical_context}
Health Considerations: {health_considerations}
Medical Precautions: {medical_precautions}
Safety Notes: {safety_notes}

IMPORTANT: Return ONLY a strict JSON array with this exact format. DO NOT include any additional text:
[
    {{
        "title": "Short activity name",
        "description": "Detailed step-by-step instructions",
        "priority": "high",
        "time_estimate": {{
            "min_duration": "PT30M",
            "max_duration": "PT1H",
            "recommended_frequency": "daily"
        }},
        "prerequisites": ["Required item 1", "Required item 2"],
        "success_criteria": ["Measurable goal 1", "Measurable goal 2"],
        "adaptation_notes": ["Health modification 1", "Health modification 2"]
    }}
]

RULES:
1. priority must be one of: "high", "medium", "low"
2. recommended_frequency must be one of: "daily", "weekly", "twice_weekly"
3. durations must use ISO 8601 format (e.g., PT30M = 30 minutes, PT1H = 1 hour)
4. Include ONLY the JSON array in your response, no other text
5. Each activity must include ALL fields shown in the example
'''

    def _calculate_total_time(self, action_items: List[ActionItem]) -> timedelta:
        """Calculate total estimated time per week for all actions"""
        weekly_minutes = 0
        frequency_multipliers = {
            "daily": 7,
            "weekly": 1,
            "twice weekly": 2,
            "3 times per week": 3,
            "4 times per week": 4,
            "5 times per week": 5,
            "6 times per week": 6,
            "fortnightly": 0.5,
            "monthly": 0.25
        }

        for item in action_items:
            # Use average of min and max duration
            avg_duration = (item.time_estimate.min_duration + item.time_estimate.max_duration) / 2
            
            # Get frequency multiplier (default to 1 if unknown)
            freq = item.time_estimate.recommended_frequency.lower()
            multiplier = 1
            for key, value in frequency_multipliers.items():
                if key in freq:
                    multiplier = value
                    break

            weekly_minutes += avg_duration.total_seconds() / 60 * multiplier

        return timedelta(minutes=weekly_minutes)

    def _extract_health_adaptations(self, health_insight: HealthInsight) -> List[str]:
        """Extract health adaptations from health insights"""
        adaptations = []
        
        if hasattr(health_insight, 'context') and health_insight.context:
            # Add lifestyle factors as adaptations
            if health_insight.context.lifestyle_factors:
                adaptations.extend(health_insight.context.lifestyle_factors)
            
            # Add risk factors that suggest adaptations
            if health_insight.context.risk_factors:
                adaptations.extend([
                    note for note in health_insight.context.risk_factors
                    if any(kw in note.lower() for kw in ['adapt', 'modify', 'adjust', 'alternative', 'caution', 'avoid'])
                ])
            
            # Add medical context that requires adaptation
            if health_insight.context.medical_context:
                adaptations.extend([
                    ctx for ctx in health_insight.context.medical_context
                    if any(kw in ctx.lower() for kw in ['condition', 'symptom', 'limitation'])
                ])
        
        return adaptations

    def _suggest_schedule(self, action_items: List[ActionItem], health_insight: HealthInsight) -> Dict:
        """Suggest a weekly schedule based on action items and health considerations"""
        schedule = {
            "morning": [],
            "afternoon": [],
            "evening": []
        }

        for item in action_items:
            # Default to morning, but spread activities throughout the day
            preferred_time = "morning"
            
            # Consider health factors when scheduling
            if hasattr(health_insight, 'context') and health_insight.context:
                medical_context = ' '.join(health_insight.context.medical_context or []).lower()
                
                # Adjust timing based on medical context
                if any(kw in medical_context for kw in ['fatigue', 'energy', 'morning']):
                    preferred_time = "afternoon"  # Schedule when energy levels might be better
                elif any(kw in medical_context for kw in ['sleep', 'insomnia']):
                    preferred_time = "morning"    # Exercise might help with sleep
            
            schedule[preferred_time].append({
                "action": item.title,
                "duration": f"{item.time_estimate.min_duration} - {item.time_estimate.max_duration}",
                "frequency": item.time_estimate.recommended_frequency
            })

        return schedule

# Global instance
planner_service = None

def get_planner_service() -> PlannerService:
    global planner_service
    if planner_service is None:
        planner_service = PlannerService()
    return planner_service
