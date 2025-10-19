from neo4j import GraphDatabase
from ...config import NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD
from typing import List, Dict, Optional, Tuple
import logging
from app.services.ai_services.mongodb_vectorstore import get_vector_store

logger = logging.getLogger(__name__)

class GraphDatabaseService:
    def __init__(self):
        self._test_connection_with_verify()
        self.driver = GraphDatabase.driver(
            NEO4J_URI,
            auth=(NEO4J_USER, NEO4J_PASSWORD)
        )
        self.vector_store = get_vector_store()
        logger.info("Neo4j connection established successfully")

    def _test_connection_with_verify(self):
        try:
            with GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD)) as driver:
                driver.verify_connectivity()
                driver.execute_query("RETURN 1 as test")
        except Exception as e:
            logger.error(f"Failed to connect to Neo4j: {e}")
            raise

    def close(self):
        if self.driver:
            self.driver.close()

    def get_graph_data(self) -> Tuple[List[Dict], List[Dict]]:
        node_query = """
        MATCH (n)
        RETURN DISTINCT labels(n)[0] as type, n.name as name, n.description as description
        """
        records, _, _ = self.driver.execute_query(node_query)
        nodes = [{"type": record["type"], "name": record["name"], "description": record.get("description")}
                for record in records]

        rel_query = """
        MATCH (from)-[r]->(to)
        RETURN from.name as from, type(r) as type, to.name as to
        """
        records, _, _ = self.driver.execute_query(rel_query)
        relationships = [{"from": record["from"], "type": record["type"], "to": record["to"]}
                       for record in records]

        return nodes, relationships

    def clear_database(self) -> None:
        self.driver.execute_query("MATCH (n) DETACH DELETE n")
        logger.info("Cleared Neo4j graph database.")


graph_db = None

def get_graph_db() -> GraphDatabaseService:
    global graph_db
    if graph_db is None:
        graph_db = GraphDatabaseService()
    return graph_db

def close_graph_db():
    global graph_db
    if graph_db:
        graph_db.close()
        graph_db = None
