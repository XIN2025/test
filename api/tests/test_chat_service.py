import pytest
from unittest.mock import MagicMock, AsyncMock, patch
from app.services.ai_services.chat_service import ChatService

@pytest.mark.integration
class TestChatServiceIntegration:

    @pytest.mark.asyncio
    async def test_complete_chat_workflow(self, mock_config, mock_chat_prompts):
        mock_llm = MagicMock()
        mock_vector_store = MagicMock()
        mock_db = MagicMock()

        mock_vector_store.search = MagicMock(return_value=[
            {"text": "Patient has hypertension."},
            {"text": "Prescribed Lisinopril 10mg."}
        ])

        user_collection = MagicMock()
        async def mock_find_one(query):
            return {
                "email": "test@example.com",
                "name": "John Doe",
                "date_of_birth": "1990-05-15",
                "blood_type": "O+"
            }
        user_collection.find_one = mock_find_one
        mock_db.__getitem__ = MagicMock(return_value=user_collection)

        response_mock = MagicMock()
        response_mock.content = "You are taking Lisinopril 10mg for hypertension."

        follow_up_mock = MagicMock()
        follow_up_mock.content = "- What are the side effects?\n- When to take it?"

        mock_llm.invoke = MagicMock(side_effect=[response_mock, follow_up_mock])

        with patch('app.services.ai_services.chat_service.ChatOpenAI', return_value=mock_llm), \
             patch('app.services.ai_services.chat_service.get_vector_store', return_value=mock_vector_store), \
             patch('app.services.ai_services.chat_service.get_db', return_value=mock_db):
            
            service = ChatService()
            result = await service.chat("What is my medication?", "test@example.com")
            
            assert result["success"] is True
            assert "Lisinopril" in result["response"]
            assert len(result["follow_up_questions"]) > 0
            assert result["context_used"] == 2
            
            mock_vector_store.search.assert_called_once()
            assert mock_llm.invoke.call_count == 2

    @pytest.mark.asyncio
    async def test_workflow_with_no_context(self, mock_config, mock_chat_prompts):
        mock_llm = MagicMock()
        mock_vector_store = MagicMock()
        mock_db = MagicMock()

        mock_vector_store.search = MagicMock(return_value=[])

        user_collection = MagicMock()
        async def mock_find_one(query):
            return {
                "email": "test@example.com",
                "name": "John Doe",
                "date_of_birth": "1990-05-15",
                "blood_type": "O+"
            }
        user_collection.find_one = mock_find_one
        mock_db.__getitem__ = MagicMock(return_value=user_collection)

        response_mock = MagicMock()
        response_mock.content = "I don't have enough information to answer that."

        follow_up_mock = MagicMock()
        follow_up_mock.content = ""

        mock_llm.invoke = MagicMock(side_effect=[response_mock, follow_up_mock])

        with patch('app.services.ai_services.chat_service.ChatOpenAI', return_value=mock_llm), \
             patch('app.services.ai_services.chat_service.get_vector_store', return_value=mock_vector_store), \
             patch('app.services.ai_services.chat_service.get_db', return_value=mock_db):
            
            service = ChatService()
            result = await service.chat("What is my medication?", "test@example.com")

            assert result["success"] is True
            assert result["context_used"] == 0
            assert "information" in result["response"].lower()

    @pytest.mark.asyncio
    async def test_workflow_with_missing_user(self, mock_config, mock_chat_prompts):
        mock_llm = MagicMock()
        mock_vector_store = MagicMock()
        mock_db = MagicMock()

        mock_vector_store.search = MagicMock(return_value=[{"text": "Some medical context"}])

        user_collection = MagicMock()
        async def mock_find_one(query):
            return None
        user_collection.find_one = mock_find_one
        mock_db.__getitem__ = MagicMock(return_value=user_collection)

        response_mock = MagicMock()
        response_mock.content = "Based on available information..."

        follow_up_mock = MagicMock()
        follow_up_mock.content = "- Question 1?"

        mock_llm.invoke = MagicMock(side_effect=[response_mock, follow_up_mock])

        with patch('app.services.ai_services.chat_service.ChatOpenAI', return_value=mock_llm), \
             patch('app.services.ai_services.chat_service.get_vector_store', return_value=mock_vector_store), \
             patch('app.services.ai_services.chat_service.get_db', return_value=mock_db):
            
            service = ChatService()
            result = await service.chat("Test query", "nonexistent@example.com")

            assert result["success"] is True
            assert result["context_used"] == 1

    @pytest.mark.asyncio
    async def test_workflow_with_vector_store_error(self, mock_config, mock_chat_prompts):
        mock_llm = MagicMock()
        mock_vector_store = MagicMock()
        mock_db = MagicMock()

        mock_vector_store.search = MagicMock(side_effect=Exception("Vector store connection failed"))

        user_collection = MagicMock()
        async def mock_find_one(query):
            return {
                "email": "test@example.com",
                "name": "John Doe",
                "date_of_birth": "1990-05-15",
                "blood_type": "O+"
            }
        user_collection.find_one = mock_find_one
        mock_db.__getitem__ = MagicMock(return_value=user_collection)

        response_mock = MagicMock()
        response_mock.content = "I can help with general information."

        follow_up_mock = MagicMock()
        follow_up_mock.content = ""

        mock_llm.invoke = MagicMock(side_effect=[response_mock, follow_up_mock])

        with patch('app.services.ai_services.chat_service.ChatOpenAI', return_value=mock_llm), \
             patch('app.services.ai_services.chat_service.get_vector_store', return_value=mock_vector_store), \
             patch('app.services.ai_services.chat_service.get_db', return_value=mock_db):
            
            service = ChatService()
            result = await service.chat("Test query", "test@example.com")

            assert result["success"] is True
            assert result["context_used"] == 0
            assert "Context retrieval failed" in result["reasoning"]

    @pytest.mark.asyncio
    async def test_workflow_with_database_error(self, mock_config, mock_chat_prompts):
        mock_llm = MagicMock()
        mock_vector_store = MagicMock()
        mock_db = MagicMock()

        mock_vector_store.search = MagicMock(return_value=[{"text": "Medical context"}])

        user_collection = MagicMock()
        async def mock_find_one(query):
            raise Exception("Database connection failed")
        user_collection.find_one = mock_find_one
        mock_db.__getitem__ = MagicMock(return_value=user_collection)

        response_mock = MagicMock()
        response_mock.content = "Response without user context"

        follow_up_mock = MagicMock()
        follow_up_mock.content = "- Follow up?"

        mock_llm.invoke = MagicMock(side_effect=[response_mock, follow_up_mock])

        with patch('app.services.ai_services.chat_service.ChatOpenAI', return_value=mock_llm), \
             patch('app.services.ai_services.chat_service.get_vector_store', return_value=mock_vector_store), \
             patch('app.services.ai_services.chat_service.get_db', return_value=mock_db):
            
            service = ChatService()
            result = await service.chat("Test query", "test@example.com")

            assert result["success"] is True
            assert result["context_used"] == 1

    @pytest.mark.asyncio
    async def test_workflow_with_llm_error(self, mock_config, mock_chat_prompts):
        mock_llm = MagicMock()
        mock_vector_store = MagicMock()
        mock_db = MagicMock()

        mock_vector_store.search = MagicMock(return_value=[{"text": "Context"}])

        user_collection = MagicMock()
        async def mock_find_one(query):
            return {"email": "test@example.com", "name": "John Doe"}
        user_collection.find_one = mock_find_one
        mock_db.__getitem__ = MagicMock(return_value=user_collection)

        mock_llm.invoke = MagicMock(side_effect=Exception("API rate limit exceeded"))

        with patch('app.services.ai_services.chat_service.ChatOpenAI', return_value=mock_llm), \
             patch('app.services.ai_services.chat_service.get_vector_store', return_value=mock_vector_store), \
             patch('app.services.ai_services.chat_service.get_db', return_value=mock_db):
            
            service = ChatService()
            result = await service.chat("Test query", "test@example.com")

            assert result["success"] is True
            assert "sorry" in result["response"].lower() or "error" in result["response"].lower()

    @pytest.mark.asyncio
    async def test_streaming_workflow(self, mock_config, mock_chat_prompts):
        mock_llm = MagicMock()
        mock_vector_store = MagicMock()
        mock_db = MagicMock()

        mock_vector_store.search = MagicMock(return_value=[{"text": "Context"}])

        user_collection = MagicMock()
        async def mock_find_one(query):
            return {"email": "test@example.com", "name": "Test"}
        user_collection.find_one = mock_find_one
        mock_db.__getitem__ = MagicMock(return_value=user_collection)

        response_mock = MagicMock()
        response_mock.content = "Streaming response"

        follow_up_mock = MagicMock()
        follow_up_mock.content = "- Question?"

        mock_llm.invoke = MagicMock(side_effect=[response_mock, follow_up_mock])

        with patch('app.services.ai_services.chat_service.ChatOpenAI', return_value=mock_llm), \
             patch('app.services.ai_services.chat_service.get_vector_store', return_value=mock_vector_store), \
             patch('app.services.ai_services.chat_service.get_db', return_value=mock_db):
            
            service = ChatService()

            async def mock_astream(state):
                yield {"response_generation": {"response": "Streaming response"}}
                yield {"follow_up_generation": {"follow_up_questions": ["Question?"]}}

            service.graph.astream = mock_astream

            events = []
            async for event in service.chat_stream("Test", "test@example.com"):
                events.append(event)

            assert len(events) >= 1
            assert any(e["type"] == "response_chunk" for e in events)

@pytest.mark.integration
@pytest.mark.asyncio
class TestMultipleQueries:

    async def test_multiple_sequential_queries(self, mock_config, mock_chat_prompts):
        mock_llm = MagicMock()
        mock_vector_store = MagicMock()
        mock_db = MagicMock()

        mock_vector_store.search = MagicMock(return_value=[{"text": "Medical context"}])

        user_collection = MagicMock()
        async def mock_find_one(query):
            return {
                "email": "test@example.com",
                "name": "Test User"
            }
        user_collection.find_one = mock_find_one
        mock_db.__getitem__ = MagicMock(return_value=user_collection)

        responses = [
            MagicMock(content="Response 1"),
            MagicMock(content="- Follow up 1"),
            MagicMock(content="Response 2"),
            MagicMock(content="- Follow up 2"),
            MagicMock(content="Response 3"),
            MagicMock(content="- Follow up 3")
        ]
        mock_llm.invoke = MagicMock(side_effect=responses)

        with patch('app.services.ai_services.chat_service.ChatOpenAI', return_value=mock_llm), \
             patch('app.services.ai_services.chat_service.get_vector_store', return_value=mock_vector_store), \
             patch('app.services.ai_services.chat_service.get_db', return_value=mock_db):
            
            service = ChatService()

            result1 = await service.chat("Query 1", "test@example.com")
            result2 = await service.chat("Query 2", "test@example.com")
            result3 = await service.chat("Query 3", "test@example.com")

            assert result1["success"] is True
            assert result2["success"] is True
            assert result3["success"] is True

            assert mock_llm.invoke.call_count == 6
