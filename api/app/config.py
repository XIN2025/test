import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# MongoDB Configuration
MONGODB_URI = os.getenv("MONGODB_URI")
DB_NAME = os.getenv("MONGODB_DB_NAME", "evra")
VECTOR_STORE_DB_URI = os.getenv("VECTOR_STORE_DB_URI", "test_vector_store_uri")
VECTOR_COLLECTION_NAME=os.getenv("VECTOR_COLLECTION_NAME", "test_vector_collection")
VECTOR_DB_NAME=os.getenv("VECTOR_DB_NAME", "test_vector_db")
SECRET_KEY = os.getenv("SECRET_KEY", "secret")
NUDGE_SCHEDULED_COLLECTION = os.getenv("NUDGE_SCHEDULED_COLLECTION", "nudge_scheduled_jobs")

# SMTP/Email Configuration
SMTP_HOST = os.getenv("SMTP_HOST")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")
SMTP_FROM = os.getenv("SMTP_FROM")
SMTP_FROM_NAME = os.getenv("SMTP_FROM_NAME", "JetFuel")

# Neo4j Configuration
NEO4J_URI = os.getenv("NEO4J_URI", "bolt://localhost:7687")
NEO4J_USER = os.getenv("NEO4J_USER", "neo4j")
NEO4J_PASSWORD = os.getenv("NEO4J_PASSWORD", "1234qazw0987")

# Vector Store Configuration
VECTOR_INDEX_PATH = os.getenv("VECTOR_INDEX_PATH", "faiss_index.bin")
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "text-embedding-3-small")

# LLM Configuration
OPENAI_API_KEY = os.getenv("OPENAI_KEY", "test-openai-key")  # Load from OPENAI_KEY in .env
LLM_MODEL = os.getenv("LLM_MODEL", "gpt-3.5-turbo")  # Updated to a valid model name
LLM_TEMPERATURE = os.getenv("LLM_TEMPERATURE", "0.5")

# Deepgram Configuration
DEEPGRAM_API_KEY = os.getenv("DEEPGRAM_API_KEY")

# File Upload Configuration
MAX_FILE_SIZE = int(os.getenv("MAX_FILE_SIZE", "10485760"))  # 10MB
ALLOWED_EXTENSIONS = {".txt", ".pdf", ".docx", ".doc"}
UPLOAD_DIR = os.getenv("UPLOAD_DIR", "uploads") 
