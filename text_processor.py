import spacy
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import SystemMessage, HumanMessage
import json
import os
from dotenv import load_dotenv
from graph_db import Neo4jDatabase

# Load environment variables
load_dotenv()

# Get API key
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
if not GOOGLE_API_KEY:
    raise ValueError("GOOGLE_API_KEY not found in environment variables. Please check your .env file.")

class TextProcessor:
    def __init__(self, max_iterations=3):
        self.nlp = spacy.load("en_core_web_sm")
        self.db = Neo4jDatabase()
        self.llm = ChatGoogleGenerativeAI(
            model="gemini-1.5-flash",
            google_api_key=GOOGLE_API_KEY,
            convert_system_message_to_human=True
        )
        self.max_iterations = max_iterations

    def get_existing_entities(self):
        """Get all existing entities from Neo4j"""
        try:
            return self.db.get_all_entities()
        except Exception as e:
            print(f"Warning: Failed to get existing entities: {str(e)}")
            return []

    def extract_entities(self, text, existing_entities=None, iteration=1):
        """Extract entities using SpaCy and match against existing entities"""
        # Get entities from SpaCy
        doc = self.nlp(text)
        entities = []
        
        # First pass: Get SpaCy entities
        for ent in doc.ents:
            entities.append({
                "name": ent.text,
                "type": ent.label_,
                "start": ent.start_char,
                "end": ent.end_char,
                "iteration": iteration,
                "description": f"Entity of type {ent.label_} found in text."
            })
        
        print

        # Second pass: Check existing entities from Neo4j and previous iterations
        all_existing = existing_entities or self.get_existing_entities()
        text_lower = text.lower()
        
        for entity in all_existing:
            entity_lower = entity["name"].lower()
            if entity_lower in text_lower:
                if not any(e["name"].lower() == entity_lower for e in entities):
                    entities.append({
                        "name": entity["name"],
                        "type": entity["type"],
                        "start": text_lower.find(entity_lower),
                        "end": text_lower.find(entity_lower) + len(entity_lower),
                        "iteration": iteration,
                        "description": entity.get("description", f"Entity of type {entity['type']} found in text.")
                    })

        # Third pass: Use LLM to identify potential entities missed by SpaCy
        if iteration == 1:  # Only do this in first iteration to avoid redundancy
            potential_entities = self._identify_potential_entities(text, entities)
            for entity in potential_entities:
                if not any(e["name"].lower() == entity["name"].lower() for e in entities):
                    description = entity.get("description", f"Entity of type {entity.get('type', 'UNKNOWN')} found in text.")
                    entities.append({**entity, "iteration": iteration, "description": description})

        return entities

    def _identify_potential_entities(self, text, existing_entities):
        """Use LLM to identify potential entities missed by SpaCy"""
        try:
            system_prompt = """You are an entity extraction expert. Analyze the text and identify potential entities that might have been missed.
            Focus on:
            - Technical terms and concepts
            - Product names
            - Organizations
            - Complex person names
            - Locations
            Return ONLY a JSON array of entities without any markdown formatting."""

            human_content = f"""Text: {text}

Already identified entities: {[e["name"] for e in existing_entities]}

Required JSON Format:
[
    {{"name": "Entity Name", "type": "PERSON/ORG/PRODUCT/LOCATION/CONCEPT"}}
]

Rules:
1. Only include entities NOT in the already identified list
2. Focus on entities that might be missed by traditional NLP
3. Return only the raw JSON array
4. Ensure proper JSON formatting"""

            messages = [
                SystemMessage(content=system_prompt),
                HumanMessage(content=human_content)
            ]

            response = self.llm.invoke(messages)
            content = self._clean_llm_response(response.content)
            return json.loads(content)
        except Exception as e:
            print(f"Warning: Failed to identify potential entities: {str(e)}")
            return []

    def identify_relationships(self, text, entities, existing_relationships=None, iteration=1):
        """Use LangChain and Gemini to identify relationships between entities"""
        try:
            entity_names = [e["name"] for e in entities]
            context = []

            # Add context from existing relationships if available
            if existing_relationships:
                context.extend([
                    f"{rel['from']} {rel['type']} {rel['to']}"
                    for rel in existing_relationships
                ])

            # Get additional context from Neo4j for known entities
            db_context = self.db.get_context(entity_names)
            if db_context:
                context.extend(db_context)

            system_prompt = """You are a relationship extraction expert. Your task is to identify explicit and implicit relationships between entities in text and return them in valid JSON format.
            Common relationship types include:
            - FOUNDED (person founded company)
            - LEADS/CEO_OF (person leads/manages company)
            - HEADQUARTERED_IN (company located in place)
            - ACQUIRED (company acquired company)
            - DEVELOPED (company/person created product)
            - INVESTED_IN (company invested in company)
            - PARTNERED_WITH (company partnered with company)
            - PART_OF (component is part of system)
            - USES (entity uses tool/technology)
            - RELATED_TO (general relationship)
            
            IMPORTANT: Return ONLY the raw JSON array without any markdown formatting."""
            
            human_content = f"""Analyze the following text and extract relationships between entities. This is iteration {iteration} of the analysis.

Text: {text}

Available Entities: {', '.join(entity_names)}

Additional Context:
{chr(10).join(context) if context else "No additional context available"}

Required JSON Format:
[
    {{"from": "Entity1", "type": "RELATIONSHIP_TYPE", "to": "Entity2"}}
]

Rules:
1. Include both explicit and implicit relationships from the text
2. Use UPPERCASE for relationship types
3. Entities must be from the provided list
4. Consider the additional context provided
5. Look for relationships that might have been missed in previous iterations
6. Return only the raw JSON array"""

            messages = [
                SystemMessage(content=system_prompt),
                HumanMessage(content=human_content)
            ]

            response = self.llm.invoke(messages)
            content = self._clean_llm_response(response.content)
            
            relationships = json.loads(content)
            
            # Add iteration information
            for rel in relationships:
                rel["iteration"] = iteration
                
            return relationships

        except Exception as e:
            print(f"Error in identify_relationships: {str(e)}")
            return []

    def _clean_llm_response(self, content):
        """Clean up the LLM response content"""
        content = content.strip()
        # Remove markdown code block if present
        if content.startswith("```") and content.endswith("```"):
            content = content[content.find("\n")+1:content.rfind("```")].strip()
        # Remove language specifier if present
        if content.startswith("json\n"):
            content = content[5:].strip()
        return content

    def process_text(self, text):
        """Process text to extract entities and relationships iteratively"""
        all_entities = []
        all_relationships = []
        
        for iteration in range(1, self.max_iterations + 1):
            print(f"\nStarting iteration {iteration}...")
            
            # Extract entities using current context
            new_entities = self.extract_entities(
                text,
                existing_entities=all_entities,
                iteration=iteration
            )
            
            # Identify relationships using all known entities and relationships
            new_relationships = self.identify_relationships(
                text,
                all_entities + new_entities,
                existing_relationships=all_relationships,
                iteration=iteration
            )
            
            # Add new findings to our collections
            all_entities.extend([e for e in new_entities if not any(
                existing["name"].lower() == e["name"].lower() 
                for existing in all_entities
            )])
            
            all_relationships.extend([r for r in new_relationships if not any(
                existing["from"] == r["from"] 
                and existing["to"] == r["to"] 
                and existing["type"] == r["type"]
                for existing in all_relationships
            )])
            
            # If no new entities or relationships were found, we can stop early
            if not new_entities and not new_relationships and iteration > 1:
                print(f"No new findings in iteration {iteration}, stopping early.")
                break
                
            print(f"Iteration {iteration} found {len(new_entities)} new entities and {len(new_relationships)} new relationships.")
        
        return all_entities, all_relationships 