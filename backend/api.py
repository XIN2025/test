from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import os
from text_processor import TextProcessor
from graph_db import Neo4jDatabase
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import SystemMessage, HumanMessage
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Get API key
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
if not GOOGLE_API_KEY:
    raise ValueError("GOOGLE_API_KEY not found in environment variables")

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",  # Vite development server
        "http://localhost:3000",  # Alternative development port
        "http://127.0.0.1:5173",  # Alternative hostname
        "http://127.0.0.1:3000",  # Alternative hostname
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize components
processor = TextProcessor()
db = Neo4jDatabase()
llm = ChatGoogleGenerativeAI(
    model="gemini-1.5-flash",
    google_api_key=GOOGLE_API_KEY,
    convert_system_message_to_human=True  # Enable system message conversion
)

class QueryRequest(BaseModel):
    question: str

class QueryResponse(BaseModel):
    answer: str
    context: List[str]

@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    """Upload a text file and process it for the knowledge graph"""
    try:
        # Read the file content
        content = await file.read()
        text = content.decode()
        
        # Process the text
        entities, relationships = processor.process_text(text)
        
        # Store in Neo4j
        for entity in entities:
            db.create_entity(entity['type'], entity['name'])
        
        for rel in relationships:
            db.create_relationship(rel['from'], rel['type'], rel['to'])
        
        return {
            "message": "File processed successfully",
            "entities": len(entities),
            "relationships": len(relationships)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/query", response_model=QueryResponse)
async def query(request: QueryRequest):
    """Query the knowledge graph"""
    try:
        print(f"\n[DEBUG] Processing question: {request.question}")
        
        # Extract entities from the question
        entities = processor.extract_entities(request.question)
        print(f"[DEBUG] Extracted entities: {entities}")
        entity_names = [e["name"] for e in entities]
        print(f"[DEBUG] Entity names for query: {entity_names}")
        
        # Get context from Neo4j
        context = db.get_context(entity_names)
        print(f"[DEBUG] Retrieved context: {context}")
        
        if not context:
            print("[DEBUG] No context found in knowledge graph")
            return QueryResponse(
                answer="I couldn't find any relevant information in the knowledge graph.",
                context=[]
            )
        
        # Format context for LLM
        context_str = "\n".join(context)
        
        # Create messages for the prompt
        messages = [
            SystemMessage(content="You are a helpful assistant that answers questions based on the provided knowledge graph context."),
            HumanMessage(content=f"""Given the following context from a knowledge graph and a question, provide a detailed answer.
            Use only the information provided in the context.
            
            Context:
            {context_str}
            
            Question: {request.question}""")
        ]
        
        # Get answer from LLM
        response = llm.invoke(messages)
        
        return QueryResponse(
            answer=response.content,
            context=context
        )
    except Exception as e:
        print(f"[DEBUG] Error occurred: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/clear")
async def clear_database():
    """Clear the entire graph database"""
    try:
        db.clear_database()
        return {"message": "Database cleared successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 