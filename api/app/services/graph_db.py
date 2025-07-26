from neo4j import GraphDatabase
from ..config import NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD
from typing import List, Dict, Optional, Tuple
import logging

logger = logging.getLogger(__name__)

class GraphDatabaseService:
    def __init__(self):
        self.driver = GraphDatabase.driver(
            NEO4J_URI,
            auth=(NEO4J_USER, NEO4J_PASSWORD)
        )
        self._test_connection()

    def _test_connection(self):
        """Test the database connection"""
        try:
            with self.driver.session() as session:
                session.run("RETURN 1")
            logger.info("Neo4j connection established successfully")
        except Exception as e:
            logger.error(f"Failed to connect to Neo4j: {e}")
            raise

    def close(self):
        """Close the database connection"""
        if self.driver:
            self.driver.close()

    def get_all_entities(self) -> List[Dict]:
        """Get all entities from the database"""
        with self.driver.session() as session:
            cypher_query = """
            MATCH (e)
            RETURN labels(e)[0] as type, e.name as name, e.description as description
            """
            result = session.run(cypher_query)
            return [{"type": record["type"], "name": record["name"], "description": record.get("description")} for record in result]

    def create_entity(self, entity_type: str, name: str, properties: Dict = None) -> None:
        """Create a new entity in the graph"""
        with self.driver.session() as session:
            properties = properties or {}
            cypher_query = (
                f"MERGE (e:{entity_type} {{name: $name}}) "
                "SET e += $properties "
                "RETURN e"
            )
            session.run(cypher_query, name=name, properties=properties)

    def create_relationship(self, from_entity: str, relationship_type: str, to_entity: str, properties: Dict = None) -> None:
        """Create a relationship between two entities"""
        with self.driver.session() as session:
            properties = properties or {}
            cypher_query = (
                "MATCH (from {name: $from_name}), (to {name: $to_name}) "
                f"MERGE (from)-[r:{relationship_type}]->(to) "
                "SET r += $properties "
                "RETURN r"
            )
            session.run(
                cypher_query,
                from_name=from_entity,
                to_name=to_entity,
                properties=properties
            )

    def get_context(self, query_entities: List[str], max_hops: int = 2) -> List[str]:
        """Get relevant context from the graph database based on query entities"""
        with self.driver.session() as session:
            # Get direct information about query entities
            entity_info: List[str] = []
            for entity in query_entities:
                entity_query = """
                MATCH (e)
                WHERE toLower(e.name) CONTAINS toLower($name)
                RETURN labels(e) as types, e.name as name, e.description as description
                """
                result = session.run(entity_query, name=entity)
                for record in result:
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
                result = session.run(rel_query, query_entities=query_entities)
                for record in result:
                    rel_chain = " -> ".join(record["rel_types"])
                    end_desc = record.get("end_description", "")
                    relationship_info.append(
                        f"{record['start_name']} {rel_chain} {record['end_name']}: {end_desc}"
                    )

            return entity_info + relationship_info

    def get_graph_data(self) -> Tuple[List[Dict], List[Dict]]:
        """Get all nodes and relationships from the graph"""
        with self.driver.session() as session:
            # Get all nodes
            node_query = """
            MATCH (n)
            RETURN DISTINCT labels(n)[0] as type, n.name as name, n.description as description
            """
            nodes = [{"type": record["type"], "name": record["name"], "description": record.get("description")}
                    for record in session.run(node_query)]

            # Get all relationships
            rel_query = """
            MATCH (from)-[r]->(to)
            RETURN from.name as from, type(r) as type, to.name as to
            """
            relationships = [{"from": record["from"], "type": record["type"], "to": record["to"]}
                           for record in session.run(rel_query)]

            return nodes, relationships

    def clear_database(self) -> None:
        """Clear all data from the database"""
        with self.driver.session() as session:
            session.run("MATCH (n) DETACH DELETE n")

    def get_entity_by_name(self, name: str) -> Optional[Dict]:
        """Get a specific entity by name"""
        with self.driver.session() as session:
            cypher_query = """
            MATCH (e)
            WHERE toLower(e.name) CONTAINS toLower($name)
            RETURN labels(e)[0] as type, e.name as name, e.description as description
            LIMIT 1
            """
            result = session.run(cypher_query, name=name)
            record = result.single()
            if record:
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