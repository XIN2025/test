import asyncio
from typing import List, Dict, Any
from dataclasses import dataclass, asdict
from langchain_core.messages import SystemMessage, HumanMessage
from langgraph.graph import StateGraph, END

from langchain_openai import ChatOpenAI
import logging
from ...config import OPENAI_API_KEY, LLM_MODEL, LLM_TEMPERATURE
# from .vector_store import get_vector_store
from app.services.ai_services.mongodb_vectorstore import get_vector_store
from app.utils.ai.prompts import ChatPrompts

logger = logging.getLogger(__name__)

@dataclass
class ChatState:
    """State for the chat workflow"""
    query: str
    context: List[str]
    user_email: str
    response: str = ""
    follow_up_questions: List[str] = None
    reasoning: str = ""
    should_use_rag: bool = True

class ChatService:
    def __init__(self):
        self.llm = ChatOpenAI(
            model=LLM_MODEL,
            openai_api_key=OPENAI_API_KEY,
            temperature=LLM_TEMPERATURE
        )
        self.vector_store = get_vector_store()
        self.graph = self._build_graph()
    
    def _build_graph(self) -> StateGraph:
        """Build the LangGraph workflow for chat"""
        workflow = StateGraph(ChatState)
        
        # Add nodes
        workflow.add_node("query_classifier", self._query_classifier_node)
        workflow.add_node("context_retrieval", self._context_retrieval_node)
        workflow.add_node("response_generation", self._response_generation_node)
        workflow.add_node("follow_up_generation", self._follow_up_generation_node)
        
        # Add edges
        workflow.set_entry_point("query_classifier")
        workflow.add_conditional_edges(
            "query_classifier",
            self._should_use_rag,
            {
                "rag": "context_retrieval",
                "chat": "response_generation"
            }
        )
        workflow.add_edge("context_retrieval", "response_generation")
        workflow.add_edge("response_generation", "follow_up_generation")
        workflow.add_edge("follow_up_generation", END)
        
        return workflow.compile()
    
    async def _query_classifier_node(self, state: ChatState) -> dict:
        """Classify if the query needs RAG or just chat"""
        print(f"🤖 [QUERY CLASSIFIER] Starting query classification for: '{state.query}'")
        
        if isinstance(state, dict):
            state = ChatState(**state)
        
        classification_prompt = ChatPrompts.get_query_classification_prompt(state.query)
        
        print(f"🤖 [QUERY CLASSIFIER] Step 1: Sending classification prompt to LLM...")
        print(f"🤖 [QUERY CLASSIFIER] Step 1: Prompt: {classification_prompt}")
        
        try:
            print(f"🤖 [QUERY CLASSIFIER] Step 2: Calling LLM...")
            response = self.llm.invoke([HumanMessage(content=classification_prompt)])
            print(f"🤖 [QUERY CLASSIFIER] Step 2: ✅ LLM response received: {response.content}")
            
            classification = response.content.strip().lower()
            state.should_use_rag = classification == "rag"
            state.reasoning = f"Query classified as {classification}"
            
            print(f"🤖 [QUERY CLASSIFIER] Step 3: ✅ Classification result: {classification}")
            print(f"🤖 [QUERY CLASSIFIER] Step 3: Should use RAG: {state.should_use_rag}")
            print(f"🤖 [QUERY CLASSIFIER] Step 3: Reasoning: {state.reasoning}")
            
            logger.info(f"Query '{state.query}' classified as {classification}")
        except Exception as e:
            print(f"❌ [QUERY CLASSIFIER] ❌ Error in query classification: {e}")
            print(f"❌ [QUERY CLASSIFIER] ❌ Error type: {type(e).__name__}")
            import traceback
            print(f"❌ [QUERY CLASSIFIER] ❌ Full traceback:")
            print(traceback.format_exc())
            
            logger.error(f"Error in query classification: {e}")
            state.should_use_rag = True  # Default to RAG
            state.reasoning = f"Classification failed, defaulting to RAG: {e}"
        
        print(f"🤖 [QUERY CLASSIFIER] ✅ Returning state: {asdict(state)}")
        return asdict(state)
    
    async def _context_retrieval_node(self, state: ChatState) -> dict:
        """Retrieve relevant context directly from vector store (no graph DB)."""
        if isinstance(state, dict):
            state = ChatState(**state)

        print(f"\n🔍 [CONTEXT RETRIEVAL] Starting context retrieval for query: '{state.query}'")

        try:
            # Step 1: Run vector search
            print(f"🔍 [CONTEXT RETRIEVAL] Step 1: Running vector search...")
            relevant_docs = self.vector_store.search(
                query=state.query,
                user_email=state.user_email,
                top_k=10  
            )
            print(f"🔍 [CONTEXT RETRIEVAL] Step 2: Retrieved {len(relevant_docs)} docs from vector store")

            # Step 2: Extract text chunks
            context_pieces = []
            for i, doc in enumerate(relevant_docs):
                text = doc.get("text", "")
                if text.strip():
                    context_pieces.append(text)
                    print(f"🔍 [CONTEXT RETRIEVAL] Step 2.{i+1}: Added context piece: {text[:100]}...")
                else:
                    print(f"🔍 [CONTEXT RETRIEVAL] Step 2.{i+1}: ⚠️ Skipped empty text chunk")

            # Step 3: Limit to top 10 for safety
            state.context = context_pieces
            state.reasoning += f" Retrieved {len(state.context)} text chunks from vector store"

            print(f"✅ [CONTEXT RETRIEVAL] Completed successfully")
            print(f"✅ [CONTEXT RETRIEVAL] Total context pieces: {len(state.context)}")
            for i, piece in enumerate(state.context):
                print(f"   Context {i+1}: {piece[:100]}...")

            logger.info(f"Retrieved {len(state.context)} context pieces for query '{state.query}'")

        except Exception as e:
            print(f"❌ [CONTEXT RETRIEVAL] Error: {e}")
            logger.error(f"Error in context retrieval: {e}")
            state.context = []
            state.reasoning += f" Context retrieval failed: {e}"

        return asdict(state)

    
    async def _response_generation_node(self, state: ChatState) -> dict:
        """Generate response in one step, acting as a medical doctor with optional RAG context."""
        print(f"💬 [RESPONSE GENERATION] Starting response generation for query: '{state.query}'")

        if isinstance(state, dict):
            state = ChatState(**state)

        try:
            # Build single-step medical prompt
            print(f"💬 [RESPONSE GENERATION] Step 1: Building medical prompt...")
            rag_prompt = ChatPrompts.get_medical_rag_prompt(state.context, state.query)

            print(f"💬 [RESPONSE GENERATION] Step 2: Sending prompt to LLM...")
            response = self.llm.invoke([HumanMessage(content=rag_prompt)])
            state.response = response.content.strip()

            print(f"💬 [RESPONSE GENERATION] ✅ Response received: {state.response[:100]}...")
            logger.info(f"Generated medical RAG response for query '{state.query}'")

        except Exception as e:
            print(f"❌ [RESPONSE GENERATION] Error generating response: {e}")
            logger.error(f"Error generating response: {e}")
            state.response = "I’m sorry, but I’m having trouble processing your request right now. Please try again later."

        return asdict(state)

    
    async def _follow_up_generation_node(self, state: ChatState) -> dict:
        """Generate follow-up questions based on the response"""
        if isinstance(state, dict):
            state = ChatState(**state)
        
        follow_up_prompt = ChatPrompts.get_follow_up_questions_prompt(state.query, state.response)
        
        try:
            response = self.llm.invoke([HumanMessage(content=follow_up_prompt)])
            follow_up_text = response.content.strip()
            # Split by lines and clean up
            follow_up_questions = [q.strip() for q in follow_up_text.split('\n') if q.strip()]
            state.follow_up_questions = follow_up_questions[:4]  # Limit to 4 questions
            logger.info(f"Generated {len(follow_up_questions)} follow-up questions")
        except Exception as e:
            logger.error(f"Error generating follow-up questions: {e}")
            state.follow_up_questions = []
        
        return asdict(state)
    
    def _should_use_rag(self, state: ChatState) -> str:
        """Determine if RAG should be used"""
        return "rag" if state.should_use_rag else "chat"
    
    async def chat(self, query: str, user_email: str) -> Dict[str, Any]:
        """Main chat method"""
        print(f"🚀 [CHAT] Starting chat for query: '{query}' from user: {user_email}")
        try:
            # Initialize state
            print(f"🚀 [CHAT] Step 1: Initializing ChatState...")
            initial_state = ChatState(query=query, context=[], user_email=user_email, follow_up_questions=[])
            print(f"🚀 [CHAT] Step 1: ✅ ChatState initialized: {initial_state}")
            
            # Run the workflow
            print(f"🚀 [CHAT] Step 2: Running LangGraph workflow...")
            result = await self.graph.ainvoke(initial_state)
            print(f"🚀 [CHAT] Step 2: ✅ Workflow completed successfully!")
            print(f"🚀 [CHAT] Step 2: Result: {result}")
            
            response_data = {
                "success": True,
                "response": result.get("response", ""),
                "follow_up_questions": result.get("follow_up_questions", []),
                "context_used": len(result.get("context", [])),
                "reasoning": result.get("reasoning", "")
            }
            print(f"🚀 [CHAT] Step 3: ✅ Returning response: {response_data}")
            return response_data
            
        except Exception as e:
            print(f"❌ [CHAT] ❌ Error in chat workflow: {e}")
            print(f"❌ [CHAT] ❌ Error type: {type(e).__name__}")
            import traceback
            print(f"❌ [CHAT] ❌ Full traceback:")
            print(traceback.format_exc())
            
            logger.error(f"Error in chat workflow: {e}")
            return {
                "success": False,
                "response": "I apologize, but I'm having trouble processing your request right now. Please try again later.",
                "follow_up_questions": [],
                "error": str(e)
            }
    
    async def chat_stream(self, query: str, user_email: str):
        """Streaming chat method for real-time responses"""
        try:
            initial_state = ChatState(query=query, context=[], follow_up_questions=[])
            
            async for event in self.graph.astream(initial_state):
                if "response_generation" in event:
                    yield {
                        "type": "response",
                        "content": event["response_generation"].get("response", "")
                    }
                elif "follow_up_generation" in event:
                    yield {
                        "type": "follow_up",
                        "content": event["follow_up_generation"].get("follow_up_questions", [])
                    }
                elif "context_retrieval" in event:
                    yield {
                        "type": "context",
                        "content": f"Found {len(event['context_retrieval'].get('context', []))} relevant pieces of information"
                    }
        except Exception as e:
            logger.error(f"Error in streaming chat: {e}")
            yield {
                "type": "error",
                "content": "I apologize, but I'm having trouble processing your request right now."
            }

# Global instance
chat_service = None

def get_chat_service() -> ChatService:
    global chat_service
    if chat_service is None:
        chat_service = ChatService()
    return chat_service 