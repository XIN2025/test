#!/usr/bin/env python3
"""
Test script for the Graph RAG system
"""

import asyncio
import os
import sys
from dotenv import load_dotenv

# Add the app directory to the path
sys.path.append(os.path.join(os.path.dirname(__file__), 'app'))

from app.services.graph_db import get_graph_db
from app.services.vector_store import get_vector_store
from app.services.document_processor import get_document_processor
from app.services.chat_service import get_chat_service

async def test_graph_rag():
    """Test the complete Graph RAG system"""
    print("🧪 Testing Graph RAG System...")
    
    try:
        # Test 1: Graph Database Connection
        print("\n1. Testing Graph Database Connection...")
        graph_db = get_graph_db()
        nodes, relationships = graph_db.get_graph_data()
        print(f"✅ Graph DB connected. Found {len(nodes)} nodes and {len(relationships)} relationships")
        
        # Test 2: Vector Store
        print("\n2. Testing Vector Store...")
        vector_store = get_vector_store()
        stats = vector_store.get_stats()
        print(f"✅ Vector store initialized. {stats['total_nodes']} nodes indexed")
        
        # Test 3: Document Processor
        print("\n3. Testing Document Processor...")
        doc_processor = get_document_processor()
        print("✅ Document processor initialized")
        
        # Test 4: Chat Service
        print("\n4. Testing Chat Service...")
        chat_service = get_chat_service()
        print("✅ Chat service initialized")
        
        # Test 5: Process Sample Text
        print("\n5. Testing Document Processing...")
        sample_text = """
        John Smith is a cardiologist at Mayo Clinic. He specializes in heart disease treatment.
        Dr. Smith works with Dr. Sarah Johnson, a cardiac surgeon. They have treated over 500 patients together.
        Mayo Clinic is located in Rochester, Minnesota. The clinic was founded in 1889.
        """
        
        result = doc_processor.process_text_file(sample_text, "test_document.txt")
        if result["success"]:
            print(f"✅ Document processed successfully!")
            print(f"   - Entities found: {result['entities_count']}")
            print(f"   - Relationships found: {result['relationships_count']}")
        else:
            print(f"❌ Document processing failed: {result.get('error')}")
        
        # Test 6: Chat with RAG
        print("\n6. Testing Chat with RAG...")
        chat_result = await chat_service.chat("Tell me about John Smith")
        if chat_result["success"]:
            print(f"✅ Chat response generated!")
            print(f"   - Response: {chat_result['response'][:100]}...")
            print(f"   - Follow-up questions: {len(chat_result['follow_up_questions'])}")
        else:
            print(f"❌ Chat failed: {chat_result.get('error')}")
        
        # Test 7: Graph Statistics
        print("\n7. Testing Graph Statistics...")
        nodes, relationships = graph_db.get_graph_data()
        print(f"✅ Graph contains {len(nodes)} nodes and {len(relationships)} relationships")
        
        if nodes:
            print("   Sample nodes:")
            for node in nodes[:3]:
                print(f"   - {node['name']} ({node['type']})")
        
        print("\n🎉 All tests passed! Graph RAG system is working correctly.")
        
    except Exception as e:
        print(f"\n❌ Test failed with error: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    return True

def test_environment():
    """Test environment configuration"""
    print("🔧 Testing Environment Configuration...")
    
    required_vars = [
        'NEO4J_URI',
        'NEO4J_USER', 
        'NEO4J_PASSWORD',
        'GOOGLE_API_KEY'
    ]
    
    missing_vars = []
    for var in required_vars:
        if not os.getenv(var):
            missing_vars.append(var)
    
    if missing_vars:
        print(f"❌ Missing environment variables: {', '.join(missing_vars)}")
        print("Please check your .env file")
        return False
    
    print("✅ Environment variables configured correctly")
    return True

if __name__ == "__main__":
    # Load environment variables
    load_dotenv()
    
    # Test environment first
    if not test_environment():
        sys.exit(1)
    
    # Run Graph RAG tests
    success = asyncio.run(test_graph_rag())
    
    if success:
        print("\n🚀 System is ready for use!")
    else:
        print("\n⚠️  System needs configuration. Please check the setup guide.")
        sys.exit(1) 