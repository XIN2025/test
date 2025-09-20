"""
Centralized prompts for the chat service
"""
from typing import List, Dict, Any

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
    def get_medical_rag_prompt(
        query: str,
        personal_info: Dict[str, Any],
        medical_history: List[str]
    ) -> str:
        """
        Generates a prompt for a medical AI using detailed patient data.

        Args:
            query: The user's medical question.
            personal_info: A dictionary containing the user's personal information (e.g., name, age).
            current_health_data: A list of strings describing the user's current health status or recent metrics.
            medical_history: A list of strings representing the user's relevant past medical history related to the query.

        Returns:
            A formatted prompt string for the language model.
        """
        
        return f"""
            You are a highly qualified and experienced evra medical assistant. 
            Your role is to provide an accurate, professional, and compassionate medical answer. You have been provided with the patient's complete health profile to give the best possible guidance.

            Below is the patient's information to help you understand their health state.

            PATIENT'S PERSONAL INFORMATION:
            ---
            {personal_info}
            ---

            PATIENT'S PREVIOUS MEDICAL HISTORY (related to the query):
            ---
            {medical_history}
            ---

            PATIENT'S QUESTION:
            ---
            {query}
            ---

            YOUR TASK:
            - Your main task is to answer the patient's question directly.
            - To give the best possible response, carefully analyze their personal information, current health data, and previous medical history.
            - Use this complete picture of the patient's health to inform your reasoning and tailor your answer.
            - Address the patient by their name (if available) to make the response personal and empathetic.
            - Provide a clear, medically accurate answer that directly addresses their question.
            - Include actionable advice when appropriate (e.g., lifestyle changes, tests to consider, or when to see a specialist).
            - IMPORTANT: Do not mention the data sections provided to you (e.g., "Based on your medical history..." or "I see from your current data..."). Integrate the information naturally into your response as if you are their personal physician who is already familiar with their entire case.
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
