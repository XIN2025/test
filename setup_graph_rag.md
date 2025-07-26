# Graph RAG + Vector Store Setup Guide

This guide will help you set up the Graph RAG system with vector store capabilities for the MedicalRag-Evra-POC project.

## Prerequisites

1. **Python 3.12+**
2. **Neo4j Database** (local or cloud)
3. **Google API Key** for Gemini LLM
4. **Node.js** for the mobile app

## Backend Setup (API)

### 1. Install Dependencies

Navigate to the `api` directory and install the Python dependencies:

```bash
cd api
pip install -e .
```

### 2. Install Additional Dependencies

Install spaCy model and additional packages:

```bash
# Install spaCy English model
python -m spacy download en_core_web_sm

# Install additional packages if needed
pip install unstructured[pdf]
```

### 3. Environment Configuration

Create a `.env` file in the `api` directory with the following variables:

```env
# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017

# Neo4j Configuration
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=your_password

# LLM Configuration
GOOGLE_API_KEY=your_google_api_key
LLM_MODEL=gemini-1.5-flash
LLM_TEMPERATURE=0.1

# Vector Store Configuration
VECTOR_INDEX_PATH=faiss_index.bin
EMBEDDING_MODEL=all-MiniLM-L6-v2

# File Upload Configuration
MAX_FILE_SIZE=10485760
UPLOAD_DIR=uploads
```

### 4. Start the API Server

```bash
# Development server
python -m scripts.dev_server

# Or production server
python -m scripts.prod_server
```

The API will be available at `http://localhost:8000`

## Mobile App Setup

### 1. Install Dependencies

Navigate to the `app` directory and install dependencies:

```bash
cd app
npm install
```

### 2. Update API URL

In `app/app/dashboard/chat.tsx`, update the `API_BASE_URL` to point to your API server:

```typescript
const API_BASE_URL = "http://your-api-server:8000";
```

### 3. Start the Mobile App

```bash
npm start
```

## API Endpoints

### Chat Endpoints

- `POST /chat/send` - Send a chat message
- `POST /chat/stream` - Stream chat response
- `POST /chat/upload` - Upload document (PDF/TXT)

### Graph Management Endpoints

- `GET /chat/graph-stats` - Get graph statistics
- `GET /chat/graph-data` - Get all graph data
- `DELETE /chat/clear-graph` - Clear all graph data
- `POST /chat/sync-vector-store` - Sync vector store with graph

## Usage

### 1. Upload Documents

Use the upload button in the mobile app to upload PDF or text files. The system will:

- Extract text from PDFs
- Identify entities and relationships using LLM
- Store data in Neo4j graph database
- Update the vector store for similarity search

### 2. Chat with AI

The AI assistant can:

- Answer questions based on uploaded documents
- Provide general health advice
- Generate follow-up questions
- Switch between RAG and conversational modes automatically

### 3. Graph Visualization

You can access graph data through the API endpoints to visualize the knowledge graph.

## Architecture

### Components

1. **Graph Database (Neo4j)**: Stores entities and relationships
2. **Vector Store (FAISS)**: Enables similarity search
3. **Document Processor**: Extracts entities and relationships from documents
4. **Chat Service**: LangGraph-based conversation system
5. **Mobile App**: React Native interface with document upload

### Workflow

1. **Document Upload**: PDF/TXT → Text Extraction → Entity/Relationship Extraction → Graph Storage
2. **Chat Query**: Query Classification → Context Retrieval → Response Generation → Follow-up Questions
3. **Vector Search**: Query → Similarity Search → Relevant Context → Enhanced Response

## Troubleshooting

### Common Issues

1. **Neo4j Connection**: Ensure Neo4j is running and credentials are correct
2. **Google API Key**: Verify your API key has access to Gemini models
3. **File Upload**: Check file size limits and supported formats
4. **Dependencies**: Ensure all Python packages are installed correctly

### Logs

Check the API logs for detailed error messages and debugging information.

## Performance Tips

1. **Vector Store**: The FAISS index is stored on disk and loaded on startup
2. **Graph Database**: Consider indexing frequently queried properties
3. **Document Processing**: Large documents are chunked for better processing
4. **Caching**: LangGraph provides built-in state caching

## Security Considerations

1. **API Keys**: Keep your Google API key secure
2. **File Upload**: Validate file types and sizes
3. **Database**: Secure your Neo4j instance
4. **CORS**: Configure CORS settings for production

## Next Steps

1. **Production Deployment**: Set up proper hosting and monitoring
2. **Advanced Features**: Add image processing, multi-language support
3. **Analytics**: Track usage patterns and improve responses
4. **Integration**: Connect with other health systems and APIs
