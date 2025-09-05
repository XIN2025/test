#!/usr/bin/env python3
"""
Test script to verify the weekly completion functionality
"""

import sys
import json
from datetime import datetime, timedelta
from app.schemas.ai.planner import ActionItem, TimeEstimate, ActionPriority, WeeklyCompletionStatus
from app.services.ai_services.planner_service import PlannerService
from app.schemas.ai.goals import Goal

def test_weekly_completion_initialization():
    """Test that action items are created with weekly completion status"""
    print("Testing weekly completion initialization...")
    
    # Create a mock goal
    goal = Goal(
        id="test-goal-123",
        title="Test Goal",
        description="Test goal for weekly completion",
        category="health",
        priority="high",
        target_value=100,
        current_value=0,
        target_date=datetime.now() + timedelta(days=30),
        user_email="test@example.com"
    )
    
    # Create planner service
    planner_service = PlannerService()
    
    try:
        # Test the _parse_iso_duration method
        duration_15m = planner_service._parse_iso_duration("PT15M")
        duration_1h = planner_service._parse_iso_duration("PT1H")
        duration_30m = planner_service._parse_iso_duration("PT30M")
        
        print(f"✓ Duration parsing works: PT15M = {duration_15m}, PT1H = {duration_1h}, PT30M = {duration_30m}")
        
        # Test weekly completion status initialization
        action_items = [
            ActionItem(
                title="Morning Walk",
                description="Take a 30-minute morning walk",
                priority=ActionPriority.HIGH,
                time_estimate=TimeEstimate(
                    min_duration=duration_15m,
                    max_duration=duration_30m,
                    recommended_frequency="daily"
                ),
                prerequisites=[],
                success_criteria=["Complete 30 minutes of walking"],
                adaptation_notes=[]
            )
        ]
        
        # Initialize weekly completion status
        updated_action_items = planner_service._initialize_weekly_completion_status(action_items)
        
        # Verify the weekly completion status was added
        assert len(updated_action_items) == 1
        action_item = updated_action_items[0]
        assert hasattr(action_item, 'weekly_completion')
        assert len(action_item.weekly_completion) == 4  # 4 weeks
        
        # Verify each week has the correct structure
        for i, week_completion in enumerate(action_item.weekly_completion):
            assert isinstance(week_completion, WeeklyCompletionStatus)
            assert hasattr(week_completion, 'week_start')
            assert hasattr(week_completion, 'is_complete')
            assert week_completion.is_complete == False  # Should start as not complete
            print(f"  Week {i+1}: {week_completion.week_start.strftime('%Y-%m-%d')} - Complete: {week_completion.is_complete}")
        
        print("✓ Weekly completion initialization successful!")
        
        # Test serialization (important for database storage)
        serialized = action_item.dict()
        assert 'weekly_completion' in serialized
        print("✓ Action item serialization works with weekly completion")
        
        return True
        
    except Exception as e:
        print(f"✗ Test failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

def test_weekly_completion_json():
    """Test JSON serialization of weekly completion data"""
    print("\nTesting JSON serialization...")
    
    try:
        # Create a sample weekly completion status
        week_completion = WeeklyCompletionStatus(
            week_start=datetime.now(),
            is_complete=True
        )
        
        # Test serialization
        serialized = week_completion.dict()
        print(f"✓ WeeklyCompletionStatus serializes to: {json.dumps(serialized, default=str)}")
        
        # Test deserialization
        reconstructed = WeeklyCompletionStatus(**serialized)
        assert reconstructed.is_complete == week_completion.is_complete
        print("✓ WeeklyCompletionStatus deserialization works")
        
        return True
        
    except Exception as e:
        print(f"✗ JSON test failed: {str(e)}")
        return False

if __name__ == "__main__":
    print("Running weekly completion tests...\n")
    
    success = True
    success &= test_weekly_completion_initialization()
    success &= test_weekly_completion_json()
    
    if success:
        print("\n🎉 All tests passed! Weekly completion functionality is working correctly.")
        sys.exit(0)
    else:
        print("\n❌ Some tests failed. Please check the implementation.")
        sys.exit(1)
