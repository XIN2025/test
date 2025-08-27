"""
Centralized prompts for the chat service
"""

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
    def get_rag_response_prompt(context: list, query: str) -> str:
        """Get the prompt for generating initial RAG-based responses"""
        return f"""
        You are a helpful AI assistant. Answer the user's question based on the provided context.
        
        Context:
        {chr(10).join(context)}
        
        User Question: {query}
        
        Provide a helpful and accurate response based on the context. If the context doesn't contain enough information to answer the question, say so politely.
        
        Focus on extracting and presenting the information from the provided context accurately.
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
