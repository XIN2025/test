from typing import List, Dict, Tuple, Optional, Callable, Literal
from openai import OpenAI
import spacy
import json
import logging
import time
from ...config import OPENAI_API_KEY, LLM_MODEL, LLM_TEMPERATURE

from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.schema import Document
import uuid
# from .vector_store import get_vector_store
from app.services.ai_services.mongodb_vectorstore import get_vector_store
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


    def process_text_file(
    self,
    content: str,
    filename: str,
    user_email: str,
    progress_callback: Optional[Callable] = None
) -> Dict:
        """Process a text file by chunking raw content and uploading to vector store"""
        logger.info(f"Processing text file: {filename} for user {user_email}")

        try:
            if progress_callback:
                progress_callback(30, "Extracting text from document...")
                time.sleep(0.5)

            # Wrap raw content in LangChain Document
            doc = Document(page_content=content, metadata={"user_email": user_email, "filename": filename})

            if progress_callback:
                progress_callback(50, "Splitting into chunks and uploading...")
                time.sleep(0.5)

            # ✅ Use the new add_document method
            chunks_count = self.vector_store.add_document(doc)

            if progress_callback:
                progress_callback(95, "Finalizing upload...")
                time.sleep(0.5)

            return {
                "success": True,
                "filename": filename,
                "chunks_count": chunks_count
            }

        except Exception as e:
            logger.error(f"❌ Error processing text file {filename}: {e}")
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