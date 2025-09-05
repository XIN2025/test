from neo4j import GraphDatabase
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

NEO4J_URI = os.getenv("NEO4J_URI")
NEO4J_USER = os.getenv("NEO4J_USERNAME")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD")

def truncate_neo4j_database(uri, user, password):
    driver = GraphDatabase.driver(uri, auth=(user, password))
    with driver.session() as session:
        # Detach delete all nodes (and relationships)
        session.run("MATCH (n) DETACH DELETE n")
    driver.close()
    print("All nodes and relationships have been deleted from the Neo4j database.")

if __name__ == "__main__":
    truncate_neo4j_database(NEO4J_URI, NEO4J_USER, NEO4J_PASSWORD)
