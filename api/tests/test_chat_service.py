
import pytest
from unittest.mock import AsyncMock, MagicMock
from app.services.ai_services.chat_service import ChatService, ChatState

@pytest.fixture
def chat_service():
	return ChatService()

@pytest.mark.asyncio
async def test_chat_success(chat_service):
	chat_service.graph.ainvoke = AsyncMock(return_value={
		"response": "Test response",
		"follow_up_questions": ["Q1", "Q2"],
		"context": ["context1", "context2"],
		"reasoning": "Test reasoning"
	})
	result = await chat_service.chat("test query", "test@example.com")
	assert result["success"] is True
	assert result["response"] == "Test response"
	assert "Q1" in result["follow_up_questions"]

@pytest.mark.asyncio
async def test_query_classifier_node(chat_service):
	state = ChatState(query="test", context=[], user_email="test@example.com")
	chat_service.llm.invoke = MagicMock(return_value=MagicMock(content="rag"))
	result = await chat_service._query_classifier_node(state)
	assert result["should_use_rag"] is True
	assert "classified as rag" in result["reasoning"]

@pytest.mark.asyncio
async def test_context_retrieval_node(chat_service):
	state = ChatState(query="test", context=[], user_email="test@example.com")
	chat_service.vector_store.search = MagicMock(return_value=[{"text": "context1"}, {"text": "context2"}])
	result = await chat_service._context_retrieval_node(state)
	assert len(result["context"]) == 2
	assert "context1" in result["context"]

@pytest.mark.asyncio
async def test_response_generation_node(chat_service):
	state = ChatState(query="test", context=["context1"], user_email="test@example.com")
	chat_service.user_collection.find_one = AsyncMock(return_value={
		"name": "Test User",
		"date_of_birth": "2000-01-01",
		"blood_type": "O+"
	})
	chat_service.llm.invoke = MagicMock(return_value=MagicMock(content="response text"))
	result = await chat_service._response_generation_node(state)
	assert "response text" in result["response"]

@pytest.mark.asyncio
async def test_follow_up_generation_node(chat_service):
	state = ChatState(query="test", context=[], user_email="test@example.com", response="response")
	chat_service.llm.invoke = MagicMock(return_value=MagicMock(content="Q1\nQ2\nQ3"))
	result = await chat_service._follow_up_generation_node(state)
	assert "Q1" in result["follow_up_questions"]
