# Comprehensive Graph RAG System with CLI Tool

A complete Graph-based Retrieval-Augmented Generation (RAG) system that combines Neo4j graph database, vector embeddings, and agentic context retrieval using LangGraph.

## Features

- **Document Upload**: Upload PDF, TXT, CSV, and other document formats
- **Entity & Relationship Extraction**: Automatically extract entities and relationships from documents
- **Graph Database Storage**: Store structured knowledge in Neo4j
- **Vector Embeddings**: FAISS-based similarity search
- **Agentic Retrieval**: Intelligent context exploration using LangGraph
- **CLI Interface**: Easy-to-use command-line tool for management
- **Interactive Querying**: Real-time question answering
- **Statistics & Monitoring**: Track knowledge graph metrics

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Document      │    │   Text/PDF      │    │   Entity &      │
│   Upload        │───▶│   Processor     │───▶│   Relationship  │
│   (CLI)        │    │                 │    │   Extractor     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                        │
                                                        ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Query         │    │   Agentic       │    │   Neo4j Graph   │
│   Interface     │◀───│   Context       │◀───│   Database      │
│   (CLI/API)    │    │   Retrieval     │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │   Vector Store  │
                       │   (FAISS)       │
                       └─────────────────┘
```

## Prerequisites

- Python 3.11 or higher
- Docker (for Neo4j)
- Google API Key (for Gemini Pro)

## Installation

1. **Clone and Setup**:

```bash
cd comprehensive-plan
python -m venv venv
# On Windows:
venv\Scripts\activate
# On Unix/MacOS:
source venv/bin/activate
```

2. **Install Dependencies**:

```bash
pip install -r requirements.txt
```

3. **Setup Neo4j**:

```bash
docker run \
    --name neo4j \
    -p 7474:7474 -p 7687:7687 \
    -e NEO4J_AUTH=neo4j/your_password \
    -e NEO4J_PLUGINS='["graph-data-science"]' \
    neo4j:latest
```

4. **Environment Variables**:
   Create a `.env` file:

```env
GOOGLE_API_KEY=your_gemini_api_key
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=your_password
VECTOR_STORE_PATH=faiss_index.bin
MAX_EXPLORATION_DEPTH=3
SIMILARITY_THRESHOLD=0.6
```

## Usage

### CLI Commands

1. **Initialize System**:

```bash
python index.py init
```

2. **Upload Documents**:

```bash
python index.py upload path/to/document.pdf
python index.py upload path/to/document.txt
```

3. **Query Knowledge Graph**:

```bash
python index.py query "What are the treatments for diabetes?"
```

4. **View Statistics**:

```bash
python index.py stats
```

5. **Interactive Mode**:

```bash
python index.py interactive
```

6. **Clear Database**:

```bash
python index.py clear
```

### Example Workflow

```bash
# 1. Initialize the system
python index.py init

# 2. Upload some medical documents
python index.py upload data/sample_medical.txt
python index.py upload data/sample_text.txt

# 3. Check statistics
python index.py stats

# 4. Query the knowledge graph
python index.py query "What are the symptoms of hypertension?"

# 5. Start interactive mode for multiple queries
python index.py interactive
```

## System Components

### 1. Document Processing

- **PDF Processor**: Extracts text and images from PDF files
- **Text Processor**: Processes plain text and extracts entities/relationships
- **Entity Extraction**: Uses LLM to identify medical entities
- **Relationship Extraction**: Discovers relationships between entities

### 2. Graph Database (Neo4j)

- **Entity Storage**: Stores entities with properties
- **Relationship Storage**: Stores relationships between entities
- **Graph Queries**: Complex graph traversal queries
- **Context Retrieval**: Multi-hop relationship exploration

### 3. Vector Store (FAISS)

- **Embedding Generation**: Creates vector embeddings for entities
- **Similarity Search**: Fast similarity-based retrieval
- **Hybrid Search**: Combines graph and vector search

### 4. Agentic Context Retrieval

- **LangGraph Workflow**: Stateful exploration workflow
- **Intelligent Exploration**: Chooses relevant nodes to explore
- **Relationship Traversal**: Discovers new connections
- **Context Synthesis**: Ranks and synthesizes information

### 5. CLI Interface

- **Rich UI**: Beautiful terminal interface with tables and panels
- **Progress Tracking**: Real-time progress indicators
- **Error Handling**: Graceful error handling and recovery
- **Interactive Mode**: Conversational query interface

## Configuration

### Environment Variables

| Variable                | Description                       | Default                 |
| ----------------------- | --------------------------------- | ----------------------- |
| `GOOGLE_API_KEY`        | Google Gemini API key             | Required                |
| `NEO4J_URI`             | Neo4j connection URI              | `bolt://localhost:7687` |
| `NEO4J_USER`            | Neo4j username                    | `neo4j`                 |
| `NEO4J_PASSWORD`        | Neo4j password                    | `password`              |
| `VECTOR_STORE_PATH`     | FAISS index file path             | `faiss_index.bin`       |
| `MAX_EXPLORATION_DEPTH` | Max graph exploration depth       | `3`                     |
| `SIMILARITY_THRESHOLD`  | Similarity threshold for matching | `0.6`                   |

### System Configuration

The system can be customized through the `SystemConfig` class:

```python
@dataclass
class SystemConfig:
    neo4j_uri: str = "bolt://localhost:7687"
    neo4j_user: str = "neo4j"
    neo4j_password: str = "password"
    google_api_key: str = ""
    vector_store_path: str = "faiss_index.bin"
    max_exploration_depth: int = 3
    similarity_threshold: float = 0.6
```

## API Endpoints (Optional)

The system can also expose a FastAPI web interface:

```bash
# Start the API server
uvicorn api:app --reload --port 8000
```

Available endpoints:

- `POST /upload` - Upload documents
- `POST /query` - Query the knowledge graph
- `GET /stats` - Get graph statistics
- `GET /graph` - Get graph data for visualization

## Troubleshooting

### Common Issues

1. **Neo4j Connection Failed**:

   - Ensure Neo4j container is running: `docker ps`
   - Check credentials in `.env` file
   - Verify Neo4j is accessible at `localhost:7687`

2. **Google API Key Error**:

   - Ensure `GOOGLE_API_KEY` is set in `.env`
   - Verify the API key is valid and has Gemini Pro access

3. **Import Errors**:

   - Ensure all dependencies are installed: `pip install -r requirements.txt`
   - Check Python version (3.11+ required)

4. **Memory Issues**:
   - Reduce `MAX_EXPLORATION_DEPTH` for large graphs
   - Use smaller documents or batch processing

### Performance Tips

1. **Large Documents**: Split large documents into smaller chunks
2. **Batch Processing**: Upload multiple documents in sequence
3. **Memory Management**: Monitor memory usage during processing
4. **Caching**: The system caches vector embeddings for faster retrieval

## Development

### Project Structure

```
comprehensive-plan/
├── index.py                 # Main CLI application
├── requirements.txt         # Python dependencies
├── README.md              # This file
├── .env                   # Environment variables
├── core/                  # Core system modules
│   ├── db/               # Database components
│   │   └── graph_db.py   # Neo4j database interface
│   ├── processing/       # Document processing
│   │   ├── pdf_processor.py
│   │   ├── text_processor.py
│   │   └── prompts.py
│   └── retrieval/        # Retrieval components
│       ├── agentic_context_retrieval.py
│       └── vector_store.py
└── data/                 # Sample data
    ├── sample_medical.txt
    └── sample_text.txt
```

### Adding New Features

1. **New Document Types**: Extend the processing pipeline
2. **Custom Entities**: Modify entity extraction prompts
3. **Advanced Queries**: Add new query types to the CLI
4. **Visualization**: Integrate with graph visualization tools

## License

This project is licensed under the MIT License.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## Support

For issues and questions:

1. Check the troubleshooting section
2. Review the logs for error messages
3. Ensure all prerequisites are met
4. Create an issue with detailed information
