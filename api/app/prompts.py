# TODO: Should we filter out irrelevant context during categorization?
CONTEXT_CATEGORY_SCHEMA = {
    "title": "ContextCategorization",
    "description": "Intelligently categorize health-related context items",
    "type": "object",
    "properties": {
        "goal_related_entities": {
            "type": "array",
            "items": {"type": "string"},
            "description": "Items directly related to the health goal (apps, devices, activities)",
        },
        "medical_context": {
            "type": "array",
            "items": {"type": "string"},
            "description": "Medical conditions, symptoms, diagnoses, treatments",
        },
        "lifestyle_factors": {
            "type": "array",
            "items": {"type": "string"},
            "description": "Diet, exercise, sleep, habits, daily activities",
        },
        "risk_factors": {
            "type": "array",
            "items": {"type": "string"},
            "description": "Health risks, warnings, contraindications, precautions",
        },
        "other_context": {
            "type": "array",
            "items": {"type": "string"},
            "description": "Any other health context not covered above",
        }
    },
    "required": [
        "goal_related_entities",
        "medical_context",
        "lifestyle_factors",
        "risk_factors",
    ],
}

ACTION_ITEM_SCHEMA = {
    "title": "ActionPlanWithSchedule",
    "description": "A health goal action plan with a separate weekly schedule.",
    "type": "object",
    "properties": {
        "action_items": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "title": {"type": "string"},
                    "description": {"type": "string"},
                    "priority": {"type": "string", "enum": ["high", "medium", "low"]},
                    "weekly_schedule": {
                        "type": "object",
                        "description": "A detailed weekly schedule for the action item.",
                        "properties": {
                            "monday": {"$ref": "#/definitions/daily_schedule"},
                            "tuesday": {"$ref": "#/definitions/daily_schedule"},
                            "wednesday": {"$ref": "#/definitions/daily_schedule"},
                            "thursday": {"$ref": "#/definitions/daily_schedule"},
                            "friday": {"$ref": "#/definitions/daily_schedule"},
                            "saturday": {"$ref": "#/definitions/daily_schedule"},
                            "sunday": {"$ref": "#/definitions/daily_schedule"},
                        },
                        "required": [
                            "monday",
                            "tuesday",
                            "wednesday",
                            "thursday",
                            "friday",
                            "saturday",
                            "sunday",
                        ],
                    },
                },
                "required": ["title", "description", "priority"],
            },
        },
        
    },
    "definitions": {
        "daily_schedule": {
            "type": "object",
            "properties": {
                "date": {"type": "string", "format": "date-time"},
                "start_time": {
                    "type": "string",
                    "pattern": "^\\d{2}:\\d{2}:\\d{2}$",
                },
                "end_time": {
                    "type": "string",
                    "pattern": "^\\d{2}:\\d{2}:\\d{2}$",
                },
                "notes": {"type": ["string", "null"]},
            },
            "required": ["date", "start_time", "end_time", "notes"],
        }
    },
}

# TODO: Make a prompt to make sure the schedule generated is consistent with piller preferences add a validation system
GENERATE_ACTION_PLAN_WITH_SCHEDULE_SYSTEM_PROMPT = """
You are a health and fitness planning assistant.
Given a health goal, user context, and user time preferences for different health pillars, generate a JSON object that strictly follows the ActionPlanWithSchedule schema below.
Generate 2-3 action items in the action_items array. Only include the fields and structure defined in the schema—do not add any extra fields.

ActionPlanWithSchedule schema:
{{
    "action_items": [
        {{
            "title": "string",
            "description": "string",
            "priority": "high | medium | low",
            "weekly_schedule": {{
                "monday": {{ "date": "string", "start_time": "string", "end_time": "string", "notes": "string or null" }},
                "tuesday": {{ ... }},
                "wednesday": {{ ... }},
                "thursday": {{ ... }},
                "friday": {{ ... }},
                "saturday": {{ ... }},
                "sunday": {{ ... }}
            }}
        }},
        {{
            "title": "string",
            "description": "string",
            "priority": "high | medium | low",
            "weekly_schedule": {{
                "monday": {{ "date": "string", "start_time": "string", "end_time": "string", "notes": "string or null" }},
                "tuesday": {{ ... }},
                "wednesday": {{ ... }},
                "thursday": {{ ... }},
                "friday": {{ ... }},
                "saturday": {{ ... }},
                "sunday": {{ ... }}
            }}
        }}
        // Optionally add a third example
    ]
}}
Return only the JSON object.
"""

GENERATE_ACTION_PLAN_WITH_SCHEDULE_USER_PROMPT = """
Goal: {goal_title} - {goal_description}
Medical Context: {medical_context}
Lifestyle Factors: {lifestyle_factors}
Risk Factors: {risk_factors}
User Pillar Preferences:
{pillar_preferences}
"""
