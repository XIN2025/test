#!/usr/bin/env python3
"""
Simple Health Insights Test Runner
Run this script to test all health insights modules
"""

import asyncio
import sys
import os
from datetime import datetime

# Add the parent directory to Python path to import app modules
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

def test_database():
    """Test MongoDB database connection"""
    print("🔍 Testing Database Connection...")
    try:
        from app.services.backend_services.db import get_db
        
        db = get_db()
        server_info = db.client.server_info()
        
        # Test basic operations
        test_collection = db["test_health_check"]
        test_doc = {"test": "health_insights", "timestamp": datetime.utcnow()}
        
        # Insert, read, delete
        result = test_collection.insert_one(test_doc)
        found_doc = test_collection.find_one({"_id": result.inserted_id})
        test_collection.delete_one({"_id": result.inserted_id})
        
        print(f"✅ Database: Connected (MongoDB v{server_info.get('version')})")
        return True
        
    except Exception as e:
        print(f"❌ Database: Failed - {str(e)}")
        return False

def test_vector_store():
    """Test Vector Store"""
    print("🔍 Testing Vector Store...")
    try:
        from app.services.miscellaneous.vector_store import get_vector_store
        
        vector_store = get_vector_store()
        print(f"✅ Vector Store: {type(vector_store).__name__}")
        return True
        
    except Exception as e:
        print(f"❌ Vector Store: Failed - {str(e)}")
        return False

def test_graph_database():
    """Test Graph Database"""
    print("🔍 Testing Graph Database...")
    try:
        from app.services.miscellaneous.graph_db import get_graph_db
        
        graph_db = get_graph_db()
        print(f"✅ Graph DB: {type(graph_db).__name__}")
        return True
        
    except Exception as e:
        print(f"⚠️  Graph DB: Not available - {str(e)}")
        return False

def test_health_insights_service():
    """Test Health Insights Service"""
    print("🔍 Testing Health Insights Service...")
    try:
        from app.services.ai_services.health_insights_service import HealthInsightsService
        
        health_service = HealthInsightsService()
        methods = [m for m in dir(health_service) if not m.startswith('_') and callable(getattr(health_service, m))]
        print(f"✅ Health Insights: Available ({len(methods)} methods)")
        return True
        
    except Exception as e:
        print(f"❌ Health Insights: Failed - {str(e)}")
        return False

def test_goals_service():
    """Test Goals Service"""
    print("🔍 Testing Goals Service...")
    try:
        from app.services.ai_services.goals_service import GoalsService
        
        goals_service = GoalsService()
        print(f"✅ Goals Service: {type(goals_service).__name__}")
        return True
        
    except Exception as e:
        print(f"❌ Goals Service: Failed - {str(e)}")
        return False

def test_planner_service():
    """Test Planner Service"""
    print("🔍 Testing Planner Service...")
    try:
        from app.services.ai_services.planner_service import get_planner_service
        
        planner_service = get_planner_service()
        print(f"✅ Planner Service: {type(planner_service).__name__}")
        return True
        
    except Exception as e:
        print(f"❌ Planner Service: Failed - {str(e)}")
        return False

def test_scheduler_service():
    """Test Scheduler Service"""
    print("🔍 Testing Scheduler Service...")
    try:
        from app.services.backend_services.scheduler_service import get_scheduler_service
        
        scheduler_service = get_scheduler_service()
        print(f"✅ Scheduler Service: {type(scheduler_service).__name__}")
        return True
        
    except Exception as e:
        print(f"❌ Scheduler Service: Failed - {str(e)}")
        return False

def test_nudge_service():
    """Test Nudge Service"""
    print("🔍 Testing Nudge Service...")
    try:
        from app.services.backend_services.nudge_service import NudgeService
        
        nudge_service = NudgeService()
        has_collections = hasattr(nudge_service, 'collection') and hasattr(nudge_service, 'nudges_collection')
        print(f"✅ Nudge Service: Available (Collections: {'Yes' if has_collections else 'No'})")
        return True
        
    except Exception as e:
        print(f"❌ Nudge Service: Failed - {str(e)}")
        return False

def test_document_processor():
    """Test Document Processor"""
    print("🔍 Testing Document Processor...")
    try:
        from app.services.ai_services.document_processor import DocumentProcessor
        
        doc_processor = DocumentProcessor()
        print(f"✅ Document Processor: {type(doc_processor).__name__}")
        return True
        
    except Exception as e:
        print(f"❌ Document Processor: Failed - {str(e)}")
        return False

def test_openai_connection():
    """Test OpenAI connection (if available)"""
    print("🔍 Testing OpenAI Connection...")
    try:
        # Try to find OpenAI client in various locations
        openai_client = None
        
        # Try different possible locations
        try:
            from app.services.openai_client import get_openai_client
            openai_client = get_openai_client()
        except ImportError:
            try:
                from app.services.ai_services.openai_client import get_openai_client
                openai_client = get_openai_client()
            except ImportError:
                # Try direct OpenAI import
                from openai import OpenAI
                import os
                api_key = os.getenv("OPENAI_API_KEY")
                if api_key:
                    openai_client = OpenAI(api_key=api_key)
        
        if openai_client:
            # Test simple completion
            response = openai_client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[{"role": "user", "content": "Say 'test ok'"}],
                max_tokens=5
            )
            print(f"✅ OpenAI: Connected (Response: {response.choices[0].message.content})")
            return True
        else:
            print("⚠️  OpenAI: No client found")
            return False
            
    except Exception as e:
        print(f"⚠️  OpenAI: Failed - {str(e)}")
        return False

def test_integration_flow():
    """Test integration between services"""
    print("🔍 Testing Service Integration...")
    try:
        # Test that key services can work together
        from app.services.ai_services.health_insights_service import HealthInsightsService
        from app.services.ai_services.goals_service import GoalsService
        from app.services.backend_services.nudge_service import NudgeService
        
        health_service = HealthInsightsService()
        goals_service = GoalsService()
        nudge_service = NudgeService()
        
        # Check for key integration methods
        has_goal_generation = hasattr(goals_service, 'generate_goal_plan')
        has_nudge_creation = hasattr(nudge_service, 'create_nudges_for_goal')
        
        integration_score = sum([
            has_goal_generation,
            has_nudge_creation,
        ])
        
        print(f"✅ Integration: {integration_score}/2 flows available")
        return integration_score >= 1
        
    except Exception as e:
        print(f"❌ Integration: Failed - {str(e)}")
        return False

def main():
    """Run all tests and generate report"""
    print("🏥 Health Insights System Test")
    print("=" * 50)
    print(f"📅 Test Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 50)
    
    # Run all tests
    tests = [
        ("Database Connection", test_database),
        ("Vector Store", test_vector_store),
        ("Graph Database", test_graph_database),
        ("Health Insights Service", test_health_insights_service),
        ("Goals Service", test_goals_service),
        ("Planner Service", test_planner_service),
        ("Scheduler Service", test_scheduler_service),
        ("Nudge Service", test_nudge_service),
        ("Document Processor", test_document_processor),
        ("OpenAI Connection", test_openai_connection),
        ("Service Integration", test_integration_flow),
    ]
    
    results = []
    for test_name, test_func in tests:
        try:
            result = test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"💥 {test_name}: Crashed - {str(e)}")
            results.append((test_name, False))
        print()  # Add spacing between tests
    
    # Generate summary
    print("=" * 50)
    print("📊 TEST SUMMARY")
    print("=" * 50)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for test_name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status} {test_name}")
    
    print(f"\nResults: {passed}/{total} tests passed ({(passed/total)*100:.1f}%)")
    
    if passed == total:
        print("🎉 ALL SYSTEMS OPERATIONAL!")
    elif passed >= total * 0.8:
        print("⚠️  MOSTLY OPERATIONAL - Minor issues detected")
    elif passed >= total * 0.5:
        print("🚨 PARTIAL FUNCTIONALITY - Several issues detected")
    else:
        print("💥 CRITICAL ISSUES - System needs immediate attention")
    
    print("=" * 50)
    
    return passed, total

if __name__ == "__main__":
    try:
        passed, total = main()
        # Exit with error code if too many tests failed
        if passed < total * 0.5:
            sys.exit(1)
    except KeyboardInterrupt:
        print("\n❌ Tests interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n💥 Test runner crashed: {e}")
        sys.exit(1)
