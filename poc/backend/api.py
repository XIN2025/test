from fastapi import FastAPI, HTTPException, UploadFile, File, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict
import logging
from text_processor import TextProcessor
from graph_db import Neo4jDatabase
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import SystemMessage, HumanMessage
import os
from dotenv import load_dotenv
from agentic_context_langgraph import agentic_context_retrieval, agentic_context_retrieval_stream
from fastapi.responses import StreamingResponse
import asyncio
from vector_store import VectorStore

# Set up logging
logging.basicConfig(level=logging.DEBUG)

# Load environment variables
load_dotenv()

# Get API key
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
if not GOOGLE_API_KEY:
    raise ValueError("GOOGLE_API_KEY not found in environment variables. Please check your .env file.")

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Vite's default development port
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

db = Neo4jDatabase()
processor = TextProcessor()
vector_store = VectorStore()

class UploadResponse(BaseModel):
    entities: int
    relationships: int

@app.post("/upload", response_model=UploadResponse)
async def upload_file(file: UploadFile = File(...)):
    """Process an uploaded text file and store entities/relationships in the graph"""
    try:
        # Read the file content
        content = await file.read()
        text = content.decode('utf-8')
        
        # Process the text
        entities, relationships = processor.process_text(text)
        
        # Store in Neo4j and VectorStore
        for entity in entities:
            # Pass description as a dictionary for properties
            properties = {}
            if entity.get('description'):
                properties['description'] = entity['description']
            db.create_entity(entity['type'], entity['name'], properties)
            # Add to vector store
            node_id = entity['name']
            node_text = entity.get('description', entity['name'])
            vector_store.add_node(node_id, node_text)

        for rel in relationships:
            db.create_relationship(rel['from'], rel['type'], rel['to'])
        
        return UploadResponse(
            entities=len(entities),
            relationships=len(relationships)
        )
        
    except Exception as e:
        logging.error(f"Error processing upload: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Initialize Gemini model
llm = ChatGoogleGenerativeAI(
    model="gemini-1.5-pro",
    google_api_key=GOOGLE_API_KEY,
    convert_system_message_to_human=True  # Add this parameter to handle system messages
)

class QueryRequest(BaseModel):
    question: str

class QueryResponse(BaseModel):
    answer: str
    context: List[str]

class GraphData(BaseModel):
    nodes: List[Dict]
    links: List[Dict]

async def extract_entities_with_llm(text: str) -> List[str]:
    """Use LLM to intelligently extract entities from text."""
    messages = [
        SystemMessage(content="""You are an entity extraction expert. For the given input text, return ONLY a comma-separated list of potential entity names, including variations and common nicknames. No explanation, just the names.

Examples:
Input: "who is elon"
Output: Elon, Elon Musk

Input: "tell me about microsoft and google"
Output: Microsoft, Google, Alphabet

Input: "what did sam do"
Output: Sam, Sam Altman, Samuel Altman"""),
        HumanMessage(content=f"Extract entities from: {text}")
    ]
    
    try:
        response = llm.invoke(messages)
        # Split by commas and clean up whitespace
        entities = [e.strip() for e in response.content.split(',')]
        logging.debug(f"LLM extracted entities: {entities}")
        return [e for e in entities if e]  # Filter out empty strings
    except Exception as e:
        logging.error(f"Error in LLM entity extraction: {e}")
        return []

async def get_context_with_llm(entities: List[str], db_context: List[str]) -> List[str]:
    """Use LLM to filter and rank context relevance."""
    if not db_context:
        return []

    messages = [
        SystemMessage(content="""You are a context filtering expert. Given entities and context statements:
1. Remove redundant or contradictory information
2. Keep only the most relevant statements
3. Order from most to least relevant
4. Return ONLY the statements, one per line, no explanations."""),
        HumanMessage(content=f"""Filter and rank these context statements about: {', '.join(entities)}

Context statements:
{chr(10).join(db_context)}""")
    ]
    
    try:
        response = llm.invoke(messages)
        context = [line.strip() for line in response.content.split('\n') if line.strip()]
        logging.debug(f"LLM filtered context: {context}")
        return context
    except Exception as e:
        logging.error(f"Error in LLM context filtering: {e}")
        return db_context  # Fall back to original context if parsing fails

@app.post("/query", response_model=QueryResponse)
async def query(request: QueryRequest):
    """Process a natural language query using the knowledge graph"""
    try:
        question = request.question
        logging.debug(f"Processing question: {question}")
        
        # Use new agentic_context_langgraph for context
        full_context = await agentic_context_retrieval(question, llm, db, vector_store)

        if not full_context:
            return QueryResponse(
                answer="I don't have enough information to answer that question.",
                context=[]
            )

        # Format context for final LLM query
        context_str = "\n".join(full_context)

        # Create messages for the answer generation
        messages = [
            SystemMessage(content="""You are a knowledgeable assistant. When answering:
1. Use only the provided context
2. If context is contradictory, explain the contradiction
3. Express uncertainty when appropriate
4. Be concise but informative"""),
            HumanMessage(content=f"""Based on this context, answer: {question}

Context:
{context_str}""")
        ]

        # Get answer from LLM
        response = llm.invoke(messages)

        return QueryResponse(
            answer=response.content,
            context=full_context
        )
        
    except Exception as e:
        logging.error(f"Error processing query: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/query-stream")
async def query_stream(question: str = Query(...)):
    async def event_generator():
        async for step in agentic_context_retrieval_stream(question, llm, db, vector_store):
            yield f"data: {step}\n\n"
            await asyncio.sleep(0.01)
    return StreamingResponse(event_generator(), media_type="text/event-stream")

@app.get("/graph", response_model=GraphData)
async def get_graph_data():
    """Get the entire knowledge graph structure"""
    try:
        nodes, relationships = db.get_graph_data()
        
        # Format data for visualization
        nodes_data = [
            {
                "id": node["name"],
                "label": node["name"],
                "type": node["type"],
                "color": get_node_color(node["type"])
            }
            for node in nodes
        ]
        
        links_data = [
            {
                "source": rel["from"],
                "target": rel["to"],
                "label": rel["type"]
            }
            for rel in relationships
        ]
        
        return GraphData(nodes=nodes_data, links=links_data)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/clear-database")
async def clear_database():
    """Clear all data from the Neo4j database"""
    try:
        db.clear_database()
        return {"message": "Database cleared successfully"}
    except Exception as e:
        logging.error(f"Error clearing database: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/sync-vector-store")
async def sync_vector_store():
    """Rebuild the FAISS vector store from all current Neo4j nodes."""
    try:
        vector_store.sync_from_graph(db)
        return {"message": "Vector store synced from graph successfully."}
    except Exception as e:
        logging.error(f"Error syncing vector store: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

class HybridQueryResponse(BaseModel):
    answer: str
    context: List[str]
    vector_nodes: List[str]
    graph_nodes: List[str]

@app.post("/hybrid-query", response_model=HybridQueryResponse)
async def hybrid_query(request: QueryRequest):
    """Hybrid RAG: Retrieve context from both vector store and graph, merge, and answer."""
    try:
        question = request.question
        # 1. Vector store semantic search
        vector_node_ids = vector_store.search(question, top_k=5)
        # Fetch descriptions for vector nodes from Neo4j
        vector_context = []
        vector_entities = db.get_all_entities()
        for node_id in vector_node_ids:
            for ent in vector_entities:
                if ent["name"] == node_id:
                    desc = ent.get("description")
                    if desc:
                        vector_context.append(f"ENTITY DESCRIPTION: {ent['name']}: {desc}")
                    else:
                        vector_context.append(f"ENTITY DESCRIPTION: {ent['name']} (no description)")
        # 2. Graph agentic context
        graph_context = await agentic_context_retrieval(question, llm, db, vector_store)
        # 3. Merge and deduplicate
        all_context = list(dict.fromkeys(vector_context + graph_context))
        # 4. LLM answer
        context_str = "\n".join(all_context)
        messages = [
            SystemMessage(content="""You are a knowledgeable assistant. When answering:\n1. Use only the provided context\n2. If context is contradictory, explain the contradiction\n3. Express uncertainty when appropriate\n4. Be concise but informative"""),
            HumanMessage(content=f"""Based on this context, answer: {question}\n\nContext:\n{context_str}""")
        ]
        response = llm.invoke(messages)
        return HybridQueryResponse(
            answer=response.content,
            context=all_context,
            vector_nodes=vector_node_ids,
            graph_nodes=[c for c in graph_context if c.startswith("ENTITY DESCRIPTION: ")]
        )
    except Exception as e:
        logging.error(f"Error in hybrid_query: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

def get_node_color(node_type: str) -> str:
    """Return a color based on node type"""
    color_map = {
        "PERSON": "#4CAF50",  # Green
        "COMPANY": "#2196F3",  # Blue
        "PRODUCT": "#FFC107",  # Amber
        "LOCATION": "#9C27B0",  # Purple
        "ORGANIZATION": "#FF5722",  # Deep Orange
    }
    return color_map.get(node_type, "#607D8B")  # Grey as default 