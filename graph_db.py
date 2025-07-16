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
        with self.driver.session() as session:
            # Create MATCH clauses for each entity
            entity_matches = []
            for i, entity in enumerate(query_entities):
                entity_matches.append(f"(e{i} {{name: '{entity}'}})")
            
            # Build the query to find paths between entities and their neighbors
            cypher_query = f"""
            MATCH path = (start)-[*..{max_hops}]-(end)
            WHERE start.name IN $entities
            RETURN path
            LIMIT 10
            """
            
            result = session.run(cypher_query, entities=query_entities)
            
            # Process the paths into a readable format
            context = []
            for record in result:
                path = record["path"]
                path_str = ""
                for i in range(0, len(path.nodes) - 1):
                    node = path.nodes[i]
                    rel = path.relationships[i]
                    next_node = path.nodes[i + 1]
                    path_str += f"{node['name']} -{rel.type}-> {next_node['name']}, "
                context.append(path_str.rstrip(", "))
            
            return context

    def clear_database(self):
        with self.driver.session() as session:
            session.run("MATCH (n) DETACH DELETE n") 