from neo4j import GraphDatabase
from ..config import NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD
from typing import List, Dict, Optional, Tuple
import logging

logger = logging.getLogger(__name__)

class GraphDatabaseService:
    def __init__(self):
        # Test connection using the recommended pattern
        self._test_connection_with_verify()
        
        # If we get here, connection is successful, create the driver
        self.driver = GraphDatabase.driver(
            NEO4J_URI,
            auth=(NEO4J_USER, NEO4J_PASSWORD)
        )
        logger.info("Neo4j connection established successfully")

    def _test_connection_with_verify(self):
        """Test connection using the recommended Neo4j pattern"""
        try:
            with GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD)) as driver:
                driver.verify_connectivity()
                # Test a simple query
                driver.execute_query("RETURN 1 as test")
        except Exception as e:
            logger.error(f"Failed to connect to Neo4j: {e}")
            raise

    def close(self):
        """Close the database connection"""
        if self.driver:
            self.driver.close()

    def get_all_entities(self) -> List[Dict]:
        """Get all entities from the database"""
        cypher_query = """
        MATCH (e)
        RETURN labels(e)[0] as type, e.name as name, e.description as description
        """
        records, summary, keys = self.driver.execute_query(cypher_query)
        return [{"type": record["type"], "name": record["name"], "description": record.get("description")} for record in records]

    def create_entity(self, entity_type: str, name: str, properties: Dict = None) -> None:
        """Create a new entity in the graph"""
        properties = properties or {}
        cypher_query = (
            f"MERGE (e:{entity_type} {{name: $name}}) "
            "SET e += $properties "
            "RETURN e"
        )
        self.driver.execute_query(cypher_query, name=name, properties=properties)

    def create_relationship(self, from_entity: str, relationship_type: str, to_entity: str, properties: Dict = None) -> None:
        """Create a relationship between two entities"""
        properties = properties or {}
        cypher_query = (
            "MATCH (from {name: $from_name}), (to {name: $to_name}) "
            f"MERGE (from)-[r:{relationship_type}]->(to) "
            "SET r += $properties "
            "RETURN r"
        )
        self.driver.execute_query(
            cypher_query,
            from_name=from_entity,
            to_name=to_entity,
            properties=properties
        )

    def get_context(self, query_entities: List[str], max_hops: int = 2) -> List[str]:
        """Get relevant context from the graph database based on query entities"""
        # Get direct information about query entities
        entity_info: List[str] = []
        for entity in query_entities:
            entity_query = """
            MATCH (e)
            WHERE toLower(e.name) CONTAINS toLower($name)
            RETURN labels(e) as types, e.name as name, e.description as description
            """
            records, _, _ = self.driver.execute_query(entity_query, name=entity)
            for record in records:
                entity_type = record["types"][0]
                description = record.get("description", f"Entity of type {entity_type}")
                entity_info.append(f"{record['name']} is a {entity_type}: {description}")

        # Find relationships up to max_hops
        relationship_info: List[str] = []
        for hop in range(1, max_hops + 1):
            rel_query = f"""
            MATCH path = (start)-[r*{hop}]-(end)
            WHERE ANY(q IN $query_entities WHERE toLower(start.name) CONTAINS toLower(q))
            RETURN DISTINCT start.name as start_name, 
                   [rel IN relationships(path) | type(rel)] as rel_types,
                   end.name as end_name,
                   end.description as end_description
            LIMIT 50
            """
            records, _, _ = self.driver.execute_query(rel_query, query_entities=query_entities)
            for record in records:
                rel_chain = " -> ".join(record["rel_types"])
                end_desc = record.get("end_description", "")
                relationship_info.append(
                    f"{record['start_name']} {rel_chain} {record['end_name']}: {end_desc}"
                )

        return entity_info + relationship_info

    def get_graph_data(self) -> Tuple[List[Dict], List[Dict]]:
        """Get all nodes and relationships from the graph"""
        # Get all nodes
        node_query = """
        MATCH (n)
        RETURN DISTINCT labels(n)[0] as type, n.name as name, n.description as description
        """
        records, _, _ = self.driver.execute_query(node_query)
        nodes = [{"type": record["type"], "name": record["name"], "description": record.get("description")}
                for record in records]

        # Get all relationships
        rel_query = """
        MATCH (from)-[r]->(to)
        RETURN from.name as from, type(r) as type, to.name as to
        """
        records, _, _ = self.driver.execute_query(rel_query)
        relationships = [{"from": record["from"], "type": record["type"], "to": record["to"]}
                       for record in records]

        return nodes, relationships

    def clear_database(self) -> None:
        """Clear all data from the database"""
        self.driver.execute_query("MATCH (n) DETACH DELETE n")

    def get_entity_by_name(self, name: str) -> Optional[Dict]:
        """Get a specific entity by name"""
        cypher_query = """
        MATCH (e)
        WHERE toLower(e.name) CONTAINS toLower($name)
        RETURN labels(e)[0] as type, e.name as name, e.description as description
        LIMIT 1
        """
        records, _, _ = self.driver.execute_query(cypher_query, name=name)
        if records:
            record = records[0]
            return {"type": record["type"], "name": record["name"], "description": record.get("description")}
        return None

# Global instance
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