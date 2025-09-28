
import pytest
from unittest.mock import AsyncMock, MagicMock
from app.services.backend_services.health_alert_service import HealthAlertService
from app.schemas.backend.health_alert import HealthDataScore
from bson import ObjectId

@pytest.fixture
def health_alert_service():
    return HealthAlertService()


@pytest.mark.asyncio
async def test_get_latest_health_data_by_user_email_none(health_alert_service):
    health_alert_service.health_data_collection.find_one = AsyncMock(return_value=None)
    result = await health_alert_service.get_latest_health_data_by_user_email(
        "test@example.com"
    )
    assert result is None


@pytest.mark.asyncio
async def test_get_active_health_alerts_returns_alerts(health_alert_service):
    object_id = ObjectId()
    mock_alert_dict = {
        "_id": object_id,
        "user_email": "test@example.com",
        "health_data_id": "healthdataid",
        "metric": "steps",
        "title": "Test Alert",
        "key_point": "Test Key Point",
        "message": "Test alert message",
        "status": "active",
        "severity": "high",
        "created_at": "2024-06-01T00:00:00Z",
    }
    health_alert_service.health_alert_collection.find = MagicMock(
        return_value=MagicMock(to_list=AsyncMock(return_value=[mock_alert_dict]))
    )
    result = await health_alert_service.get_active_health_alerts("test@example.com")
    assert isinstance(result, list)
    assert result[0].id == str(object_id)


@pytest.mark.asyncio
async def test_mark_health_alert_resolve_success(health_alert_service):
    object_id = ObjectId()
    mock_update = AsyncMock(return_value=MagicMock(modified_count=1))
    health_alert_service.health_alert_collection.update_one = mock_update
    result = await health_alert_service.mark_health_alert_resolve(str(object_id))
    assert result is True


@pytest.mark.asyncio
async def test_mark_health_alert_resolve_failure(health_alert_service):
    mock_update = AsyncMock(return_value=MagicMock(modified_count=0))
    health_alert_service.health_alert_collection.update_one = mock_update
    result = await health_alert_service.mark_health_alert_resolve(str(ObjectId()))
    assert result is False


@pytest.mark.asyncio
async def test_score_health_data(health_alert_service):
    mock_health_data = MagicMock(id="healthdataid")
    mock_response = MagicMock(score=85, reasons=["reason1", "reason2"])
    health_alert_service.llm.with_structured_output = MagicMock(
        return_value=MagicMock(ainvoke=AsyncMock(return_value=mock_response))
    )
    health_alert_service.prompts.get_health_data_score_prompt = MagicMock(
        return_value="prompt"
    )
    result = await health_alert_service.score_health_data(mock_health_data)
    assert isinstance(result, HealthDataScore)
    assert result.score == 85
    assert "reason1" in result.reasons


@pytest.mark.asyncio
async def test_get_previous_health_alerts(health_alert_service):
    object_id = ObjectId()
    health_data_id = ObjectId()
    mock_alert_dict = {
        "_id": object_id,
        "user_email": "test@example.com",
        "health_data_id": str(health_data_id),
        "metric": "steps",
        "title": "Test Alert",
        "key_point": "Test Key Point",
        "message": "Test alert message",
        "status": "active",
        "severity": "high",
        "created_at": "2024-06-01T00:00:00Z",
    }
    health_alert_service.health_alert_collection.find = MagicMock(
        return_value=MagicMock(to_list=AsyncMock(return_value=[mock_alert_dict]))
    )
    result = await health_alert_service._get_previous_health_alerts(str(health_data_id))
    assert isinstance(result, list)
    assert result[0].id == str(object_id)
