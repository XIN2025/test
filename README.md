# EVRA

A comprehensive medical RAG (Retrieval-Augmented Generation) system with graph database integration, vector search, and mobile app support.

## 🚀 New Features

### Graph RAG + Vector Store System

- **Intelligent Document Processing**: Upload PDF and text documents for automatic entity and relationship extraction
- **Neo4j Graph Database**: Store and query complex medical knowledge graphs
- **FAISS Vector Store**: Fast similarity search for relevant context retrieval
- **LangGraph Integration**: Advanced conversation workflows with automatic query classification
- **Mobile Document Upload**: Upload and process documents directly from the mobile app

### Enhanced Chat System

- **Query-Based Intelligence**: Automatically switches between RAG and conversational modes
- **Follow-up Questions**: AI generates contextual follow-up questions for better user engagement
- **Real-time Processing**: Stream responses for better user experience
- **Context-Aware Responses**: Leverages uploaded documents for accurate, relevant answers

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Mobile App    │    │   FastAPI       │    │   Neo4j         │
│   (React Native)│◄──►│   Backend       │◄──►│   Graph DB      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌─────────────────┐
                       │   FAISS         │
                       │   Vector Store  │
                       └─────────────────┘
```

## 📁 Project Structure

```
MedicalRag-Evra-POC/
├── api/                          # FastAPI Backend
│   ├── app/
│   │   ├── services/
│   │   │   ├── graph_db.py       # Neo4j database service
│   │   │   ├── vector_store.py   # FAISS vector store
│   │   │   ├── document_processor.py # Document processing
│   │   │   └── chat_service.py   # LangGraph chat system
│   │   └── routers/
│   │       └── chat.py           # Chat and upload endpoints
│   └── test_graph_rag.py         # System test script
├── app/                          # React Native Mobile App
│   └── app/dashboard/
│       └── chat.tsx              # Enhanced chat interface
├── poc/                          # Original POC (reference)
└── setup_graph_rag.md            # Setup guide
```

## 🛠️ Quick Start

### 1. Backend Setup

```bash
cd api
pip install -e .
python -m spacy download en_core_web_sm
```

Create `.env` file:

```env
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=your_password
GOOGLE_API_KEY=your_google_api_key
```

### 2. Mobile App Setup

```bash
cd app
npm install
```

### 3. Test the System

```bash
cd api
python test_graph_rag.py
```

## 🔧 API Endpoints

### Chat & Document Management

- `POST /chat/send` - Send chat message with follow-up questions
- `POST /chat/stream` - Stream chat responses
- `POST /chat/upload` - Upload PDF/TXT documents
- `GET /chat/graph-stats` - Get graph statistics
- `GET /chat/graph-data` - Get all graph data

## 🗄️ Database Management

### Neo4j Database Utilities

The system includes utility scripts for managing the Neo4j graph database:

#### `truncate_neo4j.py` - Database Clearing Utility

A utility script to safely clear all data from the Neo4j database during development and testing.

**Usage:**

```bash
cd api
python truncate_neo4j.py
```

**Features:**

- **Environment-based configuration**: Uses `.env` file for database credentials
- **Safe database clearing**: Implements `DETACH DELETE` to remove all nodes and relationships
- **Standalone execution**: Can be run independently as a script
- **Clear feedback**: Provides confirmation message upon successful execution

**Environment Variables Required:**

```env
NEO4J_URI=bolt://localhost:7687
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=your_password
```

**⚠️ Safety Considerations:**

- **Development Only**: This script should only be used in development/testing environments
- **Data Loss**: Executing this script will permanently delete ALL data in the database
- **Backup**: Always backup important data before running this utility

**Use Cases:**

- Clear test data between development sessions
- Reset database state before running test suites
- Remove corrupted or unwanted data during troubleshooting
- Prepare clean database for demonstrations

## 📱 Mobile App Features

- **Document Upload**: Upload PDF and text files directly from the app
- **Real-time Chat**: Interactive chat with AI health assistant
- **Follow-up Suggestions**: AI-generated contextual questions
- **Document Management**: Track uploaded documents and their processing status

## 🧠 How It Works

### 1. Document Processing

1. User uploads PDF/TXT document
2. System extracts text and identifies entities/relationships
3. Data stored in Neo4j graph database
4. Vector embeddings created for similarity search

### 2. Intelligent Chat

1. User asks a question
2. System classifies query (RAG vs conversational)
3. If RAG: Retrieves relevant context from graph + vector store
4. Generates response with follow-up questions
5. Returns contextual, accurate answers

### 3. Knowledge Graph

- **Entities**: People, organizations, medical concepts, locations
- **Relationships**: Professional connections, medical conditions, treatments
- **Vector Search**: Semantic similarity for context retrieval

## 🎯 Use Cases

- **Medical Document Analysis**: Upload patient records, research papers, medical guidelines
- **Health Information Retrieval**: Ask questions about uploaded medical documents
- **Knowledge Discovery**: Explore relationships between medical entities
- **Conversational AI**: Natural health-related conversations

## 🔍 Key Technologies

- **Backend**: FastAPI, Neo4j, FAISS, LangChain, LangGraph
- **Frontend**: React Native, Expo
- **AI/ML**: Google Gemini, spaCy, Sentence Transformers
- **Document Processing**: Unstructured, PDF extraction

## 📚 Documentation

- [Setup Guide](setup_graph_rag.md) - Detailed installation and configuration
- [API Documentation](api/README.md) - Backend API reference
- [Mobile App Guide](app/README.md) - Mobile app development

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For issues and questions:

1. Check the [setup guide](setup_graph_rag.md)
2. Run the test script: `python api/test_graph_rag.py`
3. Review the troubleshooting section in the setup guide
