import asyncio
from typing import List, Dict, Any, Optional, Set
from dataclasses import dataclass, asdict
from enum import Enum
from langchain_core.messages import SystemMessage, HumanMessage
from langgraph.graph import StateGraph, END
from langgraph.checkpoint.memory import MemorySaver
from core.graph_db import Neo4jDatabase
import re
import json
from core.vector_store import VectorStore


class NodeType(Enum):
    SIMILARITY_SEARCH = "similarity_search"
    NODE_EXPLORATION = "node_exploration"
    RELATIONSHIP_EXPLORATION = "relationship_exploration"
    CONTEXT_SYNTHESIS = "context_synthesis"


@dataclass
class AgentState:
    """State for the agentic context retrieval workflow"""
    query: str
    discovered_nodes: Set[str]
    explored_nodes: Set[str]
    explored_relationships: Set[str]
    context_pieces: List[str]
    current_focus: Optional[str] = None
    exploration_depth: int = 0
    max_depth: int = 3
    should_continue: bool = True
    reasoning: str = ""


class AgenticContextRetrieval:
    def __init__(self, llm, db: Neo4jDatabase, vector_store: VectorStore):
        self.llm = llm
        self.db = db
        self.vector_store = vector_store
        self.graph = self._build_graph()
    
    def _build_graph(self) -> StateGraph:
        """Build the LangGraph workflow"""
        workflow = StateGraph(AgentState)
        
        # Add nodes
        workflow.add_node("similarity_search", self._similarity_search_node)
        workflow.add_node("node_exploration", self._node_exploration_node)
        workflow.add_node("relationship_exploration", self._relationship_exploration_node)
        workflow.add_node("context_synthesis", self._context_synthesis_node)
        workflow.add_node("decision_maker", self._decision_maker_node)
        
        # Add edges
        workflow.set_entry_point("similarity_search")
        workflow.add_edge("similarity_search", "node_exploration")
        workflow.add_edge("node_exploration", "relationship_exploration")
        workflow.add_edge("relationship_exploration", "decision_maker")
        workflow.add_edge("context_synthesis", END)
        # Only conditional edges from decision_maker
        workflow.add_conditional_edges(
            "decision_maker",
            self._should_continue_exploring,
            {
                "continue": "node_exploration",
                "synthesize": "context_synthesis"
            }
        )
        
        return workflow.compile(checkpointer=MemorySaver())
    
    async def _similarity_search_node(self, state: AgentState, step_callback=None) -> dict:
        if isinstance(state, dict):
            state = AgentState(**state)
        if step_callback:
            step_callback(json.dumps({"step": "similarity_search", "status": "started"}))
        step_info = {
            "step": "similarity_search",
            "query": state.query,
            "discovered_nodes": list(state.discovered_nodes),
            "reasoning": state.reasoning
        }
        # Use vector store for retrieval
        top_k = 5  # You can make this configurable
        retrieved_node_ids = self.vector_store.search(state.query, top_k=top_k)
        discovered_nodes = set([nid for nid in retrieved_node_ids if nid])
        state.discovered_nodes = discovered_nodes
        state.reasoning = f"Found {len(discovered_nodes)} nodes using vector store RAG retrieval."
        print(f"[STEP] similarity_search | Query: {state.query}")
        print(f"[INFO] Discovered nodes: {state.discovered_nodes}")
        print(f"[INFO] Reasoning: {state.reasoning}")
        if step_callback:
            step_callback(json.dumps({"step": "similarity_search", "status": "finished"}))
            step_callback(json.dumps(step_info))
        return asdict(state)
    
    async def _node_exploration_node(self, state: AgentState, step_callback=None) -> dict:
        if isinstance(state, dict):
            state = AgentState(**state)
        if step_callback:
            step_callback(json.dumps({"step": "node_exploration", "status": "started"}))
        step_info = {
            "step": "node_exploration",
            "unexplored": list(state.discovered_nodes - state.explored_nodes),
            "current_focus": state.current_focus,
            "explored_nodes": list(state.explored_nodes),
            "reasoning": state.reasoning
        }
        if step_callback:
            step_callback(json.dumps({"step": "node_exploration", "status": "finished"}))
            step_callback(json.dumps(step_info))
        print(f"[STEP] node_exploration | Unexplored: {state.discovered_nodes - state.explored_nodes}")
        # Decide which nodes to explore based on query relevance
        if not state.discovered_nodes:
            state.should_continue = False
            state.reasoning = "No discovered nodes to explore."
            print(f"[INFO] No discovered nodes. Stopping exploration.")
            return asdict(state)
        unexplored_nodes = state.discovered_nodes - state.explored_nodes
        if not unexplored_nodes:
            state.should_continue = False
            state.reasoning = "No unexplored nodes left."
            print(f"[INFO] No unexplored nodes left. Stopping exploration.")
            return asdict(state)
        # Prioritize nodes based on query relevance
        prioritized_nodes = await self._prioritize_nodes(list(unexplored_nodes), state.query)
        # Select the most relevant node to explore
        if prioritized_nodes:
            state.current_focus = prioritized_nodes[0]
            state.explored_nodes.add(prioritized_nodes[0])
            state.exploration_depth += 1
            # Get node description and add to context
            node_info = await self._get_node_info(prioritized_nodes[0])
            if node_info:
                state.context_pieces.append(node_info)
        print(f"[INFO] Current focus: {state.current_focus}")
        print(f"[INFO] Explored nodes: {state.explored_nodes}")
        print(f"[INFO] Reasoning: {state.reasoning}")
        return asdict(state)
    
    async def _relationship_exploration_node(self, state: AgentState, step_callback=None) -> dict:
        if isinstance(state, dict):
            state = AgentState(**state)
        if step_callback:
            step_callback(json.dumps({"step": "relationship_exploration", "status": "started"}))
        step_info = {
            "step": "relationship_exploration",
            "current_focus": state.current_focus,
            "explored_relationships": list(state.explored_relationships)
        }
        if step_callback:
            step_callback(json.dumps({"step": "relationship_exploration", "status": "finished"}))
            step_callback(json.dumps(step_info))
        print(f"[STEP] relationship_exploration | Current focus: {state.current_focus}")
        """Explore relationships of the current focus node"""
        if not state.current_focus:
            return asdict(state)
        
        # Get relationships for the current node
        relationships = await self._get_node_relationships(state.current_focus)
        
        # Use LLM to decide which relationships are relevant
        relevant_relationships = await self._filter_relevant_relationships(
            relationships, state.query, state.current_focus
        )
        
        # Add relevant relationship information to context
        for rel in relevant_relationships:
            rel_key = f"{rel['from']}-{rel['type']}-{rel['to']}"
            if rel_key not in state.explored_relationships:
                state.explored_relationships.add(rel_key)
                state.context_pieces.append(
                    f"{rel['from']} {rel['type'].lower().replace('_', ' ')} {rel['to']}"
                )
                
                # Add newly discovered nodes to the discovery set
                if rel['to'] not in state.discovered_nodes:
                    state.discovered_nodes.add(rel['to'])
        
        print(f"[INFO] Explored relationships: {state.explored_relationships}")
        return asdict(state)
    
    async def _decision_maker_node(self, state: AgentState, step_callback=None) -> dict:
        if isinstance(state, dict):
            state = AgentState(**state)
        if step_callback:
            step_callback(json.dumps({"step": "decision_maker", "status": "started"}))
        step_info = {
            "step": "decision_maker",
            "depth": f"{state.exploration_depth}/{state.max_depth}",
            "should_continue": state.should_continue,
            "reasoning": state.reasoning
        }
        if step_callback:
            step_callback(json.dumps({"step": "decision_maker", "status": "finished"}))
            step_callback(json.dumps(step_info))
        print(f"[STEP] decision_maker | Depth: {state.exploration_depth}/{state.max_depth}")
        print(f"[INFO] Should continue: {state.should_continue}")
        print(f"[INFO] Reasoning: {state.reasoning}")
        # If should_continue is already False, don't ask LLM, just return
        if not state.should_continue:
            state.reasoning = state.reasoning or "No more nodes to explore."
            return asdict(state)
        # Check if we've reached max depth
        if state.exploration_depth >= state.max_depth:
            state.should_continue = False
            state.reasoning = "Reached maximum exploration depth"
            return asdict(state)
        # Use LLM to decide if we should continue exploring
        decision = await self._should_continue_exploration(state)
        state.should_continue = decision
        if decision:
            state.reasoning = "Decided to continue exploring for more context"
        else:
            state.reasoning = "Decided we have sufficient context"
        return asdict(state)
    
    async def _context_synthesis_node(self, state: AgentState, step_callback=None) -> dict:
        if isinstance(state, dict):
            state = AgentState(**state)
        if step_callback:
            step_callback(json.dumps({"step": "context_synthesis", "status": "started"}))
        print(f"[STEP] context_synthesis | Synthesizing context...")
        print(f"[INFO] Context pieces: {len(state.context_pieces)}")
        # Add descriptions for all discovered nodes if not already present
        def normalize_name(name):
            return name.lower().replace("dr. ", "").strip()
        all_entities = self.db.get_all_entities()
        existing_descriptions = set(
            c for c in state.context_pieces if c.startswith("ENTITY DESCRIPTION: ")
        )
        added_entity_names = set()
        for node in state.discovered_nodes:
            node_norm = normalize_name(node)
            for entity in all_entities:
                entity_name_norm = normalize_name(entity["name"])
                print(f"[DEBUG] Comparing node '{node}' ({node_norm}) with entity '{entity['name']}' ({entity_name_norm})")
                if node_norm in entity_name_norm or entity_name_norm in node_norm:
                    if entity["name"] in added_entity_names:
                        continue  # Skip duplicate entity descriptions
                    entity_type = entity.get("type", "entity")
                    description = entity.get("description", "")
                    if entity_type == "Image":
                        # Add image as a dict for frontend rendering
                        desc_obj = {
                            "type": "image",
                            "name": entity["name"],
                            "summary": description,
                            "base64": entity.get("base64", "")
                        }
                        if desc_obj not in state.context_pieces:
                            print(f"[DEBUG] Adding image context: {desc_obj}")
                            state.context_pieces.append(desc_obj)
                            added_entity_names.add(entity["name"])
                    else:
                        if description:
                            desc_str = f"ENTITY DESCRIPTION: {entity['name']}: {description}"
                        else:
                            desc_str = f"ENTITY DESCRIPTION: {entity['name']} is a {entity_type}"
                        if desc_str not in state.context_pieces and desc_str not in existing_descriptions:
                            print(f"[DEBUG] Adding description: {desc_str}")
                            state.context_pieces.append(desc_str)
                            added_entity_names.add(entity["name"])
        # TEMP: Skip LLM synthesis to debug
        step_info = {
            "step": "context_synthesis",
            "context_pieces": len(state.context_pieces)
        }
        if step_callback:
            step_callback(json.dumps({"step": "context_synthesis", "status": "finished"}))
            step_callback(json.dumps(step_info))
        return asdict(state)
        # --- original code below ---
        # if not state.context_pieces:
        #     return asdict(state)
        # # Use LLM to synthesize and rank context
        # synthesized_context = await self._synthesize_context(
        #     state.context_pieces, state.query
        # )
        # state.context_pieces = synthesized_context
        # return asdict(state)
    
    def _should_continue_exploring(self, state: AgentState) -> str:
        if isinstance(state, dict):
            state = AgentState(**state)
        """Determine the next step in the workflow"""
        if not state.should_continue:
            return "synthesize"
        return "continue"
    
    async def _extract_keywords(self, query: str) -> List[str]:
        """Extract relevant keywords from the query"""
        messages = [
            SystemMessage(content="""You are a keyword extraction expert. Extract the most important keywords, entities, and concepts from the given query. 
            Focus on names, organizations, concepts, and specific terms that would be useful for searching a knowledge graph.
            Return only a comma-separated list of keywords, no explanations."""),
            HumanMessage(content=f"Query: {query}")
        ]
        
        try:
            response = self.llm.invoke(messages)
            keywords = [k.strip() for k in response.content.split(',') if k.strip()]
            return keywords
        except Exception:
            # Fallback: simple word extraction
            words = re.findall(r'\b\w+\b', query.lower())
            return [w for w in words if len(w) > 3]
    
    def _calculate_similarity(self, str1: str, str2: str) -> float:
        """Calculate simple string similarity"""
        if not str1 or not str2:
            return 0.0
        
        # Simple Jaccard similarity
        set1 = set(str1.split())
        set2 = set(str2.split())
        
        if not set1 and not set2:
            return 1.0
        
        intersection = len(set1.intersection(set2))
        union = len(set1.union(set2))
        
        return intersection / union if union > 0 else 0.0
    
    async def _prioritize_nodes(self, nodes: List[str], query: str) -> List[str]:
        """Prioritize nodes based on relevance to the query"""
        if not nodes:
            return []
        
        messages = [
            SystemMessage(content="""You are a node prioritization expert. Given a list of node names and a query, 
            rank the nodes by their relevance to the query. Consider semantic similarity, context, and importance.
            Return only the node names in order of relevance, separated by commas."""),
            HumanMessage(content=f"Query: {query}\nNodes: {', '.join(nodes)}")
        ]
        
        try:
            response = self.llm.invoke(messages)
            ranked_nodes = [n.strip() for n in response.content.split(',') if n.strip()]
            # Filter to only include nodes that were in the original list
            return [n for n in ranked_nodes if n in nodes]
        except Exception:
            return nodes
    
    async def _get_node_info(self, node_name: str) -> Optional[str]:
        """Get information about a specific node"""
        all_entities = self.db.get_all_entities()
        
        for entity in all_entities:
            if entity["name"].lower() == node_name.lower():
                entity_type = entity.get("type", "entity")
                description = entity.get("description", "")
                
                if description:
                    return f"{node_name} is a {entity_type}: {description}"
                else:
                    return f"{node_name} is a {entity_type}"
        
        return None
    
    async def _get_node_relationships(self, node_name: str) -> List[Dict[str, str]]:
        """Get all relationships for a specific node"""
        with self.db.driver.session() as session:
            query = """
            MATCH (from {name: $node_name})-[r]->(to)
            RETURN from.name as from, type(r) as type, to.name as to
            UNION
            MATCH (from)-[r]->(to {name: $node_name})
            RETURN from.name as from, type(r) as type, to.name as to
            """
            
            result = session.run(query, node_name=node_name)
            relationships = []
            
            for record in result:
                relationships.append({
                    "from": record["from"],
                    "type": record["type"],
                    "to": record["to"]
                })
            
            return relationships
    
    async def _filter_relevant_relationships(
        self, relationships: List[Dict[str, str]], query: str, current_node: str
    ) -> List[Dict[str, str]]:
        """Filter relationships based on relevance to the query"""
        if not relationships:
            return []
        
        # Create relationship descriptions
        rel_descriptions = []
        for rel in relationships:
            desc = f"{rel['from']} {rel['type'].lower().replace('_', ' ')} {rel['to']}"
            rel_descriptions.append(desc)
        
        messages = [
            SystemMessage(content="""You are a relationship filtering expert. Given a list of relationships and a query, 
            identify which relationships are most relevant to answering the query. Consider the context and importance.
            Return only the relevant relationship descriptions, one per line."""),
            HumanMessage(content=f"Query: {query}\nCurrent focus: {current_node}\nRelationships:\n" + "\n".join(rel_descriptions))
        ]
        
        try:
            response = self.llm.invoke(messages)
            relevant_descriptions = [line.strip() for line in response.content.split('\n') if line.strip()]
            
            # Map descriptions back to relationship objects
            relevant_relationships = []
            for rel in relationships:
                desc = f"{rel['from']} {rel['type'].lower().replace('_', ' ')} {rel['to']}"
                if desc in relevant_descriptions:
                    relevant_relationships.append(rel)
            
            return relevant_relationships
        except Exception:
            return relationships
    
    async def _should_continue_exploration(self, state: AgentState) -> bool:
        if isinstance(state, dict):
            state = AgentState(**state)
        """Decide whether to continue exploring based on current context and query"""
        if not state.context_pieces:
            return True
        
        # Check if we have enough context
        context_summary = "\n".join(state.context_pieces[-5:])  # Last 5 pieces
        
        messages = [
            SystemMessage(content="""You are an exploration decision expert. Given the current context and query, 
            decide if we should continue exploring the knowledge graph for more information.
            Consider if the current context is sufficient to answer the query.
            Respond with only 'yes' or 'no'."""),
            HumanMessage(content=f"Query: {state.query}\nCurrent context:\n{context_summary}\nExploration depth: {state.exploration_depth}/{state.max_depth}")
        ]
        
        try:
            response = self.llm.invoke(messages)
            return response.content.lower().strip() == "yes"
        except Exception:
            # Default to continuing if we haven't reached max depth
            return state.exploration_depth < state.max_depth
    
    async def _synthesize_context(self, context_pieces: List[str], query: str) -> List[str]:
        """Synthesize and rank context pieces based on relevance to the query"""
        if not context_pieces:
            return []
        
        messages = [
            SystemMessage(content="""You are a context synthesis expert. Given a list of context pieces and a query, 
            synthesize and rank the most relevant information. Remove redundancy, resolve contradictions, and order by relevance.
            Return only the most relevant context statements, one per line."""),
            HumanMessage(content=f"Query: {query}\nContext pieces:\n" + "\n".join(context_pieces))
        ]
        
        try:
            response = self.llm.invoke(messages)
            synthesized = [line.strip() for line in response.content.split('\n') if line.strip()]
            return synthesized
        except Exception:
            return context_pieces
    
    async def retrieve_context(self, query: str, max_depth: int = 3) -> List[str]:
        """Main method to retrieve context using the agentic workflow"""
        # Initialize state as dict
        initial_state = asdict(AgentState(
            query=query,
            discovered_nodes=set(),
            explored_nodes=set(),
            explored_relationships=set(),
            context_pieces=[],
            max_depth=max_depth
        ))
        
        # Run the workflow
        config = {"configurable": {"thread_id": "context_retrieval"}}
        result = await self.graph.ainvoke(initial_state, config)
        
        return result["context_pieces"]

    async def retrieve_context_stream(self, query: str, max_depth: int = 3):
        """Generator version: yields each step as a string (JSON) as it happens."""
        initial_state = asdict(AgentState(
            query=query,
            discovered_nodes=set(),
            explored_nodes=set(),
            explored_relationships=set(),
            context_pieces=[],
            max_depth=max_depth
        ))
        
        # Custom runner to yield steps as they happen
        state = initial_state
        
        # similarity_search
        state = await self._similarity_search_node(state, step_callback=lambda x: None)
        # Manually yield the events that would have been sent by step_callback
        yield json.dumps({"step": "similarity_search", "status": "started"})
        yield json.dumps({
            "step": "similarity_search",
            "query": state["query"],
            "discovered_nodes": list(state["discovered_nodes"]),
            "reasoning": state["reasoning"]
        })
        yield json.dumps({"step": "similarity_search", "status": "finished"})
        
        # node_exploration
        state = await self._node_exploration_node(state, step_callback=lambda x: None)
        yield json.dumps({"step": "node_exploration", "status": "started"})
        yield json.dumps({
            "step": "node_exploration",
            "unexplored": list(state["discovered_nodes"] - state["explored_nodes"]),
            "current_focus": state["current_focus"],
            "explored_nodes": list(state["explored_nodes"]),
            "reasoning": state["reasoning"]
        })
        yield json.dumps({"step": "node_exploration", "status": "finished"})
        
        # relationship_exploration
        state = await self._relationship_exploration_node(state, step_callback=lambda x: None)
        yield json.dumps({"step": "relationship_exploration", "status": "started"})
        yield json.dumps({
            "step": "relationship_exploration",
            "current_focus": state["current_focus"],
            "explored_relationships": list(state["explored_relationships"])
        })
        yield json.dumps({"step": "relationship_exploration", "status": "finished"})
        
        # decision_maker
        state = await self._decision_maker_node(state, step_callback=lambda x: None)
        yield json.dumps({"step": "decision_maker", "status": "started"})
        yield json.dumps({
            "step": "decision_maker",
            "depth": f"{state['exploration_depth']}/{state['max_depth']}",
            "should_continue": state["should_continue"],
            "reasoning": state["reasoning"]
        })
        yield json.dumps({"step": "decision_maker", "status": "finished"})
        
        # context_synthesis
        state = await self._context_synthesis_node(state, step_callback=lambda x: None)
        yield json.dumps({"step": "context_synthesis", "status": "started"})
        yield json.dumps({
            "step": "context_synthesis",
            "context_pieces": len(state["context_pieces"])
        })
        yield json.dumps({"step": "context_synthesis", "status": "finished"})
        
        # Final context
        yield json.dumps({"step": "final_context", "context": state["context_pieces"]})


# Convenience function for backward compatibility
async def agentic_context_retrieval(
    question: str,
    llm,
    db: Neo4jDatabase,
    vector_store,
    max_depth: int = 3
) -> List[str]:
    """
    Agentic workflow to retrieve context from the graph database using LangGraph.
    Implements similarity search, node exploration, relationship traversal, and iterative context gathering.
    """
    agent = AgenticContextRetrieval(llm, db, vector_store)
    return await agent.retrieve_context(question, max_depth) 

async def agentic_context_retrieval_stream(
    question: str,
    llm,
    db: Neo4jDatabase,
    vector_store,
    max_depth: int = 3
):
    agent = AgenticContextRetrieval(llm, db, vector_store)
    async for step in agent.retrieve_context_stream(question, max_depth):
        yield step 