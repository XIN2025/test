# MediGraph Assistant

A medical knowledge graph system that extracts medical entities and relationships from text, stores them in a Neo4j graph database, and provides an interactive interface for querying medical knowledge.

## Prerequisites

- Docker and Docker Compose
- Node.js (v16 or higher)
- Python (3.11 or higher)
- pyenv (recommended for Python version management)

## Setup Instructions

### 1. Neo4j Setup

Start Neo4j using Docker:
```bash
docker run \
    --name neo4j \
    -p 7474:7474 -p 7687:7687 \
    -e NEO4J_AUTH=neo4j/your_password \
    -e NEO4J_PLUGINS='["graph-data-science"]' \
    neo4j:latest
```

After first run, you can start/stop the container using:
```bash
docker start neo4j
docker stop neo4j
```

Access Neo4j Browser:
- Open http://localhost:7474
- Initial credentials:
  - Username: neo4j
  - Password: your_password

To reset Neo4j password:
1. Stop the container: `docker stop neo4j`
2. Remove it: `docker rm neo4j`
3. Run the docker command above with a new password

### 2. Backend Setup

1. Create and activate Python virtual environment:
```bash
# Using pyenv
pyenv shell 3.11.2
python -m venv venv

# Activate virtual environment
# On Windows:
./venv/Scripts/activate
# On Unix/MacOS:
source venv/bin/activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Create `.env` file in the backend directory:
```env
GOOGLE_API_KEY=your_gemini_api_key
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=your_password
```

4. Start the backend server:
```bash
uvicorn api:app --reload --port 8000
```

### 3. Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

The application will be available at http://localhost:5173

## Usage

1. Upload Medical Text:
   - Click the upload button in the chat interface
   - Select a text file containing medical information
   - The system will extract entities and relationships

2. Query the Knowledge Graph:
   - Type medical questions in the chat interface
   - The system will provide answers based on the stored knowledge
   - View the relationships in the interactive graph visualization

## Example Queries

- "What are the treatments for Type 2 Diabetes?"
- "What conditions are related to Hypertension?"
- "Tell me about the relationship between Asthma and COPD"
- "What medications are used to treat Rheumatoid Arthritis?"

## Architecture

1. Frontend:
   - React with TypeScript
   - Chakra UI for components
   - D3.js for graph visualization

2. Backend:
   - FastAPI
   - Gemini Pro for entity extraction and query processing
   - Neo4j for graph storage

3. Data Flow:
   - Text Processing:
     - Extracts medical entities and relationships
     - Stores structured data in Neo4j
   - Querying:
     - Analyzes questions using Gemini
     - Retrieves relevant context from Neo4j
     - Generates responses using context

## Troubleshooting

1. Neo4j Connection Issues:
   - Ensure Neo4j container is running: `docker ps`
   - Check logs: `docker logs neo4j`
   - Verify credentials in .env file

2. Backend Issues:
   - Check if virtual environment is activated
   - Verify all environment variables are set
   - Look for errors in the terminal running uvicorn

3. Frontend Issues:
   - Clear browser cache
   - Check browser console for errors
   - Verify backend URL in API calls 