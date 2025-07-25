import asyncio
import os
from dotenv import load_dotenv
from langchain_google_genai import ChatGoogleGenerativeAI
from core import Neo4jDatabase, AgenticContextRetrieval, agentic_context_retrieval, VectorStore

# Load environment variables
load_dotenv()

async def main():
    """Example usage of the agentic context retrieval system"""
    
    # Initialize LLM
    llm = ChatGoogleGenerativeAI(
        model="gemini-pro",
        google_api_key=os.getenv("GOOGLE_API_KEY"),
        temperature=0.1
    )
    
    # Initialize database
    db = Neo4jDatabase()
    # Initialize vector store
    vector_store = VectorStore()
    
    # Example queries to test the system
    test_queries = [
        "who studies hypertension",
    ]
    
    print("🤖 Agentic Context Retrieval System Demo")
    print("=" * 50)
    
    for i, query in enumerate(test_queries, 1):
        print(f"\n📝 Query {i}: {query}")
        print("-" * 30)
        
        try:
            # Use the agentic context retrieval
            context = await agentic_context_retrieval(
                question=query,
                llm=llm,
                db=db,
                vector_store=vector_store,
                max_depth=3
            )
            
            print(f"📊 Found {len(context)} context pieces:")
            for j, piece in enumerate(context, 1):
                print(f"  {j}. {piece}")
                
        except Exception as e:
            print(f"❌ Error: {e}")
        
        print("\n" + "=" * 50)
    
    # Close database connection
    db.close()

if __name__ == "__main__":
    asyncio.run(main()) 