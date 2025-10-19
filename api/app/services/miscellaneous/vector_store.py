# import faiss
# from sentence_transformers import SentenceTransformer
# import numpy as np
# import os
# import pickle
# from typing import List, Dict, Optional
# from ...config import VECTOR_INDEX_PATH, EMBEDDING_MODEL
# import logging

# logger = logging.getLogger(__name__)

# class VectorStoreService:
#     def __init__(self, embedding_model: str = None, index_path: str = None):
#         self.model = SentenceTransformer(embedding_model or EMBEDDING_MODEL)
#         self.index_path = index_path or VECTOR_INDEX_PATH
#         self.index = None
#         self.id_map = {}  # Maps FAISS index to node ID
#         self.rev_id_map = {}  # Maps node ID to FAISS index
#         self.next_idx = 0
#         self._load_index()

#     def _load_index(self):
#         """Load the FAISS index and mappings from disk"""
#         if os.path.exists(self.index_path):
#             try:
#                 self.index = faiss.read_index(self.index_path)
#                 # Load mappings
#                 map_path = self.index_path.replace('.bin', '_maps.pkl')
#                 if os.path.exists(map_path):
#                     with open(map_path, 'rb') as f:
#                         data = pickle.load(f)
#                         self.id_map = data.get('id_map', {})
#                         self.rev_id_map = data.get('rev_id_map', {})
#                         self.next_idx = data.get('next_idx', 0)
#                 logger.info(f"Loaded vector index with {len(self.id_map)} nodes")
#             except Exception as e:
#                 logger.error(f"Failed to load existing index: {e}")
#                 self._create_new_index()
#         else:
#             self._create_new_index()

#     def _create_new_index(self):
#         """Create a new FAISS index"""
#         self.index = faiss.IndexFlatL2(384)  # 384 dims for MiniLM
#         self.id_map = {}
#         self.rev_id_map = {}
#         self.next_idx = 0
#         logger.info("Created new vector index")

#     def _save_mappings(self):
#         """Save the ID mappings to disk"""
#         map_path = self.index_path.replace('.bin', '_maps.pkl')
#         data = {
#             'id_map': self.id_map,
#             'rev_id_map': self.rev_id_map,
#             'next_idx': self.next_idx
#         }
#         with open(map_path, 'wb') as f:
#             pickle.dump(data, f)

#     def save_index(self):
#         """Save the FAISS index and mappings to disk"""
#         try:
#             faiss.write_index(self.index, self.index_path)
#             self._save_mappings()
#             logger.info(f"Saved vector index with {len(self.id_map)} nodes")
#         except Exception as e:
#             logger.error(f"Failed to save index: {e}")

#     def add_node(self, node_id: str, text: str):
#         """Add a node to the vector store"""
#         if not text or not text.strip():
#             logger.warning(f"Skipping node '{node_id}' with empty text")
#             return

#         try:
#             embedding = self.model.encode([text])[0].astype(np.float32)
#             self.index.add(np.array([embedding]))
#             self.id_map[self.next_idx] = node_id
#             self.rev_id_map[node_id] = self.next_idx
#             self.next_idx += 1
#             self.save_index()
#             logger.info(f"Added node '{node_id}' to vector store")
#         except Exception as e:
#             logger.error(f"Failed to add node '{node_id}': {e}")

#     def update_node(self, node_id: str, text: str):
#         """Update a node in the vector store"""
#         self.delete_node(node_id)
#         self.add_node(node_id, text)

#     def delete_node(self, node_id: str):
#         """Delete a node from the vector store"""
#         idx = self.rev_id_map.get(node_id)
#         if idx is not None:
#             # For simplicity, we'll rebuild the index without the deleted node
#             # In a production system, you'd want a more efficient approach
#             logger.info(f"Deleting node '{node_id}' from vector store")
#             del self.rev_id_map[node_id]
#             del self.id_map[idx]
#             # Note: This is a simplified deletion. In production, you'd want to handle FAISS index updates more efficiently

#     def search(self, query: str, top_k: int = 5) -> List[str]:
#         """Search for similar nodes in the vector store"""
#         print(f"🔍 [VECTOR SEARCH] Starting vector search for query: '{query}'")
#         print(f"🔍 [VECTOR SEARCH] Step 1: Checking if query is valid...")
        
#         if not query or not query.strip():
#             print(f"🔍 [VECTOR SEARCH] ❌ Query is empty or None, returning empty list")
#             return []

#         try:
#             print(f"🔍 [VECTOR SEARCH] Step 2: Encoding query to embedding...")
#             embedding = self.model.encode([query])[0].astype(np.float32)
#             print(f"🔍 [VECTOR SEARCH] Step 2: ✅ Query encoded successfully, embedding shape: {embedding.shape}")
            
#             print(f"🔍 [VECTOR SEARCH] Step 3: Searching FAISS index...")
#             print(f"🔍 [VECTOR SEARCH] Step 3: Index size: {self.index.ntotal if self.index else 0}")
            
#             D, I = self.index.search(np.array([embedding]), top_k)
#             print(f"🔍 [VECTOR SEARCH] Step 3: ✅ FAISS search completed")
#             print(f"🔍 [VECTOR SEARCH] Step 3: Distances: {D[0]}")
#             print(f"🔍 [VECTOR SEARCH] Step 3: Indices: {I[0]}")
            
#             print(f"🔍 [VECTOR SEARCH] Step 4: Mapping indices to node IDs...")
#             results = []
#             for idx in I[0]:
#                 if idx in self.id_map:
#                     node_id = self.id_map.get(idx)
#                     results.append(node_id)
#                     print(f"🔍 [VECTOR SEARCH] Step 4: Index {idx} -> Node ID: {node_id}")
#                 else:
#                     print(f"🔍 [VECTOR SEARCH] Step 4: Index {idx} not found in id_map")
            
#             print(f"✅ [VECTOR SEARCH] ✅ Vector search completed successfully!")
#             print(f"✅ [VECTOR SEARCH] ✅ Found {len(results)} results: {results}")
            
#             logger.info(f"Vector search for '{query}' returned {len(results)} results")
#             return results
            
#         except Exception as e:
#             print(f"❌ [VECTOR SEARCH] ❌ Error in vector search: {e}")
#             print(f"❌ [VECTOR SEARCH] ❌ Error type: {type(e).__name__}")
#             import traceback
#             print(f"❌ [VECTOR SEARCH] ❌ Full traceback:")
#             print(traceback.format_exc())
            
#             logger.error(f"Failed to search vector store: {e}")
#             return []

#     def sync_from_graph(self, graph_db):
#         """Sync the vector store with the graph database"""
#         logger.info("Starting sync of vector store from graph database...")
#         try:
#             entities = graph_db.get_all_entities()
#             self._create_new_index()
            
#             for ent in entities:
#                 node_id = ent.get('name')
#                 text = ent.get('description', ent.get('name'))
#                 if text:
#                     self.add_node(node_id, text)
            
#             logger.info(f"Finished syncing vector store with {len(entities)} entities")
#         except Exception as e:
#             logger.error(f"Failed to sync vector store: {e}")

#     def get_stats(self) -> Dict:
#         """Get statistics about the vector store"""
#         return {
#             'total_nodes': len(self.id_map),
#             'index_size': self.index.ntotal if self.index else 0,
#             'embedding_dim': 384
#         }

#     def debug_print_nodes(self):
#         """Debug function to print all nodes in the vector store"""
#         logger.info("VectorStore contents:")
#         for idx, node_id in self.id_map.items():
#             logger.info(f"Index: {idx}, Node ID: {node_id}")
#         logger.info(f"Total nodes: {len(self.id_map)}")

# # Global instance
# vector_store = None

# def get_vector_store() -> VectorStoreService:
#     global vector_store
#     if vector_store is None:
#         vector_store = VectorStoreService()
#     return vector_store 
