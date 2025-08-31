from langchain_mongodb import MongoDBAtlasVectorSearch
from langchain_openai import OpenAIEmbeddings
from langchain.schema import Document
from pymongo import MongoClient
import logging
from ...config import VECTOR_STORE_DB_URI, VECTOR_DB_NAME, VECTOR_COLLECTION_NAME, OPENAI_API_KEY

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

    def add_node(self, node_id: str, text: str, user_email:str):
        """Insert new node with embedding + node_id"""
        if not text or not text.strip():
            logger.warning(f"Skipping node '{node_id}' with empty text")
            return

        try:
            # Generate embedding for the text
            embedding = self.embedding_fn.embed_documents([text])[0]

            # Create document with desired structure
            doc = {
                "node_id": node_id,  # our logical ID
                "user_email":user_email,
                "text": text,
                "embedding": embedding,
            }

            # Insert directly into MongoDB collection
            self.collection.insert_one(doc)
            logger.info(f"Inserted node '{node_id}' into MongoDB Atlas")
        except Exception as e:
            logger.error(f"Failed to insert node '{node_id}': {e}")

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

    def search(self, query: str, user_email: str, top_k: int = 5) -> List[str]:
      """Search for similar nodes in the MongoDB vector store filtered by user_email, and return node_id list"""
      print(f"🔍 [VECTOR SEARCH] Starting vector search for query: '{query}' (User: {user_email})")
      print(f"🔍 [VECTOR SEARCH] Step 1: Checking if query is valid...")

      if not query or not query.strip():
          print(f"🔍 [VECTOR SEARCH] ❌ Query is empty or None, returning empty list")
          return []

      try:
          print(f"🔍 [VECTOR SEARCH] Step 2: Running similarity search in MongoDB with filter user_email={user_email}...")

          docs = self.vector_store.similarity_search(
              query, 
              k=top_k, 
              pre_filter={"user_email": user_email}  # 🔑 filter only this user's docs
          )

          print(f"🔍 [VECTOR SEARCH] Step 2: ✅ Retrieved {len(docs)} results from MongoDB")

          print(f"🔍 [VECTOR SEARCH] Step 3: Extracting node_ids...")
          results = []
          for d in docs:
              node_id = d.metadata.get("node_id")
              if node_id:
                  results.append(node_id)
                  print(f"🔍 [VECTOR SEARCH] Step 3: Found Node ID: {node_id}")
              else:
                  print(f"🔍 [VECTOR SEARCH] ⚠️ Document missing node_id field: {d.metadata}")

          print(f"✅ [VECTOR SEARCH] Completed successfully, found {len(results)} node_ids for user {user_email}")
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
