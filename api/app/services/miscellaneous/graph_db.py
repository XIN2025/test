from neo4j import GraphDatabase
from ...config import NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD
from typing import List, Dict, Optional, Tuple
import logging
# from .vector_store import get_vector_store
from app.services.ai_services.mongodb_vectorstore import get_vector_store

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
        
        # Initialize vector store
        self.vector_store = get_vector_store()
        
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
        """Create a new entity in the graph and sync with vector store"""
        properties = properties or {}
        cypher_query = (
            f"MERGE (e:{entity_type} {{name: $name}}) "
            "SET e += $properties "
            "RETURN e"
        )
        self.driver.execute_query(cypher_query, name=name, properties=properties)
        
        # Add to vector store
        description = properties.get('description', f"{name} is a {entity_type}")
        self.vector_store.add_node(name, description)

    def create_relationship(self, from_entity: str, relationship_type: str, to_entity: str, properties: Dict = None) -> None:
        """Create a relationship between two entities"""
        properties = properties or {}
        rel_type = self._sanitize_rel_type(relationship_type)
        cypher_query = (
            "MATCH (from {name: $from_name}), (to {name: $to_name}) "
            f"MERGE (from)-[r:{rel_type}]->(to) "
            "SET r += $properties "
            "RETURN r"
        )
        self.driver.execute_query(
            cypher_query,
            from_name=from_entity,
            to_name=to_entity,
            properties=properties
        )

    def delete_relationship(self, from_entity: str, relationship_type: str, to_entity: str) -> None:
        """Delete a specific relationship if it exists"""
        rel_type = self._sanitize_rel_type(relationship_type)
        cypher_query = f"MATCH (from {{name: $from_name}})-[r:{rel_type}]->(to {{name: $to_name}}) DELETE r"
        try:
            self.driver.execute_query(
                cypher_query,
                from_name=from_entity,
                to_name=to_entity,
            )
        except Exception as e:
            logger.error(f"Failed to delete relationship {from_entity}-[{relationship_type}]->{to_entity}: {e}")

    def delete_entity_if_isolated(self, name: str) -> None:
        """Delete an entity node only if it has no remaining relationships"""
        # Use list comprehension counting pattern occurrences instead of deprecated size((e)--()) form
        cypher_query = (
            "MATCH (e {name: $name}) "
            "WITH e, size([(e)--() | 1]) AS deg "
            "WHERE deg = 0 DELETE e"
        )
        try:
            self.driver.execute_query(cypher_query, name=name)
        except Exception as e:
            logger.error(f"Failed to delete entity {name}: {e}")

    def _sanitize_rel_type(self, rel_type: str) -> str:
        """Ensure relationship type is a valid Cypher identifier (letters, digits, underscore)."""
        import re
        if not rel_type:
            return "RELATED_TO"
        cleaned = re.sub(r"[^A-Za-z0-9_]", "_", rel_type)
        # Relationship type cannot start with a digit
        if cleaned and cleaned[0].isdigit():
            cleaned = f"R_{cleaned}"
        return cleaned or "RELATED_TO"

    def get_context(self, query: str, user_email: str, max_hops: int = 2) -> List[str]:
        """Get relevant context using semantic search and graph exploration
        
        Args:
            query: A natural language query to find relevant context
            user_email: Email of the user to filter nodes and relationships
            max_hops: Maximum number of relationship hops to explore in the graph
        """
        context_info: List[str] = []
        
        # Step 1: Use vector search to find semantically relevant nodes
        relevant_nodes = self.vector_store.search(query=query, top_k=5 , user_email=user_email)
        
        # Step 2: Get entity information for semantically relevant nodes
        starting_nodes = set()
        for node_id in relevant_nodes:
            # Only match nodes that belong to the user
            entity_query = """
            MATCH (e {name: $name})
            WHERE e.user_email = $user_email
            RETURN labels(e) as types, e.name as name, e.description as description
            """
            records, _, _ = self.driver.execute_query(entity_query, name=node_id, user_email=user_email)
            for record in records:
                entity_type = record["types"][0]
                description = record.get("description", f"Entity of type {entity_type}")
                context_info.append(f"{record['name']} is a {entity_type}: {description}")
                starting_nodes.add(record['name'])

        # Step 3: Graph exploration from relevant nodes
        relationship_info: List[str] = []
        for start_node in starting_nodes:
            for hop in range(1, max_hops + 1):
                # Only explore relationships where all nodes and relationships belong to the user
                rel_query = f"""
                MATCH path = (start {{name: $start_name}})-[r*{hop}]-(end)
                WHERE start.user_email = $user_email 
                AND end.user_email = $user_email
                AND ALL(rel IN relationships(path) WHERE rel.user_email = $user_email)
                RETURN DISTINCT start.name as start_name,
                       [rel IN relationships(path) | type(rel)] as rel_types,
                       end.name as end_name,
                       end.description as end_description
                LIMIT 10
                """
                records, _, _ = self.driver.execute_query(rel_query, 
                                                        start_name=start_node,
                                                        user_email=user_email)
                for record in records:
                    rel_chain = " -> ".join(record["rel_types"])
                    end_desc = record.get("end_description", "")
                    relationship = f"{record['start_name']} {rel_chain} {record['end_name']}: {end_desc}"
                    if relationship not in relationship_info:  # Avoid duplicates
                        relationship_info.append(relationship)

        return context_info + relationship_info

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
        """Clear all data from both the graph database and vector store"""
        self.driver.execute_query("MATCH (n) DETACH DELETE n")
        # Create new vector store index
        self.vector_store._create_new_index()
        self.vector_store.save_index()

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

def sync_vector_store():
    """Sync the vector store with the current state of the graph database"""
    graph_db = get_graph_db()
    graph_db.vector_store.sync_from_graph(graph_db)

def close_graph_db():
    global graph_db
    if graph_db:
        # Save vector store state before closing
        graph_db.vector_store.save_index()
        graph_db.close()
        graph_db = None 