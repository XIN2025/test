import faiss
from sentence_transformers import SentenceTransformer
import numpy as np
import os
import pickle
from typing import List, Optional
from core.db.graph_db import Neo4jDatabase
import logging

class VectorStore:
    def __init__(self, embedding_model: str = 'all-MiniLM-L6-v2', index_path: str = 'faiss_index.bin'):
        self.model = SentenceTransformer(embedding_model)
        self.index_path = index_path
        self.map_path = index_path + '.map'
        self.index = None
        self.id_map = {}  # Maps FAISS index to Neo4j node ID
        self.rev_id_map = {}  # Maps Neo4j node ID to FAISS index
        self.next_idx = 0
        self._load_index()

    def _load_index(self):
        if os.path.exists(self.index_path):
            self.index = faiss.read_index(self.index_path)
            # Load id_map and rev_id_map
            if os.path.exists(self.map_path):
                with open(self.map_path, 'rb') as f:
                    data = pickle.load(f)
                    self.id_map = data.get('id_map', {})
                    self.rev_id_map = data.get('rev_id_map', {})
                    self.next_idx = data.get('next_idx', 0)
        else:
            self.index = faiss.IndexFlatL2(384)  # 384 dims for MiniLM

    def save_index(self):
        faiss.write_index(self.index, self.index_path)
        # Save id_map and rev_id_map
        with open(self.map_path, 'wb') as f:
            pickle.dump({'id_map': self.id_map, 'rev_id_map': self.rev_id_map, 'next_idx': self.next_idx}, f)

    def add_node(self, node_id: str, text: str):
        if not text:
            logging.warning(f"Skipping node '{node_id}' with empty or None text for embedding.")
            return
        embedding = self.model.encode([text])[0].astype(np.float32)
        self.index.add(np.array([embedding]))
        self.id_map[self.next_idx] = node_id
        self.rev_id_map[node_id] = self.next_idx
        self.next_idx += 1
        self.save_index()

    def update_node(self, node_id: str, text: str):
        # For simplicity, remove and re-add
        self.delete_node(node_id)
        self.add_node(node_id, text)

    def delete_node(self, node_id: str):
        raise NotImplementedError("Node deletion is not yet implemented")

    def search(self, query: str, top_k: int = 5) -> List[str]:
        embedding = self.model.encode([query])[0].astype(np.float32)
        distances, indices = self.index.search(np.array([embedding]), top_k)
        return [self.id_map.get(idx) for idx in indices[0] if idx in self.id_map]

    def sync_from_graph(self, db: Optional[Neo4jDatabase] = None):
        logging.info("Starting sync of vector store from graph database...")
        if db is None:
            db = Neo4jDatabase()
        entities = db.get_all_entities()
        self.index = faiss.IndexFlatL2(384)
        self.id_map = {}
        self.rev_id_map = {}
        self.next_idx = 0
        for ent in entities:
            node_id = ent.get('name')  # Use name as ID for now
            text = ent.get('description', ent.get('name'))
            logging.info(f"Adding node to vector store: {node_id}")
            self.add_node(node_id, text)
        self.save_index()
        logging.info("Finished syncing vector store from graph database.")

    def debug_print_nodes(self):
        print("VectorStore contents:")
        for idx, node_id in self.id_map.items():
            print(f"Index: {idx}, Node ID: {node_id}")
        print(f"Total nodes: {len(self.id_map)}")

if __name__ == "__main__":
    vs = VectorStore()
    vs.debug_print_nodes()
    query = input("Enter a query to test vector search: ")
    print("Search results:", vs.search(query)) 