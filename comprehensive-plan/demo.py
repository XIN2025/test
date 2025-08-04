#!/usr/bin/env python3
"""
Demo script for the Comprehensive Graph RAG System
==================================================

This script demonstrates how to use the Graph RAG system programmatically.
"""

import asyncio
import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Add the project root to Python path
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

from index import GraphRAGSystem, SystemConfig

async def demo():
    """Demonstrate the Graph RAG system capabilities"""
    
    print("🚀 Comprehensive Graph RAG System Demo")
    print("=" * 50)
    
    # Load environment variables
    load_dotenv()
    
    # Initialize system configuration
    config = SystemConfig(
        neo4j_uri=os.getenv("NEO4J_URI", "bolt://localhost:7687"),
        neo4j_user=os.getenv("NEO4J_USER", "neo4j"),
        neo4j_password=os.getenv("NEO4J_PASSWORD", "password"),
        google_api_key=os.getenv("GOOGLE_API_KEY", ""),
        vector_store_path=os.getenv("VECTOR_STORE_PATH", "faiss_index.bin"),
        max_exploration_depth=int(os.getenv("MAX_EXPLORATION_DEPTH", "3")),
        similarity_threshold=float(os.getenv("SIMILARITY_THRESHOLD", "0.6"))
    )
    
    # Create system instance
    system = GraphRAGSystem(config)
    
    try:
        # Initialize the system
        print("📋 Initializing system...")
        await system.initialize()
        print("✅ System initialized successfully!")
        
        # Check if sample data exists
        sample_files = [
            "data/sample_medical.txt",
            "data/sample_text.txt"
        ]
        
        # Upload sample documents
        for file_path in sample_files:
            if Path(file_path).exists():
                print(f"\n📄 Uploading {file_path}...")
                result = await system.upload_document(file_path)
                print(f"✅ Uploaded {result['filename']}")
                print(f"   - Entities: {result['entities']}")
                print(f"   - Relationships: {result['relationships']}")
                print(f"   - Images: {result['images']}")
        
        # Get statistics
        print("\n📊 Getting graph statistics...")
        stats = await system.get_graph_stats()
        print(f"✅ Total entities: {stats['total_entities']}")
        print(f"✅ Total relationships: {stats['total_relationships']}")
        
        if stats['entity_types']:
            print("\n📈 Entities by type:")
            for entity_type, count in stats['entity_types'].items():
                print(f"   - {entity_type}: {count}")
        
        # Demo queries
        demo_queries = [
            "What are the symptoms of hypertension?",
            "What treatments are available for diabetes?",
            "Tell me about cardiovascular diseases",
            "What are the risk factors for heart disease?"
        ]
        
        print("\n🔍 Running demo queries...")
        for i, query in enumerate(demo_queries, 1):
            print(f"\n📝 Query {i}: {query}")
            try:
                result = await system.query(query)
                print(f"✅ Answer: {result['answer'][:200]}...")
                print(f"   - Context pieces used: {result['context_count']}")
            except Exception as e:
                print(f"❌ Query failed: {e}")
        
        print("\n🎉 Demo completed successfully!")
        
    except Exception as e:
        print(f"❌ Demo failed: {e}")
        return False
    
    return True

def main():
    """Main demo function"""
    print("Starting Graph RAG System Demo...")
    print("Make sure you have:")
    print("1. Neo4j running on localhost:7687")
    print("2. GOOGLE_API_KEY set in environment")
    print("3. Sample data files in data/ directory")
    print()
    
    # Run the demo
    success = asyncio.run(demo())
    
    if success:
        print("\n✅ Demo completed successfully!")
        print("\nNext steps:")
        print("1. Try the CLI: python index.py interactive")
        print("2. Upload your own documents")
        print("3. Explore the knowledge graph")
    else:
        print("\n❌ Demo failed. Check the error messages above.")
        sys.exit(1)

if __name__ == "__main__":
    main() 