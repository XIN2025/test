#!/usr/bin/env python3
"""
Quick test script to verify weekly completion functionality
"""

import sys
import asyncio
from datetime import datetime, date
from app.services.ai_services.goals_service import GoalsService
from app.schemas.backend.action_completions import ActionItemCompletionCreate

async def test_weekly_completion_update():
    """Test that weekly completion status gets updated when marking items complete"""
    print("Testing weekly completion update...")
    
    # Test parameters (replace with actual values from your data)
    user_email = "test@example.com"
    goal_id = "test-goal-id"  # Replace with an actual goal ID
    action_item_title = "Test Action Item"  # Replace with actual action item title
    
    try:
        goals_service = GoalsService()
        
        # Create completion data
        completion_data = ActionItemCompletionCreate(
            goal_id=goal_id,
            action_item_title=action_item_title,
            completion_date=date.today(),
            completed=True,
            notes="Test completion"
        )
        
        print(f"Marking completion for: {action_item_title}")
        
        # Mark the item as complete
        result = await goals_service.mark_action_item_completion(user_email, completion_data)
        
        print(f"Completion marked successfully: {result.dict()}")
        
        # Check if the action plan was updated
        action_plan = goals_service.action_plans_collection.find_one({
            "goal_id": goal_id,
            "user_email": user_email
        })
        
        if action_plan:
            print("Found action plan!")
            action_items = action_plan.get("action_items", [])
            
            for action_item in action_items:
                if action_item.get("title") == action_item_title:
                    print(f"Found matching action item: {action_item_title}")
                    weekly_completion = action_item.get("weekly_completion", [])
                    print(f"Weekly completion entries: {len(weekly_completion)}")
                    
                    for completion in weekly_completion:
                        print(f"  Week {completion.get('week_start')}: {completion.get('is_complete')}")
                    
                    break
            else:
                print(f"Action item {action_item_title} not found in action plan")
        else:
            print("No action plan found")
        
        return True
        
    except Exception as e:
        print(f"Test failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    print("Running weekly completion update test...\n")
    
    # You need to replace the test parameters above with actual values
    print("Note: Update the test parameters (user_email, goal_id, action_item_title) with actual values from your database")
    print("Then run this script to test the weekly completion update functionality")
    
    # Uncomment the following lines after updating the test parameters
    # success = asyncio.run(test_weekly_completion_update())
    # 
    # if success:
    #     print("\n✅ Weekly completion update test passed!")
    # else:
    #     print("\n❌ Weekly completion update test failed!")
