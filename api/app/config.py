import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# MongoDB Configuration
MONGODB_URI = os.getenv("MONGODB_URI")
VECTOR_STORE_DB_URI = os.getenv("VECTOR_STORE_DB_URI")
VECTOR_COLLECTION_NAME=os.getenv("VECTOR_COLLECTION_NAME")
VECTOR_DB_NAME=os.getenv("VECTOR_DB_NAME")
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
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "all-MiniLM-L6-v2")

# LLM Configuration
OPENAI_API_KEY = os.getenv("OPENAI_KEY")  # Load from OPENAI_KEY in .env
LLM_MODEL = os.getenv("LLM_MODEL", "gpt-4o-mini")  # Updated to a valid model name
LLM_TEMPERATURE = os.getenv("LLM_TEMPERATURE", "1")

# File Upload Configuration
MAX_FILE_SIZE = int(os.getenv("MAX_FILE_SIZE", "10485760"))  # 10MB
ALLOWED_EXTENSIONS = {".txt", ".pdf", ".docx", ".doc"}
UPLOAD_DIR = os.getenv("UPLOAD_DIR", "uploads") 