from fastapi import APIRouter, HTTPException, Query
from pydantic import EmailStr, BaseModel
from typing import List, Optional
from datetime import datetime
from ..services.agent_manager import AgentManager
from ..services.db import get_db

agent_router = APIRouter()
db = get_db()

class AgentCreate(BaseModel):
    name: str
    description: str
    file_ids: List[str]

class AgentResponse(BaseModel):
    id: str
    name: str
    description: str
    created_at: datetime
    last_used: datetime
    file_count: int

@agent_router.post("/api/agents/create")
async def create_agent(
    agent: AgentCreate,
    email: EmailStr = Query(...)
):
    try:
        agent_manager = AgentManager(email)
        
        # Create the agent
        agent_id = agent_manager.create_agent(
            name=agent.name,
            description=agent.description
        )
        
        # Assign files if provided
        if agent.file_ids:
            agent_manager.assign_files_to_agent(agent_id, agent.file_ids)
            
        return {"agent_id": agent_id}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@agent_router.get("/api/agents")
async def list_agents(email: EmailStr = Query(...)):
    try:
        agents = db.agents.find({"user_email": email})
        return [
            AgentResponse(
                id=str(agent["_id"]),
                name=agent["name"],
                description=agent["description"],
                created_at=agent["created_at"],
                last_used=agent["last_used"],
                file_count=len(agent.get("context_files", []))
            )
            for agent in agents
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@agent_router.post("/api/agents/{agent_id}/files")
async def assign_files(
    agent_id: str,
    file_ids: List[str],
    email: EmailStr = Query(...)
):
    try:
        agent_manager = AgentManager(email)
        agent_manager.assign_files_to_agent(agent_id, file_ids)
        return {"message": "Files assigned successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@agent_router.get("/api/agents/{agent_id}/query")
async def query_agent(
    agent_id: str,
    query: str,
    email: EmailStr = Query(...)
):
    try:
        agent_manager = AgentManager(email)
        results = agent_manager.query_agent_context(agent_id, query)
        return {"results": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
