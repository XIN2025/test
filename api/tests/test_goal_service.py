import pytest
from unittest.mock import AsyncMock, MagicMock
from app.services.ai_services.goals_service import GoalsService
from app.schemas.ai.goals import Goal, GoalCreate, WeeklyReflectionCreate, WeeklyReflection
from bson import ObjectId
from datetime import datetime, timezone

@pytest.fixture
def goals_service():
	return GoalsService()

@pytest.mark.asyncio
async def test_create_goal(goals_service):
	goal_data = Goal(
		id=str(ObjectId()),
		user_email="test@example.com",
		title="Test Goal",
		description="Test Description",
		priority="high",
		category="health",
		created_at=datetime.now(timezone.utc)
	)
	mock_result = MagicMock(inserted_id=ObjectId())
	goals_service.goals_collection.insert_one = AsyncMock(return_value=mock_result)
	result = await goals_service.create_goal(goal_data)
	assert isinstance(result, Goal)
	assert result.title == "Test Goal"

@pytest.mark.asyncio
async def test_get_user_goals(goals_service):
	goal_id = ObjectId()
	mock_goal = {
		"_id": goal_id,
		"user_email": "test@example.com",
		"title": "Test Goal",
		"description": "Test Description",
		"priority": "high",
		"category": "health",
		"created_at": datetime.now(timezone.utc)
	}
	goals_service.goals_collection.find = MagicMock(return_value=MagicMock(to_list=AsyncMock(return_value=[mock_goal])))
	goals_service.action_items_collection.find = MagicMock(return_value=MagicMock(to_list=AsyncMock(return_value=[])))
	result = await goals_service.get_user_goals("test@example.com")
	assert isinstance(result, list)
	assert result[0].title == "Test Goal"

@pytest.mark.asyncio
async def test_get_goal_by_id(goals_service):
	goal_id = ObjectId()
	mock_goal = {
		"_id": goal_id,
		"user_email": "test@example.com",
		"title": "Test Goal",
		"description": "Test Description",
		"priority": "high",
		"category": "health",
		"created_at": datetime.now(timezone.utc)
	}
	goals_service.goals_collection.find_one = AsyncMock(return_value=mock_goal)
	result = await goals_service.get_goal_by_id(str(goal_id), "test@example.com")
	assert isinstance(result, Goal)
	assert result.id == str(goal_id)

@pytest.mark.asyncio
async def test_delete_goal(goals_service):
    goal_id = ObjectId()
    mock_goal_delete = MagicMock(deleted_count=1)
    mock_action_items_delete = MagicMock(deleted_count=2) 
    goals_service.goals_collection.delete_one = AsyncMock(return_value=mock_goal_delete)
    goals_service.action_items_collection.delete_many = AsyncMock(return_value=mock_action_items_delete)
    result = await goals_service.delete_goal(str(goal_id), "test@example.com")
    assert result is True
    goals_service.goals_collection.delete_one.assert_called_once_with({
        "_id": ObjectId(str(goal_id)), 
        "user_email": "test@example.com"
    })
    goals_service.action_items_collection.delete_many.assert_called_once_with({
        "goal_id": str(goal_id), 
        "user_email": "test@example.com"
    })

@pytest.mark.asyncio
async def test_save_weekly_reflection(goals_service):
	reflection_create = WeeklyReflectionCreate(
		user_email="test@example.com",
		rating=5,
		reflection="Great week!"
	)
	mock_result = MagicMock(inserted_id=ObjectId())
	goals_service.reflections_collection.insert_one = AsyncMock(return_value=mock_result)
	result = await goals_service.save_weekly_reflection(reflection_create)
	assert isinstance(result, WeeklyReflection)
	assert result.rating == 5
