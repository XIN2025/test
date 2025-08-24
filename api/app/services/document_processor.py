from typing import List, Dict, Tuple, Optional, Callable, Literal
from openai import OpenAI
import spacy
import json
import logging
import time
from ..config import OPENAI_API_KEY, LLM_MODEL, LLM_TEMPERATURE
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
        if not OPENAI_API_KEY:
            raise ValueError("OpenAI API key not found in environment variables")
        
        self.client = OpenAI(api_key=OPENAI_API_KEY)
        self.model = LLM_MODEL
        self.temperature = LLM_TEMPERATURE
        self.graph_db = get_graph_db()
        self.vector_store = get_vector_store()
        
    def _ask_model(self, prompt: str) -> str:
        """Send a prompt to the model and get the response"""
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                temperature=self.temperature
            )
            return response.choices[0].message.content.strip()
        except Exception as e:
            logger.error(f"OpenAI error: {str(e)}")
            return f"Error: {str(e)}"

    def process_text_file(self, content: str, filename: str, user_email: str, progress_callback: Optional[Callable] = None) -> Dict:
        """Process a text file and extract entities and relationships with progress updates"""
        logger.info(f"Processing text file: {filename} for user {user_email}")
        
        try:
            # Update progress: Starting text analysis
            if progress_callback:
                progress_callback(30, "Extracting text from document...")
                time.sleep(0.5)  # Small delay for UI feedback
            
            # Extract entities and relationships
            if progress_callback:
                progress_callback(50, "Analyzing document structure...")
                time.sleep(0.5)
            
            entities, relationships = self._extract_entities_and_relationships(content, progress_callback)
            
            # Update progress: Storing in database
            if progress_callback:
                progress_callback(80, "Storing data in knowledge base...")
                time.sleep(0.5)
            
            # Store in graph database with user email
            created_nodes, created_relationships = self._store_in_graph(entities, relationships, user_email)
            
            # Update vector store
            self._update_vector_store(entities)
            
            # Update progress: Finalizing
            if progress_callback:
                progress_callback(95, "Finalizing analysis...")
                time.sleep(0.5)
            
            return {
                "success": True,
                "filename": filename,
                "entities_count": len(entities),
                "relationships_count": len(relationships),
                "entities": entities,
                "relationships": relationships,
                "created_nodes": created_nodes,
                "created_relationships": created_relationships
            }
        except Exception as e:
            logger.error(f"Error processing text file {filename}: {e}")
            return {
                "success": False,
                "filename": filename,
                "error": str(e)
            }

    def process_pdf_file(self, file_content: bytes, filename: str, user_email: str, progress_callback: Optional[Callable] = None) -> Dict:
        """Process a PDF file and extract entities and relationships with progress updates"""
        logger.info(f"Processing PDF file: {filename} for user {user_email}")
        
        try:
            # Update progress: Starting PDF processing
            if progress_callback:
                progress_callback(25, "Extracting text from PDF...")
                time.sleep(0.5)
            
            # Extract text from PDF
            text_content = self._extract_text_from_pdf(file_content)
            
            # Process the extracted text
            return self.process_text_file(text_content, filename, user_email, progress_callback)
        except Exception as e:
            logger.error(f"Error processing PDF file {filename}: {e}")
            return {
                "success": False,
                "filename": filename,
                "error": str(e)
            }

    def _extract_text_from_pdf(self, file_content: bytes) -> str:
        """Extract text content from PDF bytes using PyMuPDF, with PyPDF2 fallback."""
        # Primary path: PyMuPDF (fitz)
        try:
            import fitz  # type: ignore

            doc = fitz.open(stream=file_content, filetype="pdf")
            text_chunks: List[str] = []
            for page in doc:
                try:
                    extracted = page.get_text("text") or ""
                except Exception as fe:
                    logger.debug("PyMuPDF failed on a page: %s", fe)
                    extracted = ""
                if extracted:
                    text_chunks.append(extracted)
            doc.close()
            text = "\n\n".join(text_chunks)
            if text.strip():
                return text
            logger.info("PyMuPDF returned no text; will try PyPDF2 fallback")
        except Exception as fe:
            logger.warning("PyMuPDF not available or failed; falling back to PyPDF2. Error: %s", fe)

        # Fallback: PyPDF2 (pure-Python)
        try:
            from PyPDF2 import PdfReader  # type: ignore
            import io

            reader = PdfReader(io.BytesIO(file_content))
            text_chunks = []
            for page in reader.pages:
                try:
                    extracted = page.extract_text() or ""
                except Exception as pe:
                    logger.debug("PyPDF2 failed on a page: %s", pe)
                    extracted = ""
                if extracted:
                    text_chunks.append(extracted)
            text = "\n\n".join(text_chunks)
            if not text.strip():
                raise ValueError("Could not extract any text from PDF using available parsers")
            return text
        except Exception as pe:
            logger.error("PDF text extraction failed (PyPDF2 fallback): %s", pe)
            raise

    def _extract_entities_and_relationships(self, text: str, progress_callback: Optional[Callable] = None) -> Tuple[List[Dict], List[Dict]]:
        """Extract entities and relationships from text using LLM with progress updates"""
        entities = []
        relationships = []
        
        # Update progress: Entity extraction
        if progress_callback:
            progress_callback(60, "Identifying medical entities...")
            time.sleep(0.5)
        
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
            entity_content = self._ask_model(entity_prompt)
            
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
        
        # Update progress: Relationship extraction
        if progress_callback:
            progress_callback(70, "Extracting relationships and connections...")
            time.sleep(0.5)
        
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
                rel_content = self._ask_model(relationship_prompt)
                
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

    def _store_in_graph(self, entities: List[Dict], relationships: List[Dict], user_email: str) -> Tuple[List[str], List[str]]:
        """Store entities and relationships in the graph database and return created node/relationship IDs"""
        created_nodes = []
        created_relationships = []
        
        # Store entities
        for entity in entities:
            try:
                properties = {
                    'description': entity.get('description', ''),
                    'user_email': user_email  # Add user_email to entity properties
                }
                self.graph_db.create_entity(
                    entity_type=entity.get('type', 'ENTITY'),
                    name=entity.get('name'),
                    properties=properties
                )
                created_nodes.append(entity.get('name'))
            except Exception as e:
                logger.error(f"Error storing entity {entity.get('name')}: {e}")
        
        # Store relationships
        for rel in relationships:
            try:
                properties = {
                    'description': rel.get('description', ''),
                    'user_email': user_email  # Add user_email to relationship properties
                }
                self.graph_db.create_relationship(
                    from_entity=rel.get('from'),
                    relationship_type=rel.get('type', 'RELATED_TO'),
                    to_entity=rel.get('to'),
                    properties=properties
                )
                # Create a unique identifier for the relationship
                rel_id = f"{rel.get('from')}_{rel.get('type', 'RELATED_TO')}_{rel.get('to')}"
                created_relationships.append(rel_id)
            except Exception as e:
                logger.error(f"Error storing relationship {rel.get('from')} -> {rel.get('to')}: {e}")
        
        return created_nodes, created_relationships

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
    """
    Get or create a DocumentProcessor instance using OpenAI
    """
    global document_processor
    if document_processor is None:
        document_processor = DocumentProcessor()
    return document_processor

def reset_document_processor():
    """Reset the global DocumentProcessor instance"""
    global document_processor
    document_processor = None 