from neo4j import GraphDatabase
from config import NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD

class Neo4jDatabase:
    def __init__(self):
        self.driver = GraphDatabase.driver(
            NEO4J_URI,
            auth=(NEO4J_USER, NEO4J_PASSWORD)
        )

    def close(self):
        self.driver.close()

    def get_graph_data(self):
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

    def get_all_entities(self):
        """Get all entities from the database"""
        with self.driver.session() as session:
            cypher_query = """
            MATCH (e)
            RETURN labels(e)[0] as type, e.name as name
            """
            result = session.run(cypher_query)
            return [{"type": record["type"], "name": record["name"]} for record in result]

    def create_entity(self, entity_type, name, properties=None):
        with self.driver.session() as session:
            properties = properties or {}
            cypher_query = (
                f"MERGE (e:{entity_type} {{name: $name}}) "
                "SET e += $properties "
                "RETURN e"
            )
            return session.run(cypher_query, name=name, properties=properties)

    def create_relationship(self, from_entity, relationship_type, to_entity, properties=None):
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

    def get_context(self, query_entities, max_hops=2):
        """
        Get relevant context from the graph database based on query entities.
        Args:
            query_entities (list): List of entity names to search for
            max_hops (int): Maximum number of relationship hops to traverse
        Returns:
            list: List of context statements about the entities and their relationships
        """
        with self.driver.session() as session:
            # First, get direct information about the query entities
            entity_info = []
            for entity in query_entities:
                # Get entity details
                entity_query = """
                MATCH (e {name: $name})
                RETURN labels(e) as types, e.name as name
                """
                result = session.run(entity_query, name=entity)
                record = result.single()
                if record:
                    entity_type = record["types"][0]  # Get first label
                    entity_info.append(f"{record['name']} is a {entity_type}")

            # Then, get relationships between entities and their neighbors
            relationship_query = f"""
            MATCH path = (start)-[*0..{max_hops}]-(end)
            WHERE start.name IN $entities
            AND (end.name IN $entities OR length(path) = 1)
            RETURN path
            LIMIT 15
            """
            
            result = session.run(relationship_query, entities=query_entities)
            
            # Process the paths into natural language statements
            relationship_info = []
            seen_relationships = set()  # To avoid duplicates
            
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

    def _format_relationship(self, start_name, rel_type, end_name):
        """Format a relationship into a natural language statement"""
        # Map of relationship types to natural language phrases
        rel_phrases = {
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
        phrase = rel_phrases.get(rel_type, rel_type.lower().replace("_", " "))
        
        # Return formatted statement
        return f"{start_name} {phrase} {end_name}"

    def clear_database(self):
        with self.driver.session() as session:
            session.run("MATCH (n) DETACH DELETE n") 