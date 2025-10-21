from typing import List, Dict, Optional, Union
from bson import ObjectId
from .db import get_db
from app.services.ai_services.mongodb_vectorstore import get_vector_store
from app.services.ai_services.document_processor import get_document_processor
from app.services.backend_services.progress_tracker import get_progress_tracker
from app.schemas.backend.documents import DocumentType

class DocumentManager:
    def __init__(self):
        self.db = get_db()
        self.vector_store = get_vector_store()
        self.processor = get_document_processor()
        self.progress_tracker = get_progress_tracker()

    def add_document(self, content: Union[str, bytes], filename: str, user_email: str, upload_id: str, type: DocumentType) -> Dict:
        progress_callback = lambda percentage, message, status: self.progress_tracker.update_progress(
            upload_id=upload_id,
            percentage=percentage,
            message=message,
            status=status
        )
        print(f"Adding document {filename} for user {user_email} with upload ID {upload_id}")
        file_extension = filename.split('.')[-1].lower()
        self.progress_tracker.update_progress(upload_id, 20, "Starting document analysis...")
        
        result = None
        
        if file_extension == 'pdf':
            result = self.processor.process_pdf_file(content, filename, user_email, type, progress_callback)
        elif file_extension == 'docx':
            result = self.processor.process_docx_file(content, filename, user_email, type, progress_callback)
        elif file_extension == 'doc':
            result = self.processor.process_doc_file(content, filename, user_email, type, progress_callback)
        elif file_extension == 'text' and isinstance(content, str):
            result = self.processor.process_text_file(content, filename, user_email, type, progress_callback)
        else:
            error_msg = f"Unsupported file type: .{file_extension}. Supported formats: pdf, docx, doc, text"
            result = {"success": False, "error": error_msg}
        
        if not result.get("success"):
            progress_callback(
                percentage=100,
                message=result.get("error", "Failed to process document"),
                status="failed",
            )
            return {"success": False, "error": result.get("error", "Unknown error")}

        progress_callback(
            percentage=100,
            message="Document processed successfully",
            status="completed"
        )
        return {"success": True, "filename": filename, "chunks_count": result.get("chunks_count", 0)}
    
    def get_all_documents_by_user_email(self, user_email: str) -> List[Dict]:
        documents = self.vector_store.get_all_documents_by_user_email(user_email)
        return documents

    def delete_document_by_upload_id(self, upload_id: str) -> bool:
        return self.vector_store.delete_document_by_upload_id(upload_id)

# Global instance
document_manager = None

def get_document_manager() -> DocumentManager:
    """Get or create a DocumentManager instance"""
    global document_manager
    if document_manager is None:
        document_manager = DocumentManager()
    return document_manager
