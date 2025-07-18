from neo4j import GraphDatabase
from config import NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD

class Neo4jDatabase:
    def __init__(self) -> None:
        self.driver: GraphDatabase.driver = GraphDatabase.driver(
            NEO4J_URI,
            auth=(NEO4J_USER, NEO4J_PASSWORD)
        )

    def close(self) -> None:
        self.driver.close()

    def get_graph_data(self) -> tuple[list[dict], list[dict]]:
        """Get all nodes and relationships from the graph"""
        with self.driver.session() as session:
            # Get all nodes
            node_query = """
            MATCH (n)
            RETURN DISTINCT labels(n)[0] as type, n.name as name
            """
            nodes = [{"type": record["type"], "name": record["name"]}
                    for record in session.run(node_query)]

            # Get all relationships
            rel_query = """
            MATCH (from)-[r]->(to)
            RETURN from.name as from, type(r) as type, to.name as to
            """
            relationships = [{"from": record["from"], "type": record["type"], "to": record["to"]}
                           for record in session.run(rel_query)]

            return nodes, relationships

    def get_all_entities(self) -> list[dict]:
        """Get all entities from the database"""
        with self.driver.session() as session:
            cypher_query = """
            MATCH (e)
            RETURN labels(e)[0] as type, e.name as name, e.description as description
            """
            result = session.run(cypher_query)
            return [{"type": record["type"], "name": record["name"], "description": record.get("description")} for record in result]

    def create_entity(self, entity_type: str, name: str, properties: dict = None) -> None:
        with self.driver.session() as session:
            properties = properties or {}
            cypher_query = (
                f"MERGE (e:{entity_type} {{name: $name}}) "
                "SET e += $properties "
                "RETURN e"
            )
            return session.run(cypher_query, name=name, properties=properties)

    def create_relationship(self, from_entity: str, relationship_type: str, to_entity: str, properties: dict = None) -> None:
        with self.driver.session() as session:
            properties = properties or {}
            cypher_query = (
                "MATCH (from {name: $from_name}), (to {name: $to_name}) "
                f"MERGE (from)-[r:{relationship_type}]->(to) "
                "SET r += $properties "
                "RETURN r"
            )
            return session.run(
                cypher_query,
                from_name=from_entity,
                to_name=to_entity,
                properties=properties
            )

    def get_context(self, query_entities: list[str], max_hops: int = 2) -> list[str]:
        """
        Get relevant context from the graph database based on query entities.
        Args:
            query_entities (list): List of entity names to search for
            max_hops (int): Maximum number of relationship hops to traverse
        Returns:
            list: List of context statements about the entities and their relationships
        """
        with self.driver.session() as session:
            # First, get direct information about the query entities (using CONTAINS for fuzzy match)
        entity_info: list[str] = []
        for entity in query_entities:
                # Get entity details with partial match
                entity_query = """
                MATCH (e)
                WHERE toLower(e.name) CONTAINS toLower($name)
                RETURN labels(e) as types, e.name as name
                """
                result = session.run(entity_query, name=entity)
                for record in result:
                    entity_type = record["types"][0]  # Get first label
                    entity_info.append(f"{record['name']} is a {entity_type}")

            # Find all matching entity names for relationship traversal
            matched_names_query = """
            MATCH (e)
            WHERE ANY(q IN $query_entities WHERE toLower(e.name) CONTAINS toLower(q))
            RETURN DISTINCT e.name as name
            """
            matched_names_result = session.run(matched_names_query, query_entities=query_entities)
            matched_names: list[str] = [r["name"] for r in matched_names_result]

            if not matched_names:
                return entity_info  # No matches, return what we have

            # Then, get relationships between entities and their neighbors
            relationship_query = f"""
            MATCH path = (start)-[*0..{max_hops}]-(end)
            WHERE start.name IN $entities
            AND (end.name IN $entities OR length(path) = 1)
            RETURN path
            LIMIT 15
            """
            result = session.run(relationship_query, entities=matched_names)
            
            # Process the paths into natural language statements
            relationship_info: list[str] = []
            seen_relationships: set[str] = set()  # To avoid duplicates
            
            for record in result:
                path = record["path"]
                for i in range(0, len(path.nodes) - 1):
                    start_node = path.nodes[i]
                    rel = path.relationships[i]
                    end_node = path.nodes[i + 1]
                    
                    # Create a unique identifier for this relationship
                    rel_key = f"{start_node['name']}-{rel.type}-{end_node['name']}"
                    if rel_key not in seen_relationships:
                        # Format relationship as a natural language statement
                        statement = self._format_relationship(
                            start_node['name'],
                            rel.type,
                            end_node['name']
                        )
                        relationship_info.append(statement)
                        seen_relationships.add(rel_key)
            
            # Combine all context
            context = entity_info + relationship_info
            return context

    def _format_relationship(self, start_name: str, rel_type: str, end_name: str) -> str:
        """Format a relationship into a natural language statement"""
        # Map of relationship types to natural language phrases
        rel_phrases: dict[str, str] = {
            "FOUNDED": "founded",
            "LEADS": "leads",
            "CEO_OF": "is the CEO of",
            "HEADQUARTERED_IN": "is headquartered in",
            "ACQUIRED": "acquired",
            "DEVELOPED": "developed",
            "INVESTED_IN": "invested in",
            "PARTNERED_WITH": "partnered with"
        }
        
        # Get the natural language phrase for the relationship type
        phrase: str = rel_phrases.get(rel_type, rel_type.lower().replace("_", " "))
        
        # Return formatted statement
        return f"{start_name} {phrase} {end_name}"

    def clear_database(self) -> None:
        with self.driver.session() as session:
            session.run("MATCH (n) DETACH DELETE n") 