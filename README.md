# Graph RAG with Neo4j Integration

This project implements a Graph RAG (Retrieval Augmented Generation) system that extracts entities and relationships from text, stores them in a Neo4j graph database, and allows querying the knowledge graph.

## Setup

1. Install dependencies:
```bash
pip install -r requirements.txt
python -m spacy download en_core_web_sm
```

2. Set up environment variables in `.env`:
```
OPENAI_API_KEY=your_openai_api_key
NEO4J_URI=your_neo4j_uri
NEO4J_USER=your_neo4j_username
NEO4J_PASSWORD=your_neo4j_password
```

3. Make sure Neo4j is running and accessible.

## Usage

The CLI provides two main commands:

1. Process text and create graph:
```bash
python main.py process-text "Your text block here"
```

2. Query the knowledge graph:
```bash
python main.py query "Your question here"
```

## How it Works

1. Text Processing:
   - Extracts entities using SpaCy
   - Identifies relationships using OpenAI
   - Stores the graph in Neo4j

2. Querying:
   - Analyzes the query
   - Retrieves relevant context from Neo4j
   - Generates response using OpenAI 