import asyncio
from typing import List, Dict, Any
from dataclasses import dataclass, asdict
from langchain_core.messages import SystemMessage, HumanMessage
from langgraph.graph import StateGraph, END
from langchain_openai import ChatOpenAI
import logging
from datetime import datetime, date

from ...config import OPENAI_API_KEY, LLM_MODEL, LLM_TEMPERATURE
from app.services.ai_services.mongodb_vectorstore import get_vector_store
from app.utils.ai.prompts import ChatPrompts
from app.services.backend_services.db import get_db

logger = logging.getLogger(__name__)

@dataclass
class ChatState:
    query: str
    user_email: str
    context: List[str]
    response: str = ""
    follow_up_questions: List[str] = None
    reasoning: str = ""

class ChatService:
    def __init__(self):
        self.llm = ChatOpenAI(
            model=LLM_MODEL,
            openai_api_key=OPENAI_API_KEY,
            temperature=float(LLM_TEMPERATURE)
        )
        self.vector_store = get_vector_store()
        self.db = get_db()
        self.user_collection = self.db["users"]
        self.graph = self._build_graph()

    def _build_graph(self) -> StateGraph:
        workflow = StateGraph(ChatState)
        workflow.add_node("context_retrieval", self._context_retrieval_node)
        workflow.add_node("response_generation", self._response_generation_node)
        workflow.add_node("follow_up_generation", self._follow_up_generation_node)
        workflow.set_entry_point("context_retrieval")
        workflow.add_edge("context_retrieval", "response_generation")
        workflow.add_edge("response_generation", "follow_up_generation")
        workflow.add_edge("follow_up_generation", END)
        return workflow.compile()

    async def _context_retrieval_node(self, state: ChatState) -> dict:
        if isinstance(state, dict): state = ChatState(**state)
        logger.info(f"🔍 [CONTEXT RETRIEVAL] Starting context retrieval for query: '{state.query}'")
        try:
            relevant_docs = self.vector_store.search(
                query=state.query,
                user_email=state.user_email,
                top_k=10
            )
            logger.info(f"🔍 [CONTEXT RETRIEVAL] Step 2: Retrieved {len(relevant_docs)} docs from vector store")

            context_pieces = [doc.get("text", "") for doc in relevant_docs if doc.get("text", "").strip()]
            if context_pieces:
                logger.info(f"✅ [CONTEXT RETRIEVAL] Extracted {len(context_pieces)} non-empty context pieces.")
            else:
                logger.warning("⚠️ [CONTEXT RETRIEVAL] No context found after search.")

            state.context = context_pieces
            state.reasoning = f"Retrieved {len(context_pieces)} relevant text chunks from vector store."
        except Exception as e:
            logger.error(f"❌ [CONTEXT RETRIEVAL] Error during context retrieval: {e}", exc_info=True)
            state.context = []
            state.reasoning = f"Context retrieval failed: {e}"

        return asdict(state)

    async def _response_generation_node(self, state: ChatState) -> dict:
        if isinstance(state, dict): state = ChatState(**state)
        logger.info(f"💬 [RESPONSE GENERATION] Starting response generation for query: '{state.query}'")
        logger.info(f"💬 [RESPONSE GENERATION] Context pieces available: {len(state.context)}")

        user_context = "Patient details are not available."
        try:
            user = await self.user_collection.find_one({"email": state.user_email})
            if user:
                def calculate_age(dob_str):
                    if not dob_str: return "unknown"
                    try:
                        dob = datetime.strptime(dob_str, "%Y-%m-%d").date()
                        today = date.today()
                        return today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))
                    except (ValueError, TypeError): return "unknown"
                
                user_name = user.get("name", "User")
                date_of_birth = user.get("date_of_birth")
                age = calculate_age(date_of_birth)
                blood_type = user.get("blood_type", "unknown")
                user_context = f"Patient's name is {user_name}. Age is {age}. Blood type is {blood_type}."
                logger.info(f"💬 [RESPONSE GENERATION] Found user context: {user_context}")
            else:
                logger.warning(f"⚠️ [RESPONSE GENERATION] User with email {state.user_email} not found in 'users' collection.")
        except Exception as e:
            logger.error(f"❌ [RESPONSE GENERATION] Error fetching user data for {state.user_email}: {e}")

        try:
            rag_prompt = ChatPrompts.get_medical_rag_prompt(
                query=state.query,
                personal_info=user_context,
                medical_history=state.context
            )
            logger.info("💬 [RESPONSE GENERATION] Sending prompt to LLM...")
            
            response = self.llm.invoke([HumanMessage(content=rag_prompt)])
            state.response = response.content.strip()
            logger.info("💬 [RESPONSE GENERATION] ✅ LLM response received successfully.")
        except Exception as e:
            logger.error(f"❌ [RESPONSE GENERATION] LLM call failed: {e}", exc_info=True)
            state.response = "I’m sorry, but I encountered an error while processing your request. Please try again later."
        
        return asdict(state)

    async def _follow_up_generation_node(self, state: ChatState) -> dict:
        if isinstance(state, dict): state = ChatState(**state)
        
        if not state.response or "sorry" in state.response.lower() or "error" in state.response.lower():
            state.follow_up_questions = []
            return asdict(state)

        follow_up_prompt = ChatPrompts.get_follow_up_questions_prompt(state.query, state.response)
        try:
            response = self.llm.invoke([HumanMessage(content=follow_up_prompt)])
            follow_up_questions = [q.strip().lstrip("- ").lstrip("* ") for q in response.content.strip().split('\n') if q.strip()]
            state.follow_up_questions = follow_up_questions[:4]
        except Exception as e:
            logger.error(f"Error generating follow-up questions: {e}")
            state.follow_up_questions = []
            
        return asdict(state)
    
    async def chat(self, query: str, user_email: str) -> Dict[str, Any]:
        logger.info(f"🚀 [CHAT] Starting new chat for user '{user_email}' with query: '{query}'")
        try:
            initial_state = ChatState(query=query, user_email=user_email, context=[], follow_up_questions=[])
            logger.info(f"🚀 [CHAT] Step 1: ✅ ChatState initialized: {initial_state}")
            
            logger.info("🚀 [CHAT] Step 2: Running LangGraph workflow...")
            result = await self.graph.ainvoke(initial_state)
            logger.info(f"🚀 [CHAT] Step 2: ✅ Workflow completed successfully!")
            
            response_data = {
                "success": True,
                "response": result.get("response", ""),
                "follow_up_questions": result.get("follow_up_questions", []),
                "context_used": len(result.get("context", [])),
                "reasoning": result.get("reasoning", "")
            }
            logger.info(f"🚀 [CHAT] Step 3: ✅ Returning response: {response_data}")
            return response_data
            
        except Exception as e:
            logger.error(f"❌ [CHAT] Critical error in chat workflow for user '{user_email}': {e}", exc_info=True)
            return {
                "success": False,
                "response": "I apologize, but a critical error occurred. The technical team has been notified.",
                "follow_up_questions": [],
                "error": str(e)
            }

    async def chat_stream(self, query: str, user_email: str):
        try:
            initial_state = ChatState(query=query, user_email=user_email, context=[], follow_up_questions=[])
            async for event in self.graph.astream(initial_state):
                if "response_generation" in event:
                    yield {"type": "response_chunk", "content": event["response_generation"].get("response", "")}
                elif "follow_up_generation" in event:
                    yield {"type": "follow_up", "content": event["follow_up_generation"].get("follow_up_questions", [])}
        except Exception as e:
            logger.error(f"Error in streaming chat: {e}")
            yield {"type": "error", "content": "An error occurred during streaming."}

chat_service = None

def get_chat_service() -> ChatService:
    global chat_service
    if chat_service is None:
        chat_service = ChatService()
    return chat_service
