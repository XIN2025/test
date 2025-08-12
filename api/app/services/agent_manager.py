from typing import Dict, List, Optional
from datetime import datetime
from bson import ObjectId
from ..services.db import get_db

db = get_db()

class AgentManager:
    def __init__(self, user_email: str):
        self.user_email = user_email
        
    def create_agent(self, name: str, description: str) -> str:
        """Create a new agent for a user"""
        agent_doc = {
            "name": name,
            "description": description,
            "user_email": self.user_email,
            "created_at": datetime.utcnow(),
            "last_used": datetime.utcnow(),
            "context_files": [],  # List of file_ids this agent has access to
            "is_active": True
        }
        
        agent_id = db.agents.insert_one(agent_doc).inserted_id
        return str(agent_id)
        
    def assign_files_to_agent(self, agent_id: str, file_ids: List[str]):
        """Assign specific files to an agent"""
        db.agents.update_one(
            {"_id": ObjectId(agent_id)},
            {
                "$addToSet": {
                    "context_files": {
                        "$each": file_ids
                    }
                }
            }
        )
        
    def get_agent_context(self, agent_id: str) -> Dict:
        """Get all context files assigned to an agent"""
        agent = db.agents.find_one({"_id": ObjectId(agent_id)})
        if not agent:
            raise ValueError("Agent not found")
            
        # Get all files assigned to this agent
        files = db.uploaded_files.find({
            "_id": {"$in": [ObjectId(fid) for fid in agent.get("context_files", [])]},
            "user_email": self.user_email  # Extra security check
        })
        
        return {
            "agent_name": agent["name"],
            "files": list(files)
        }
        
    def query_agent_context(self, agent_id: str, query: str) -> List[Dict]:
        """Query the graph using only nodes from files assigned to this agent"""
        agent = db.agents.find_one({"_id": ObjectId(agent_id)})
        if not agent:
            raise ValueError("Agent not found")
            
        # Get file IDs assigned to this agent
        file_ids = agent.get("context_files", [])
        
        # Query the graph with file and user filters
        relevant_nodes = self.graph.query(
            query,
            filter_condition={
                "file_id": {"$in": file_ids},
                "user_email": self.user_email
            }
        )
        
        return relevant_nodes
