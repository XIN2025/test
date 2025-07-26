import os
import tempfile
import base64
from typing import List, Dict, Tuple, Optional
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import SystemMessage, HumanMessage
import spacy
import json
import logging
from ..config import GOOGLE_API_KEY, LLM_MODEL, LLM_TEMPERATURE
from .graph_db import get_graph_db
from .vector_store import get_vector_store

logger = logging.getLogger(__name__)

# Load spaCy model
try:
    nlp = spacy.load("en_core_web_sm")
except OSError:
    logger.warning("spaCy model not found. Please install with: python -m spacy download en_core_web_sm")
    nlp = None

class DocumentProcessor:
    def __init__(self):
        self.llm = ChatGoogleGenerativeAI(
            model=LLM_MODEL,
            google_api_key=GOOGLE_API_KEY,
            temperature=LLM_TEMPERATURE,
            convert_system_message_to_human=True
        )
        self.graph_db = get_graph_db()
        self.vector_store = get_vector_store()

    def process_text_file(self, content: str, filename: str) -> Dict:
        """Process a text file and extract entities and relationships"""
        logger.info(f"Processing text file: {filename}")
        
        try:
            # Extract entities and relationships
            entities, relationships = self._extract_entities_and_relationships(content)
            
            # Store in graph database
            self._store_in_graph(entities, relationships)
            
            # Update vector store
            self._update_vector_store(entities)
            
            return {
                "success": True,
                "filename": filename,
                "entities_count": len(entities),
                "relationships_count": len(relationships),
                "entities": entities,
                "relationships": relationships
            }
        except Exception as e:
            logger.error(f"Error processing text file {filename}: {e}")
            return {
                "success": False,
                "filename": filename,
                "error": str(e)
            }

    def process_pdf_file(self, file_content: bytes, filename: str) -> Dict:
        """Process a PDF file and extract entities and relationships"""
        logger.info(f"Processing PDF file: {filename}")
        
        try:
            # Extract text from PDF
            text_content = self._extract_text_from_pdf(file_content)
            
            # Process the extracted text
            return self.process_text_file(text_content, filename)
        except Exception as e:
            logger.error(f"Error processing PDF file {filename}: {e}")
            return {
                "success": False,
                "filename": filename,
                "error": str(e)
            }

    def _extract_text_from_pdf(self, file_content: bytes) -> str:
        """Extract text content from PDF bytes"""
        try:
            from unstructured.partition.pdf import partition_pdf
        except ImportError:
            raise ImportError("unstructured library not installed. Please install with: pip install unstructured")
        
        # Save PDF to temp file
        with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
            tmp.write(file_content)
            tmp_path = tmp.name
        
        try:
            # Extract elements from PDF
            elements = partition_pdf(
                filename=tmp_path,
                extract_images_in_pdf=False,  # We don't need images for text extraction
                infer_table_structure=True,
                chunking_strategy="by_title",
                max_characters=4000,
                new_after_n_chars=3800,
                combine_text_under_n_chars=2000,
            )
            
            # Extract text from elements
            text_chunks = []
            for element in elements:
                if hasattr(element, 'text') and element.text:
                    text_chunks.append(element.text)
            
            return "\n\n".join(text_chunks)
        finally:
            # Clean up temp file
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)

    def _extract_entities_and_relationships(self, text: str) -> Tuple[List[Dict], List[Dict]]:
        """Extract entities and relationships from text using LLM"""
        entities = []
        relationships = []
        
        # Use LLM to extract entities
        entity_prompt = f"""
        Extract entities from the following text. For each entity, provide:
        - name: The entity name
        - type: The entity type (PERSON, ORGANIZATION, LOCATION, CONCEPT, etc.)
        - description: A brief description of the entity
        
        Text: {text[:2000]}  # Limit text length for LLM
        
        Return the result as a JSON array of objects with keys: name, type, description
        """
        
        try:
            entity_response = self.llm.invoke([HumanMessage(content=entity_prompt)])
            entity_content = entity_response.content
            
            # Parse JSON response
            if "```json" in entity_content:
                json_start = entity_content.find("```json") + 7
                json_end = entity_content.find("```", json_start)
                entity_content = entity_content[json_start:json_end].strip()
            
            entities = json.loads(entity_content)
        except Exception as e:
            logger.error(f"Error extracting entities: {e}")
            # Fallback to spaCy if available
            if nlp:
                entities = self._extract_entities_spacy(text)
        
        # Use LLM to extract relationships
        if entities:
            relationship_prompt = f"""
            Extract relationships between entities from the following text. For each relationship, provide:
            - from: The source entity name
            - to: The target entity name  
            - type: The relationship type
            - description: A brief description of the relationship
            
            Entities found: {[e.get('name', '') for e in entities]}
            Text: {text[:2000]}
            
            Return the result as a JSON array of objects with keys: from, to, type, description
            """
            
            try:
                rel_response = self.llm.invoke([HumanMessage(content=relationship_prompt)])
                rel_content = rel_response.content
                
                # Parse JSON response
                if "```json" in rel_content:
                    json_start = rel_content.find("```json") + 7
                    json_end = rel_content.find("```", json_start)
                    rel_content = rel_content[json_start:json_end].strip()
                
                relationships = json.loads(rel_content)
            except Exception as e:
                logger.error(f"Error extracting relationships: {e}")
        
        return entities, relationships

    def _extract_entities_spacy(self, text: str) -> List[Dict]:
        """Fallback entity extraction using spaCy"""
        if not nlp:
            return []
        
        doc = nlp(text)
        entities = []
        
        for ent in doc.ents:
            entities.append({
                "name": ent.text,
                "type": ent.label_,
                "description": f"Entity of type {ent.label_} found in text"
            })
        
        return entities

    def _store_in_graph(self, entities: List[Dict], relationships: List[Dict]):
        """Store entities and relationships in the graph database"""
        # Store entities
        for entity in entities:
            try:
                self.graph_db.create_entity(
                    entity_type=entity.get('type', 'ENTITY'),
                    name=entity.get('name'),
                    properties={'description': entity.get('description', '')}
                )
            except Exception as e:
                logger.error(f"Error storing entity {entity.get('name')}: {e}")
        
        # Store relationships
        for rel in relationships:
            try:
                self.graph_db.create_relationship(
                    from_entity=rel.get('from'),
                    relationship_type=rel.get('type', 'RELATED_TO'),
                    to_entity=rel.get('to'),
                    properties={'description': rel.get('description', '')}
                )
            except Exception as e:
                logger.error(f"Error storing relationship {rel.get('from')} -> {rel.get('to')}: {e}")

    def _update_vector_store(self, entities: List[Dict]):
        """Update the vector store with new entities"""
        for entity in entities:
            try:
                text = f"{entity.get('name')} {entity.get('description', '')}"
                self.vector_store.add_node(entity.get('name'), text)
            except Exception as e:
                logger.error(f"Error updating vector store for entity {entity.get('name')}: {e}")

# Global instance
document_processor = None

def get_document_processor() -> DocumentProcessor:
    global document_processor
    if document_processor is None:
        document_processor = DocumentProcessor()
    return document_processor 