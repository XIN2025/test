import pytest
import asyncio
import sys
import os
from unittest.mock import Mock, AsyncMock, patch
from datetime import datetime

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()

@pytest.fixture(autouse=True)
def reset_singletons():
    import app.services.ai_services.chat_service as chat_module
    chat_module.chat_service = None
    yield

@pytest.fixture
def mock_openai_api_key(monkeypatch):
    monkeypatch.setenv("OPENAI_API_KEY", "test-api-key")
    return "test-api-key"

@pytest.fixture
def mock_config(monkeypatch):
    monkeypatch.setattr("app.services.ai_services.chat_service.OPENAI_API_KEY", "test-api-key")
    monkeypatch.setattr("app.services.ai_services.chat_service.LLM_MODEL", "gpt-4")
    monkeypatch.setattr("app.services.ai_services.chat_service.LLM_TEMPERATURE", "0.7")

@pytest.fixture
def mock_chat_prompts():
    with patch('app.services.ai_services.chat_service.ChatPrompts') as mock:
        mock.get_medical_rag_prompt.return_value = "Mocked RAG prompt"
        mock.get_follow_up_questions_prompt.return_value = "Mocked follow-up prompt"
        yield mock

@pytest.fixture
def sample_user_data():
    return {
        "email": "test@example.com",
        "name": "John Doe",
        "date_of_birth": "1990-05-15",
        "blood_type": "O+",
        "medical_history": [
            {
                "condition": "Hypertension",
                "diagnosed_date": "2020-01-15",
                "status": "active"
            }
        ]
    }

@pytest.fixture
def sample_medical_documents():
    return [
        {
            "text": "Patient has a history of hypertension diagnosed in 2020.",
            "source": "medical_record",
            "date": "2020-01-15"
        },
        {
            "text": "Currently prescribed Lisinopril 10mg once daily.",
            "source": "prescription",
            "date": "2024-01-20"
        },
        {
            "text": "Blood pressure readings have been stable at 120/80.",
            "source": "vitals",
            "date": "2024-01-25"
        },
        {
            "text": "Patient advised to monitor blood pressure daily.",
            "source": "care_plan",
            "date": "2024-01-20"
        }
    ]

@pytest.fixture
def mock_llm_response():
    def _create_response(content: str):
        response = Mock()
        response.content = content
        return response
    return _create_response

@pytest.fixture
def mock_vector_store_empty():
    vector_store = Mock()
    vector_store.search = Mock(return_value=[])
    return vector_store

@pytest.fixture
def mock_vector_store_with_results(sample_medical_documents):
    vector_store = Mock()
    vector_store.search = Mock(return_value=sample_medical_documents)
    return vector_store

@pytest.fixture
def mock_db_with_user(sample_user_data):
    db = Mock()
    user_collection = Mock()
    async def mock_find_one(query):
        if query.get("email") == sample_user_data["email"]:
            return sample_user_data
        return None
    user_collection.find_one = mock_find_one
    db.__getitem__ = Mock(return_value=user_collection)
    return db

@pytest.fixture
def mock_db_empty():
    db = Mock()
    user_collection = Mock()
    async def mock_find_one(query):
        return None
    user_collection.find_one = mock_find_one
    db.__getitem__ = Mock(return_value=user_collection)
    return db

@pytest.fixture
def mock_logger():
    with patch('app.services.ai_services.chat_service.logger') as mock_log:
        yield mock_log

@pytest.fixture
def freeze_time():
    frozen_date = datetime(2024, 1, 30, 12, 0, 0)
    with patch('app.services.ai_services.chat_service.date') as mock_date:
        mock_date.today.return_value = frozen_date.date()
        mock_date.side_effect = lambda *args, **kw: datetime(*args, **kw).date()
        yield frozen_date

@pytest.fixture
def sample_queries():
    return {
        "medication": "What medications am I currently taking?",
        "diagnosis": "What are my current diagnoses?",
        "vitals": "What are my recent vital signs?",
        "appointments": "When is my next appointment?",
        "general": "How can I improve my health?",
        "empty": "",
        "special_chars": "What's my <test> medication & [dosage]?",
        "long": "What is my medication? " * 100
    }

@pytest.fixture
def sample_responses():
    return {
        "medication": "Based on your medical records, you are currently taking Lisinopril 10mg once daily for hypertension.",
        "error": "I'm sorry, but I encountered an error while processing your request.",
        "no_info": "I don't have enough information to answer that question.",
        "follow_up": """- What are the side effects of this medication?
- When should I take my medication?
- How long do I need to stay on this medication?
- Can I stop taking it if I feel better?"""
    }

@pytest.fixture
def complete_chat_workflow_mock():
    def _create_workflow_result(query, user_email, response_text, num_context=3):
        return {
            "query": query,
            "user_email": user_email,
            "context": [f"Context {i}" for i in range(num_context)],
            "response": response_text,
            "follow_up_questions": [
                "Follow-up question 1?",
                "Follow-up question 2?",
                "Follow-up question 3?"
            ],
            "reasoning": f"Retrieved {num_context} relevant text chunks from vector store."
        }
    return _create_workflow_result

def pytest_configure(config):
    config.addinivalue_line("markers", "unit: Unit tests")
    config.addinivalue_line("markers", "integration: Integration tests")
    config.addinivalue_line("markers", "slow: Slow running tests")
    config.addinivalue_line("markers", "asyncio: Async tests")

class CustomAssertions:
    @staticmethod
    def assert_valid_chat_response(response):
        assert "success" in response
        assert "response" in response
        assert "follow_up_questions" in response
        if response["success"]:
            assert isinstance(response["response"], str)
            assert isinstance(response["follow_up_questions"], list)
            assert "context_used" in response
    
    @staticmethod
    def assert_valid_chat_state(state):
        required_fields = ["query", "user_email", "context", "response", "follow_up_questions", "reasoning"]
        for field in required_fields:
            assert field in state, f"Missing required field: {field}"
    
    @staticmethod
    def assert_follow_up_questions_format(questions):
        assert isinstance(questions, list)
        assert len(questions) <= 4
        for q in questions:
            assert isinstance(q, str)
            assert len(q) > 0
            assert not q.startswith("-")
            assert not q.startswith("*")

@pytest.fixture
def custom_assertions():
    return CustomAssertions()

@pytest.fixture(autouse=True)
def cleanup_after_test():
    yield
    pass

@pytest.fixture
def performance_tracker():
    import time
    
    class PerformanceTracker:
        def __init__(self):
            self.start_time = None
            self.end_time = None
        
        def start(self):
            self.start_time = time.time()
        
        def stop(self):
            self.end_time = time.time()
        
        def get_duration(self):
            if self.start_time and self.end_time:
                return self.end_time - self.start_time
            return None
    
    return PerformanceTracker()

@pytest.fixture(autouse=True)
def mock_env_vars(monkeypatch):
    monkeypatch.setenv("OPENAI_API_KEY", "test-api-key")
    monkeypatch.setenv("MONGODB_URI", "mongodb://localhost:27017/test")
    monkeypatch.setenv("DATABASE_NAME", "test_db")
