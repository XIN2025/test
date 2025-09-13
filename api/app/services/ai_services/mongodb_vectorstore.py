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

    def add_document(self, doc: Document, chunk_size: int = 500, chunk_overlap: int = 50) -> int:
        """
        Add a document (LangChain Document) into the vector store by splitting into chunks.
        Returns number of chunks inserted.
        """
        splitter = RecursiveCharacterTextSplitter(
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap
        )

        chunks = splitter.split_documents([doc])
        inserted = 0

        for chunk in chunks:
            try:
                embedding = self.embedding_fn.embed_documents([chunk.page_content])[0]
                record = {
                    "text": chunk.page_content,
                    "embedding": embedding,
                    **chunk.metadata  # preserves user_email or any metadata
                }
                self.collection.insert_one(record)
                inserted += 1
            except Exception as e:
                logger.error(f"❌ Failed inserting chunk: {e}")

        return inserted

    def update_node(self, node_id: str, text: str):
        """Replace node (delete + add)"""
        self.delete_node(node_id)
        self.add_node(node_id, text)

    def delete_node(self, node_id: str):
        """Delete by node_id"""
        try:
            self.collection.delete_one({"node_id": node_id})
            logger.info(f"Deleted node '{node_id}'")
        except Exception as e:
            logger.error(f"Failed to delete node '{node_id}': {e}")

    from typing import List

    def search(self, query: str, user_email: str, top_k: int = 10) -> List[Dict]:
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
