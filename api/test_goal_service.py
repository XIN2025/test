import asyncio
import os
from datetime import datetime, time
from app.schemas.goals import GoalCreate, GoalCategory, GoalPriority
from app.schemas.preferences import PillarTimePreferences, TimePreference, PillarType
from app.schemas.diagnosis import DiagnosisRequest
from app.services.goals_service import GoalsService
from app.services.db import get_db
from app.services.vector_store import get_vector_store
from app.services.document_processor import get_document_processor

async def test_goal_planning():
    # Initialize services
    goals_service = GoalsService()
    db = get_db()
    vector_store = get_vector_store()
    doc_processor = get_document_processor(llm_provider="gemini")
    
    # Process medical case with Gemini
    print("\n📋 Processing medical case data with Gemini...")
    case_file_path = os.path.join(os.path.dirname(__file__), "data", "patient_case.txt")
    with open(case_file_path, 'r') as f:
        case_content = f.read()
    
    result = doc_processor.process_text_file(case_content, "patient_case.txt")
    if result["success"]:
        print(f"✅ Processed medical case: {result['entities_count']} entities, {result['relationships_count']} relationships found")
        print("\nExtracted entities:")
        for entity in result["entities"]:
            print(f"  - {entity['name']} ({entity['type']}): {entity['description']}")
        print("\nExtracted relationships:")
        for rel in result["relationships"]:
            print(f"  - {rel['from']} {rel['type']} {rel['to']}: {rel.get('description', '')}")
    else:
        print(f"❌ Failed to process medical case: {result.get('error')}")
    
    # Sync vector store with graph database
    print("\n📥 Syncing vector store with graph database...")
    try:
        entities = db.get_collection("entities").find({})
        for entity in entities:
            node_id = entity["name"]
            text = entity.get("description", entity["name"])
            vector_store.add_node(node_id, text)
        print("✅ Vector store synced successfully")
    except Exception as e:
        print(f"❌ Failed to sync vector store: {str(e)}")
        return
    
    # Create a test goal
    test_goal = GoalCreate(
        title="Exercise More",
        description="I want to increase my physical activity level",
        category=GoalCategory.FITNESS,
        priority=GoalPriority.HIGH,
        user_email="test@example.com",
        target_value=5,
        unit="hours per week"
    )
    
    # Create the goal
    goal = goals_service.create_goal(test_goal)
    print(f"✅ Created goal: {goal.title}")
    
    # Define time preferences
    preferences = PillarTimePreferences(
        user_email="test@example.com",
        preferences={
            PillarType.FITNESS: TimePreference(
                preferred_time=time(8, 0),  # 8:00 AM
                duration_minutes=60,
                days_of_week=[0, 2, 4],  # Monday, Wednesday, Friday
                reminder_before_minutes=15
            )
        }
    )
    
    # Extract symptoms from the processed medical case
    symptoms = [
        entity["name"] for entity in result["entities"] 
        if entity["type"] == "MEDICAL_CONDITION"
    ]
    
    # Generate action plan
    print("\n📋 Generating goal plan...")
    # Create diagnosis request with required fields
    diagnosis_request = DiagnosisRequest(
        user_email=test_goal.user_email,
        symptoms=symptoms,
        contextual_data={
            "goal": goal.model_dump(),
            "entities": result["entities"],
            "relationships": result["relationships"]
        }
    )

    # Generate goal plan
    result = await goals_service.generate_goal_plan(
        goal_id=goal.id,
        user_email=test_goal.user_email,
        pillar_preferences=[preferences],  # The method expects a List[PillarTimePreferences]
    )

    if result["success"]:
        print("✅ Goal plan generated successfully!")
        
        # Print action plan details
        action_plan = result["data"]["action_plan"]
        print("\nAction Items:")
        for item in action_plan["action_items"]:
            print(f"\n🔷 {item['title']}")
            print(f"   Priority: {item['priority']}")
            print(f"   Time: {item['time_estimate']['min_duration']} - {item['time_estimate']['max_duration']}")
            print(f"   Frequency: {item['time_estimate']['recommended_frequency']}")
            
        # Print schedule
        schedule = result["data"]["weekly_schedule"]
        print("\n📅 Weekly Schedule:")
        for day, day_schedule in schedule["daily_schedules"].items():
            if day_schedule["time_slots"]:  # Only print days with activities
                print(f"\n{day.capitalize()}:")
                for slot in day_schedule["time_slots"]:
                    start_time = slot.get("start_time", "??:??")
                    end_time = slot.get("end_time", "??:??")
                    action = slot.get("action_item", "Unknown Activity")
                    print(f"   • {action} ({start_time}-{end_time})")
                    if slot.get("health_notes"):
                        for note in slot["health_notes"]:
                            print(f"     Note: {note}")
    else:
        print(f"❌ Failed to generate plan: {result['message']}")

if __name__ == "__main__":
    asyncio.run(test_goal_planning())
