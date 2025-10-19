from langchain_openai import OpenAIEmbeddings
from langchain_mongodb import MongoDBAtlasVectorSearch
from langchain_core.documents import Document
from pymongo import MongoClient
import logging
import json
from typing import Dict, List
from langchain_text_splitters import RecursiveCharacterTextSplitter
from uuid import uuid4

from ...config import VECTOR_STORE_DB_URI, VECTOR_DB_NAME, VECTOR_COLLECTION_NAME, OPENAI_API_KEY, EMBEDDING_MODEL
from app.schemas.backend.documents import DocumentType

logger = logging.getLogger(__name__)

class MongoVectorStoreService:
    def __init__(self):
        self.client = MongoClient(VECTOR_STORE_DB_URI)
        self.db = self.client[VECTOR_DB_NAME]
        self.collection = self.db[VECTOR_COLLECTION_NAME]

        logger.info(f"Initializing OpenAIEmbeddings with model: {EMBEDDING_MODEL}")
        self.embedding_fn = OpenAIEmbeddings(
            model=EMBEDDING_MODEL,
            openai_api_key=OPENAI_API_KEY
        )

        self.vector_store = MongoDBAtlasVectorSearch(
            collection=self.collection,
            embedding=self.embedding_fn,
            index_name="vector_index",
            text_key="text",
            embedding_key="embedding",
        )
        logger.info("MongoVectorStoreService initialized successfully with OpenAI embeddings.")

    def add_document(self, content: str, user_email: str, filename: str, type: DocumentType, chunk_size: int = 1500, chunk_overlap: int = 150) -> str:
        upload_id = str(uuid4())
        doc = Document(
            page_content=content,
            metadata={
                "user_email": user_email,
                "filename": filename,
                "size": len(content),
                "upload_id": upload_id,
                "type": type.value 
            },
        )

        splitter = RecursiveCharacterTextSplitter(
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap
        )
        chunks = splitter.split_documents([doc])
        logger.info(f"Document '{filename}' split into {len(chunks)} chunks.")

        if not chunks:
            logger.warning(f"Document '{filename}' produced no chunks to add.")
            return upload_id
        
        try:
            # OpenAIEmbeddings can handle batching internally, but for clarity and control,
            # we'll still do it this way.
            texts_to_embed = [chunk.page_content for chunk in chunks]
            embeddings = self.embedding_fn.embed_documents(texts_to_embed)
            
            records_to_insert = []
            for i, chunk in enumerate(chunks):
                record = {
                    "text": chunk.page_content,
                    "embedding": embeddings[i],
                    **chunk.metadata
                }
                records_to_insert.append(record)
            
            self.collection.insert_many(records_to_insert)
            logger.info(f"Successfully inserted {len(records_to_insert)} chunks for '{filename}' into collection '{VECTOR_COLLECTION_NAME}'.")
        except Exception as e:
            logger.error(f"❌ Failed to insert document chunks for '{filename}': {e}", exc_info=True)
            raise

        return upload_id
    
    def get_all_documents_by_user_email(self, user_email: str) -> List[Dict]:
        try:
            cursor = self.collection.find(
                {"user_email": user_email}, 
                {"embedding": 0, "_id": 0}
            )
            unique_docs = {doc['filename']: doc for doc in cursor}
            return list(unique_docs.values())
        except Exception as e:
            logger.error(f"❌ Failed fetching document list for {user_email}: {e}")
            return []

    def delete_document_by_upload_id(self, upload_id: str) -> bool:
        try:
            result = self.collection.delete_many({"upload_id": upload_id})
            logger.info(f"Deleted {result.deleted_count} chunks for upload_id '{upload_id}'.")
            return result.deleted_count > 0
        except Exception as e:
            logger.error(f"❌ Failed deleting document chunks for upload_id '{upload_id}': {e}")
            return False

    def search(self, query: str, user_email: str, top_k: int = 5) -> List[Dict]:
        logger.info(f"🔍 [VECTOR SEARCH] Starting vector search for query: '{query}' (User: {user_email})")
        
        if not query or not query.strip():
            logger.warning("🔍 [VECTOR SEARCH] Query is empty or None, returning empty list")
            return []

        try:
            search_filter = {"user_email": {"$eq": user_email}}
            logger.info(f"🔍 [VECTOR SEARCH] Stage 1: Constructed search filter: {json.dumps(search_filter)}")

            logger.info(f"🔍 [VECTOR SEARCH] Stage 2: Calling LangChain's similarity_search with k={top_k}...")
            
            docs = self.vector_store.similarity_search(
                query,
                k=top_k,
                pre_filter=search_filter
            )

            logger.info(f"🔍 [VECTOR SEARCH] Stage 3: LangChain call complete. Retrieved {len(docs)} document(s).")
            
            results = []
            if docs:
                for i, d in enumerate(docs):
                    text = getattr(d, "page_content", "")
                    metadata = getattr(d, "metadata", {})
                    if not text.strip(): continue
                    result = {"text": text, **metadata}
                    results.append(result)

            logger.info(f"✅ [VECTOR SEARCH] Completed successfully, returning {len(results)} valid results.")
            return results

        except Exception as e:
            logger.error(f"❌ [VECTOR SEARCH] A critical error occurred during the search operation: {e}", exc_info=True)
            return []

    def get_stats(self):
        return {"total_nodes": self.collection.count_documents({})}

vector_store = None

def get_vector_store() -> MongoVectorStoreService:
    global vector_store
    if vector_store is None:
        vector_store = MongoVectorStoreService()
    return vector_store
