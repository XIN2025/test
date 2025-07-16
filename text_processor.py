import spacy
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import SystemMessage, HumanMessage
import json
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Get API key
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
if not GOOGLE_API_KEY:
    raise ValueError("GOOGLE_API_KEY not found in environment variables. Please check your .env file.")

class TextProcessor:
    def __init__(self):
        self.nlp = spacy.load("en_core_web_sm")
        self.llm = ChatGoogleGenerativeAI(
            model="gemini-1.5-flash",
            google_api_key=GOOGLE_API_KEY
        )

    def extract_entities(self, text):
        """Extract entities using SpaCy"""
        doc = self.nlp(text)
        entities = []
        for ent in doc.ents:
            entities.append({
                "name": ent.text,
                "type": ent.label_,
                "start": ent.start_char,
                "end": ent.end_char
            })
        return entities

    def identify_relationships(self, text, entities):
        """Use LangChain and Gemini to identify relationships between entities"""
        try:
            # Create a prompt for relationship identification
            entity_names = [e["name"] for e in entities]
            
            system_prompt = """You are a relationship extraction expert. Your task is to identify explicit relationships between entities in text and return them in valid JSON format.
            Common relationship types include:
            - FOUNDED (person founded company)
            - LEADS/CEO_OF (person leads/manages company)
            - HEADQUARTERED_IN (company located in place)
            - ACQUIRED (company acquired company)
            - DEVELOPED (company/person created product)
            - INVESTED_IN (company invested in company)
            - PARTNERED_WITH (company partnered with company)
            
            IMPORTANT: Return ONLY the raw JSON array without any markdown formatting or code blocks."""
            
            human_content = f"""Analyze the following text and extract relationships between entities. Return ONLY a JSON array of relationships.

Text: {text}

Available Entities: {', '.join(entity_names)}

Required JSON Format:
[
    {{"from": "Elon Musk", "type": "FOUNDED", "to": "SpaceX"}},
    {{"from": "SpaceX", "type": "HEADQUARTERED_IN", "to": "Hawthorne"}}
]

Rules:
1. Only include relationships explicitly stated in the text
2. Use UPPERCASE for relationship types
3. Entities in "from" and "to" must be from the provided entities list
4. Return only the raw JSON array, no markdown formatting or code blocks
5. Ensure the response is valid JSON with proper quotes and commas"""

            messages = [
                SystemMessage(content=system_prompt),
                HumanMessage(content=human_content)
            ]

            # Get response from LLM
            response = self.llm.invoke(messages)
            
            try:
                # Clean up the response content
                content = response.content.strip()
                # Remove markdown code block if present
                if content.startswith("```") and content.endswith("```"):
                    # Extract content between the first and last ```
                    content = content[content.find("\n")+1:content.rfind("```")].strip()
                # Remove "json" or other language specifiers if present
                if content.startswith("json\n"):
                    content = content[5:].strip()
                
                relationships = json.loads(content)
                return relationships
            except json.JSONDecodeError as e:
                print(f"Warning: Failed to parse JSON response: {str(e)}")
                print(f"Response content: {response.content}")
                print(f"Cleaned content: {content}")
                return []
                
        except Exception as e:
            print(f"Error in identify_relationships: {str(e)}")
            return []

    def process_text(self, text):
        """Process text to extract entities and relationships"""
        entities = self.extract_entities(text)
        relationships = self.identify_relationships(text, entities)
        return entities, relationships 