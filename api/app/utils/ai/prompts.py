"""
Centralized prompts for the chat service
"""
from typing import List
class ChatPrompts:
    """Collection of prompts used in the chat service"""
    
    @staticmethod
    def get_query_classification_prompt(query: str) -> str:
        """Get the prompt for classifying if a query needs RAG or just chat"""
        return f"""
        Classify the following query to determine if it needs information retrieval or just conversational response.
        
        Query: {query}
        
        If the query is asking for specific information, facts, or knowledge that might be in a knowledge base, respond with "rag".
        If the query is just casual conversation, greetings, or general chat, respond with "chat".
        
        Respond with only "rag" or "chat".
        """
    
    @staticmethod
    def get_medical_rag_prompt(context: List[str], query: str) -> str:
        context_text = "\n\n".join(context) if context else "No additional documents available."

        return f"""
            You are a highly qualified and experienced medical doctor. 
            Your role is to provide accurate, professional, and compassionate medical guidance. 

            USER QUESTION:
            ---
            {query}
            ---

            RETRIEVED CONTEXT (may or may not be relevant):
            ---
            {context_text}
            ---

            TASK:
            - Analyze the user’s question carefully.
            - If any of the retrieved context is helpful, use it to support your reasoning.
            - If the retrieved context is irrelevant, ignore it and rely on your own medical knowledge.
            - Provide a clear, medically accurate, and empathetic answer or suggestion.
            - Include actionable advice when appropriate (e.g., further tests, lifestyle adjustments, or when to consult a specialist).
            - Do not mention the words “context” or “documents” in your answer; integrate the information naturally.
            - Always communicate as a trusted medical doctor speaking directly to the patient.
            """

    @staticmethod
    def get_rag_reasoning_prompt(initial_response: str, query: str, context: list) -> str:
        """Get the prompt for reasoning through and enhancing the initial RAG response"""
        return f"""
        You are an expert AI assistant. You have provided an initial response to a user's question based on retrieved context. Now, please reason through your response and enhance it with your knowledge and expertise.
        
        User Question: {query}
        
        Retrieved Context:
        {chr(10).join(context)}
        
        Your Initial Response:
        {initial_response}
        
        Now, please:
        1. Review your initial response critically
        2. Consider if there are gaps in the information from the context
        3. Enhance the response with your general knowledge and expertise
        4. Provide additional insights, explanations, or clarifications that would be helpful
        5. Ensure the response is comprehensive, well-structured, and addresses the user's question thoroughly
        6. If the context is insufficient, acknowledge this and provide what you can from your knowledge
        
        Provide a well-reasoned, enhanced response that combines the retrieved information with your expertise.
        """
    
    @staticmethod
    def get_conversational_response_prompt(query: str) -> str:
        """Get the prompt for generating conversational responses"""
        return f"""
        You are a friendly AI assistant. The user said: {query}
        
        Provide a natural, conversational response. Be helpful and engaging.
        """
    
    @staticmethod
    def get_follow_up_questions_prompt(query: str, response: str) -> str:
        """Get the prompt for generating follow-up questions"""
        return f"""
        Based on the user's question and your response, generate 3-4 relevant follow-up questions that the user might want to ask next.
        
        User Question: {query}
        Your Response: {response}
        
        Generate follow-up questions that are:
        1. Relevant to the topic
        2. Natural conversation flow
        3. Helpful for the user
        4. Different from each other
        
        Return only the questions, one per line, without numbering or formatting.
        """
