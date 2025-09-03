from typing import List, Optional
from ...schemas.ai.health_insights import HealthContext, HealthInsight 
from ...schemas.ai.goals import Goal
from ...schemas.backend.diagnosis import DiagnosisRequest, DiagnosisResult
from ..miscellaneous.graph_db import get_graph_db
from ..miscellaneous.mai_dxo_service import MAIDxOService
import logging
from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import JsonOutputParser
logger = logging.getLogger(__name__)

class HealthInsightsService:
    def __init__(self):
        self.graph_db = get_graph_db()
        self.mai_dxo_service = MAIDxOService()

    def extract_goal_context(self, goal: Goal) -> HealthContext:
        """Extract relevant health context from the graph database for a given goal using semantic search"""
        try:
            query = f"Find health context for: {goal.title}. Details: {goal.description}"
            context_data = self.graph_db.get_context(
                query=query,
                user_email=goal.user_email
            )
            goal_entities = []
            medical_context = []
            lifestyle_factors = []
            risk_factors = []

            for item in context_data:
                if "Medical" in item or "Condition" in item or "Symptom" in item:
                    medical_context.append(item)
                elif "Lifestyle" in item or "Activity" in item:
                    lifestyle_factors.append(item)
                elif "Risk" in item or "Warning" in item:
                    risk_factors.append(item)
                else:
                    goal_entities.append(item)

            return HealthContext(
                goal_related_entities=goal_entities,
                medical_context=medical_context,
                lifestyle_factors=lifestyle_factors,
                risk_factors=risk_factors
            )
        except Exception as e:
            logger.error(f"Error extracting goal context: {str(e)}")
            raise

    def get_health_insight(self, goal, context: list = None, user_email: str = None) -> HealthInsight:
        """Generate health insights using LLM with structured JSON response and wrap into HealthInsight."""
        try:
            if context is None:
                context = []

            # Step 1: Use LLM to intelligently categorize context items
            context_categorization_schema = {
                "title": "ContextCategorization",
                "description": "Intelligently categorize health-related context items",
                "type": "object",
                "properties": {
                    "goal_related_entities": {
                        "type": "array", 
                        "items": {"type": "string"},
                        "description": "Items directly related to the health goal (apps, devices, activities)"
                    },
                    "medical_context": {
                        "type": "array", 
                        "items": {"type": "string"},
                        "description": "Medical conditions, symptoms, diagnoses, treatments"
                    },
                    "lifestyle_factors": {
                        "type": "array", 
                        "items": {"type": "string"},
                        "description": "Diet, exercise, sleep, habits, daily activities"
                    },
                    "risk_factors": {
                        "type": "array", 
                        "items": {"type": "string"},
                        "description": "Health risks, warnings, contraindications, precautions"
                    }
                },
                "required": ["goal_related_entities", "medical_context", "lifestyle_factors", "risk_factors"]
            }

            context_llm = ChatOpenAI(model="gpt-4o-mini", temperature=0).with_structured_output(context_categorization_schema)
            
            context_prompt = ChatPromptTemplate.from_messages([
                ("system", """You are a medical AI assistant that intelligently categorizes health-related information. 
                Analyze each context item and categorize it into the most appropriate category:
                - goal_related_entities: Apps, devices, tools, or activities directly related to achieving the health goal
                - medical_context: Medical conditions, symptoms, diagnoses, medications, treatments, medical history
                - lifestyle_factors: Diet, exercise, sleep patterns, habits, daily routines, work-life balance
                - risk_factors: Health risks, warnings, contraindications, genetic factors, environmental risks
                
                If an item doesn't clearly fit any category, place it in goal_related_entities as default.
                If no items exist for a category, return an empty array for that category."""),
                ("user", """Health Goal: {goal}
                
                Context Items to Categorize:
                {context_items}

                Please categorize these items appropriately.""")
            ])

            context_chain = context_prompt | context_llm
            categorized_context = context_chain.invoke({
                "goal": f"{goal.title} - {goal.description}",
                "context_items": "\n".join([f"- {item}" for item in context])
            })

            # Step 2: Create HealthContext with LLM-categorized items
            health_context = HealthContext(
                goal_related_entities=categorized_context.get("goal_related_entities", []),
                medical_context=categorized_context.get("medical_context", []),
                lifestyle_factors=categorized_context.get("lifestyle_factors", []),
                risk_factors=categorized_context.get("risk_factors", [])
            )

            # Step 3: Generate health insights using the structured context
            insight_schema = {
                "title": "HealthInsightGeneration",
                "description": "Generate comprehensive health insights based on categorized context",
                "type": "object",
                "properties": {
                    "diagnosis_summary": {
                        "type": "string",
                        "description": "A comprehensive summary of the health situation and goal analysis"
                    },
                    "health_considerations": {
                        "type": "array", 
                        "items": {"type": "string"},
                        "description": "Important health factors to consider for this goal"
                    },
                    "medical_precautions": {
                        "type": "array", 
                        "items": {"type": "string"},
                        "description": "Medical warnings, precautions, or recommendations"
                    },
                    "risk_factors": {
                        "type": "array", 
                        "items": {"type": "string"},
                        "description": "Identified risk factors that could impact the goal"
                    },
                    "safety_notes": {
                        "type": "array", 
                        "items": {"type": "string"},
                        "description": "General safety considerations and best practices"
                    }
                },
                "required": [
                    "diagnosis_summary",
                    "health_considerations", 
                    "medical_precautions",
                    "risk_factors",
                    "safety_notes"
                ]
            }

            insight_llm = ChatOpenAI(model="gpt-4o-mini", temperature=0).with_structured_output(insight_schema)

            insight_prompt = ChatPromptTemplate.from_messages([
                ("system", """You are a medical assistant that provides comprehensive health insights and recommendations.
                Based on the health goal and categorized context, provide detailed analysis and actionable recommendations.
                Be thorough but practical in your recommendations."""),
                ("user", """Health Goal: {goal}

                Goal-Related Entities: {goal_entities}
                Medical Context: {medical_context}  
                Lifestyle Factors: {lifestyle_factors}
                Risk Factors: {risk_factors}

                Generate comprehensive health insights considering all these factors.""")
            ])

            insight_chain = insight_prompt | insight_llm
            diagnosis_result = insight_chain.invoke({
                "goal": f"{goal.title} - {goal.description}",
                "goal_entities": "\n".join(health_context.goal_related_entities) or "None specified",
                "medical_context": "\n".join(health_context.medical_context) or "None specified",
                "lifestyle_factors": "\n".join(health_context.lifestyle_factors) or "None specified", 
                "risk_factors": "\n".join(health_context.risk_factors) or "None specified"
            })

            return HealthInsight(
                goal_id=str(goal.id),
                goal_title=goal.title,
                context=health_context,
                diagnosis_summary=diagnosis_result.get("diagnosis_summary"),
                health_considerations=diagnosis_result.get("health_considerations", []),
                medical_precautions=diagnosis_result.get("medical_precautions", []),
                risk_factors=diagnosis_result.get("risk_factors", []),
                safety_notes=diagnosis_result.get("safety_notes", [])
            )

        except Exception as e:
            logger.error(f"Error generating health insight: {str(e)}")
            raise




    def _extract_health_considerations(self, diagnosis: Optional[DiagnosisResult], context: HealthContext) -> List[str]:
        """Extract health considerations from diagnosis and context"""
        considerations = []
        
        if diagnosis and diagnosis.hypotheses:
            considerations.extend([f"Consider {h.diagnosis}: {h.justification}" for h in diagnosis.hypotheses])
            
            if diagnosis.checklist_feedback and diagnosis.checklist_feedback.recommendations:
                considerations.extend(diagnosis.checklist_feedback.recommendations)
        
        considerations.extend([ctx for ctx in context.medical_context if ctx not in considerations])
        
        return considerations

    def _extract_medical_precautions(self, diagnosis: Optional[DiagnosisResult], context: HealthContext) -> List[str]:
        """Extract medical precautions from diagnosis and context"""
        precautions = []
        
        if diagnosis and diagnosis.challenger_feedback:
            precautions.extend(diagnosis.challenger_feedback.missing_considerations)
            precautions.extend(diagnosis.challenger_feedback.risk_factors)
            
        precautions.extend([risk for risk in context.risk_factors if risk not in precautions])
        
        return precautions

    def _extract_risk_factors(self, diagnosis: Optional[DiagnosisResult], context: HealthContext) -> List[str]:
        """Extract risk factors from diagnosis and context"""
        return context.risk_factors

    def _generate_safety_notes(self, diagnosis: Optional[DiagnosisResult], context: HealthContext) -> List[str]:
        """Generate safety notes based on diagnosis and context"""
        safety_notes = []
        
        if diagnosis:
            for hypothesis in diagnosis.hypotheses:
                if hypothesis.confidence > 70:
                    safety_notes.append(f"Important - {hypothesis.diagnosis}: {hypothesis.justification}")
            
            if diagnosis.checklist_feedback:
                safety_notes.extend([f"Attention needed: {element}" for element in diagnosis.checklist_feedback.missing_elements])
            
            if diagnosis.challenger_feedback:
                safety_notes.append(f"Medical advisory: {diagnosis.challenger_feedback.critique}")
        
        for factor in context.lifestyle_factors:
            if any(kw in factor.lower() for kw in ['caution', 'warning', 'avoid', 'risk', 'safety']):
                safety_notes.append(factor)
                
        return safety_notes

health_insights_service = None

def get_health_insights_service() -> HealthInsightsService:
    global health_insights_service
    if health_insights_service is None:
        health_insights_service = HealthInsightsService()
    return health_insights_service
