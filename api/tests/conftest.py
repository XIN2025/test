import pytest
import sys
from unittest.mock import MagicMock

def pytest_configure(config):
    import app.services.backend_services.db
    app.services.backend_services.db.get_db = lambda: {
        "goals": MagicMock(),
        "action_items": MagicMock(),
        "weekly_reflections": MagicMock(),
        "users": MagicMock(),
        "health_data": MagicMock(),
        "nudges": MagicMock(),
        "health_alerts": MagicMock(),
    }

@pytest.fixture(autouse=True)
def global_mocks(monkeypatch):
    monkeypatch.setattr("app.services.ai_services.goals_service.get_db", lambda: {"goals": MagicMock(), "action_items": MagicMock(), "weekly_reflections": MagicMock()})
    monkeypatch.setattr("app.services.ai_services.chat_service.get_db", lambda: {"users": MagicMock()})
    monkeypatch.setattr("app.services.ai_services.goals_service.get_vector_store", lambda: MagicMock())
    monkeypatch.setattr("app.services.ai_services.chat_service.get_vector_store", lambda: MagicMock())
    monkeypatch.setattr("app.services.backend_services.nudge_service.NudgeService", lambda: MagicMock())
    monkeypatch.setattr("app.services.ai_services.chat_service.ChatOpenAI", lambda *args, **kwargs: MagicMock())
    monkeypatch.setattr("app.services.backend_services.health_alert_service.ChatOpenAI", lambda *args, **kwargs: MagicMock())
    monkeypatch.setattr("app.utils.ai.prompts.ChatPrompts.get_query_classification_prompt", lambda query: "classification prompt")
    monkeypatch.setattr("app.utils.ai.prompts.ChatPrompts.get_medical_rag_prompt", lambda medical_history, query, personal_info: "medical rag prompt")
    monkeypatch.setattr("app.utils.ai.prompts.ChatPrompts.get_follow_up_questions_prompt", lambda query, response: "follow up prompt")
