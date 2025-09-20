# TODO: Migrate pymongo to motor (async)

from langchain_mongodb import MongoDBAtlasVectorSearch
from langchain_openai import OpenAIEmbeddings
from langchain.schema import Document
from pymongo import MongoClient
import logging
from ...config import VECTOR_STORE_DB_URI, VECTOR_DB_NAME, VECTOR_COLLECTION_NAME, OPENAI_API_KEY
from typing import Dict
from langchain_text_splitters import RecursiveCharacterTextSplitter
from typing import List, Optional, Callable
import time
from typing import List
from uuid import uuid4
logger = logging.getLogger(__name__)

class MongoVectorStoreService:
    def __init__(self):
        # MongoDB client setup
        self.client = MongoClient(VECTOR_STORE_DB_URI)
        self.db = self.client[VECTOR_DB_NAME]
        self.collection = self.db[VECTOR_COLLECTION_NAME]

        # OpenAI embedding model (default: text-embedding-3-small or text-embedding-3-large)
        self.embedding_fn = OpenAIEmbeddings(
            model="text-embedding-3-small",  # or "text-embedding-3-large"
            openai_api_key=OPENAI_API_KEY,
        )

        # LangChain Mongo Vector Store wrapper
        self.vector_store = MongoDBAtlasVectorSearch(
            collection=self.collection,
            embedding=self.embedding_fn,
            index_name="vector_index",  # must match Atlas index name
            text_key="text",
            embedding_key="embedding",
        )

    def add_document(self, content: str, user_email: str, filename: str, chunk_size: int = 1500, chunk_overlap: int = 300) -> int:
        """
        Add a document (LangChain Document) into the vector store by splitting into chunks.
        Returns number of chunks inserted.
        """
        upload_id = str(uuid4())
        doc = Document(
            page_content=content,
            metadata={"user_email": user_email, "filename": filename, "size": len(content), "upload_id": upload_id},
        )

        splitter = RecursiveCharacterTextSplitter(
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap
        )

        chunks = splitter.split_documents([doc])

        for chunk in chunks:
            try:
                embedding = self.embedding_fn.embed_documents([chunk.page_content])[0]
                record = {
                    "text": chunk.page_content,
                    "embedding": embedding,
                    **chunk.metadata  # preserves user_email or any metadata
                }
                self.collection.insert_one(record)
            except Exception as e:
                logger.error(f"❌ Failed inserting chunk: {e}")

        return upload_id
    
    def get_all_documents_by_user_email(self, user_email: str) -> List[Dict]:
        try:
            docs = [{"user_email": document["user_email"], "filename": document["filename"], "upload_id": str(document["upload_id"]), "size": document["size"]} for document in list(self.collection.find({"user_email": user_email}))]
            return docs
        except Exception as e:
            logger.error(f"❌ Failed fetching documents for {user_email}: {e}")
            return []

    def delete_document_by_upload_id(self, upload_id: str) -> bool:
        try:
            result = self.collection.delete_many({"upload_id": upload_id})
            return result.deleted_count > 0
        except Exception as e:
            logger.error(f"❌ Failed deleting document {upload_id}: {e}")
            return False

    def search(self, query: str, user_email: str, top_k: int = 50) -> List[Dict]:
        """
        Search for similar chunks in the MongoDB vector store filtered by user_email,
        and return a list of dicts with {text, user_email, node_id}.
        """
        print(f"🔍 [VECTOR SEARCH] Starting vector search for query: '{query}' (User: {user_email})")
        print(f"🔍 [VECTOR SEARCH] Step 1: Checking if query is valid...")

        if not query or not query.strip():
            print(f"[VECTOR SEARCH] Query is empty or None, returning empty list")
            return []

        try:
            print(f"🔍 [VECTOR SEARCH] Step 2: Running similarity search in MongoDB with filter user_email={user_email}...")

            docs = self.vector_store.similarity_search(
                query,
                k=top_k,
                pre_filter={"user_email": user_email}  # 🔑 filter only this user's docs
            )

            print(f"🔍 [VECTOR SEARCH] Step 2: Retrieved {len(docs)} results from MongoDB")

            results = []
            for i, d in enumerate(docs):
                if isinstance(d, dict):
                    # If your vector store returns raw Mongo docs
                    text = d.get("text", "")
                    metadata = d.get("user_email", user_email)
                else:
                    # If it returns LangChain Document
                    text = getattr(d, "page_content", "")
                    metadata = d.metadata.get("user_email", user_email)

                if not text.strip():
                    print(f"🔍 [VECTOR SEARCH] ⚠️ Skipping empty document at index {i}")
                    continue

                result = {
                    "text": text,
                    "user_email": metadata
                }
                results.append(result)

            print(f"✅ [VECTOR SEARCH] Completed successfully, returning {len(results)} results")
            logger.info(f"Vector search for '{query}' (user={user_email}) returned {len(results)} results")

            return results

        except Exception as e:
            print(f"❌ [VECTOR SEARCH] Search failed: {e}")
            logger.error(f"Search failed: {e}")
            return []


    def get_stats(self):
        """Get collection stats"""
        return {"total_nodes": self.collection.count_documents({})}


# Singleton wrapper
vector_store = None

def get_vector_store() -> MongoVectorStoreService:
    global vector_store
    if vector_store is None:
        vector_store = MongoVectorStoreService()
    return vector_store
