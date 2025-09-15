CONTEXT_CATEGORY_SCHEMA = {
    "title": "ContextCategorization",
    "description": "Intelligently categorize health-related context items",
    "type": "object",
    "properties": {
        "goal_related_entities": {
            "type": "array",
            "items": {"type": "string"},
            "description": "Items directly related to the health goal (apps, devices, activities)"
        },
        "medical_context": {
            "type": "array",
            "items": {"type": "string"},
            "description": "Medical conditions, symptoms, diagnoses, treatments"
        },
        "lifestyle_factors": {
            "type": "array",
            "items": {"type": "string"},
            "description": "Diet, exercise, sleep, habits, daily activities"
        },
        "risk_factors": {
            "type": "array",
            "items": {"type": "string"},
            "description": "Health risks, warnings, contraindications, precautions"
        }
    },
    "required": ["goal_related_entities", "medical_context", "lifestyle_factors", "risk_factors"]
}

ACTION_PLAN_SCHEMA = {
    "title": "ActionPlanWithSchedule",
    "description": "A health goal action plan with a separate weekly schedule.",
    "type": "object",
    "properties": {
        "action_plan": {
            "type": "object",
            "properties": {
                "goal_id": {"type": "string"},
                "goal_title": {"type": "string"},
                "action_items": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "title": {"type": "string"},
                            "description": {"type": "string"},
                            "priority": {"type": "string", "enum": ["high", "medium", "low"]},
                            "time_estimate": {
                                "type": "object",
                                "properties": {
                                    "min_duration": {"type": "string", "description": "ISO 8601 duration, e.g. PT30M"},
                                    "max_duration": {"type": "string", "description": "ISO 8601 duration, e.g. PT1H"},
                                    "recommended_frequency": {"type": "string", "enum": ["daily", "weekly", "twice_weekly"]}
                                },
                                "required": ["min_duration", "max_duration", "recommended_frequency"]
                            },
                            "prerequisites": {"type": "array", "items": {"type": "string"}},
                            "success_criteria": {"type": "array", "items": {"type": "string"}},
                            "adaptation_notes": {"type": "array", "items": {"type": "string"}}
                        },
                        "required": [
                            "title", "description", "priority", "time_estimate",
                            "prerequisites", "success_criteria", "adaptation_notes"
                        ]
                    }
                },
                "total_estimated_time_per_week": {"type": "string", "description": "ISO 8601 duration, e.g. PT3H"},
                "health_adaptations": {"type": "array", "items": {"type": "string"}},
                "created_at": {"type": "string", "format": "date-time"}
            },
            "required": [
                "goal_id", "goal_title", "action_items", "total_estimated_time_per_week",
                "health_adaptations", "created_at"
            ]
        },
        "weekly_schedule": {
            "type": "object",
            "description": "A detailed weekly schedule for the goal.",
            "properties": {
                "start_date": {"type": "string", "format": "date-time"},
                "end_date": {"type": "string", "format": "date-time"},
                "daily_schedules": {
                    "type": "object",
                    "properties": {
                        "monday": {"$ref": "#/definitions/daily_schedule"},
                        "tuesday": {"$ref": "#/definitions/daily_schedule"},
                        "wednesday": {"$ref": "#/definitions/daily_schedule"},
                        "thursday": {"$ref": "#/definitions/daily_schedule"},
                        "friday": {"$ref": "#/definitions/daily_schedule"},
                        "saturday": {"$ref": "#/definitions/daily_schedule"},
                        "sunday": {"$ref": "#/definitions/daily_schedule"}
                    },
                    "required": [
                        "monday", "tuesday", "wednesday", "thursday",
                        "friday", "saturday", "sunday"
                    ]
                },
                "total_weekly_hours": {"type": "number"},
                "pillar_distribution": {
                    "type": "object",
                    "additionalProperties": {"type": "number"}
                },
                "health_adaptations": {
                    "type": "array",
                    "items": {"type": "string"}
                },
                "schedule_notes": {
                    "type": "array",
                    "items": {"type": "string"}
                },
                "goal_id": {"type": "string"},
                "user_email": {"type": "string"},
                "created_at": {"type": "string", "format": "date-time"},
                "id": {"type": "string"}
            },
            "required": [
                "start_date", "end_date", "daily_schedules", "total_weekly_hours",
                "pillar_distribution", "health_adaptations", "schedule_notes",
                "goal_id", "user_email", "created_at", "id"
            ]
        }
    },
    "required": ["action_plan", "weekly_schedule"],
    "definitions": {
        "daily_schedule": {
            "type": "object",
            "properties": {
                "date": {"type": "string", "format": "date-time"},
                "time_slots": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "start_time": {"type": "string", "pattern": "^\\d{2}:\\d{2}:\\d{2}$"},
                            "end_time": {"type": "string", "pattern": "^\\d{2}:\\d{2}:\\d{2}$"},
                            "duration": {"type": "string", "pattern": "^\\d{2}:\\d{2}:\\d{2}$"},
                            "pillar": {"type": "string"},
                            "action_item": {"type": "string"},
                            "frequency": {"type": ["string", "null"]},
                            "priority": {"type": ["string", "null"]},
                            "health_notes": {
                                "type": "array",
                                "items": {"type": "string"}
                            }
                        },
                        "required": [
                            "start_time", "end_time", "duration", "pillar",
                            "action_item", "health_notes"
                        ]
                    }
                },
                "total_duration": {"type": "string", "pattern": "^\\d{2}:\\d{2}:\\d{2}$"},
                "pillars_covered": {
                    "type": "array",
                    "items": {"type": "string"}
                }
            },
            "required": ["date", "time_slots", "total_duration", "pillars_covered"]
        }
    }
}

GENERATE_ACTION_PLAN_WITH_SCHEDULE_SYSTEM_PROMPT = """
You are a health and fitness planning assistant. 
Given a health goal, user context, and user time preferences for different health pillars, generate a JSON object with:
- goal_id, goal_title
- 2-3 detailed action items (see schema)
- total_estimated_time_per_week (ISO 8601 duration)
- suggested_schedule (weekly schedule mapping each action to days of the week)
- health_adaptations (array)
- created_at (ISO 8601 datetime)
Only return the JSON object"""

GENERATE_ACTION_PLAN_WITH_SCHEDULE_USER_PROMPT = """
Goal: {goal_title} - {goal_description}
Medical Context: {medical_context}
Lifestyle Factors: {lifestyle_factors}
Risk Factors: {risk_factors}
User Pillar Preferences:
{pillar_preferences}
"""