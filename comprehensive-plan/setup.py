#!/usr/bin/env python3
"""
Setup script for the Comprehensive Graph RAG System
==================================================

This script helps set up the Graph RAG system quickly.
"""

import sys
import subprocess
from pathlib import Path

def check_python_version():
    """Check if Python version is compatible"""
    if sys.version_info < (3, 11):
        print("❌ Python 3.11 or higher is required")
        print(f"Current version: {sys.version}")
        return False
    print(f"✅ Python version: {sys.version.split()[0]}")
    return True

def check_docker():
    """Check if Docker is available"""
    try:
        result = subprocess.run(['docker', '--version'], 
                              capture_output=True, text=True)
        if result.returncode == 0:
            print(f"✅ Docker: {result.stdout.strip()}")
            return True
        else:
            print("❌ Docker not found")
            return False
    except FileNotFoundError:
        print("❌ Docker not installed")
        return False

def create_env_file():
    """Create .env file if it doesn't exist"""
    env_file = Path(".env")
    if env_file.exists():
        print("✅ .env file already exists")
        return True
    
    print("📝 Creating .env file...")
    env_content = """# Google Gemini API Key (Required)
GOOGLE_API_KEY=your_gemini_api_key_here

# Neo4j Database Configuration
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=password

# Vector Store Configuration
VECTOR_STORE_PATH=faiss_index.bin

# Agentic Retrieval Configuration
MAX_EXPLORATION_DEPTH=3
SIMILARITY_THRESHOLD=0.6

# Optional: Logging Configuration
LOG_LEVEL=INFO
"""
    
    with open(env_file, 'w') as f:
        f.write(env_content)
    
    print("✅ .env file created")
    print("⚠️  Please edit .env file and add your Google API key")
    return True

def install_dependencies():
    """Install Python dependencies"""
    print("📦 Installing dependencies...")
    try:
        subprocess.run([sys.executable, '-m', 'pip', 'install', '-r', 'requirements.txt'], 
                      check=True)
        print("✅ Dependencies installed successfully")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Failed to install dependencies: {e}")
        return False

def start_neo4j():
    """Start Neo4j container"""
    print("🐳 Starting Neo4j container...")
    try:
        # Check if container already exists
        result = subprocess.run(['docker', 'ps', '-a', '--filter', 'name=neo4j'], 
                              capture_output=True, text=True)
        
        if 'neo4j' in result.stdout:
            print("🔄 Starting existing Neo4j container...")
            subprocess.run(['docker', 'start', 'neo4j'], check=True)
        else:
            print("🆕 Creating new Neo4j container...")
            subprocess.run([
                'docker', 'run', '--name', 'neo4j',
                '-p', '7474:7474', '-p', '7687:7687',
                '-e', 'NEO4J_AUTH=neo4j/password',
                '-e', 'NEO4J_PLUGINS=["graph-data-science"]',
                '-d', 'neo4j:latest'
            ], check=True)
        
        print("✅ Neo4j container started")
        print("🌐 Neo4j Browser available at: http://localhost:7474")
        print("   Username: neo4j")
        print("   Password: password")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Failed to start Neo4j: {e}")
        return False

def main():
    """Main setup function"""
    print("🚀 Comprehensive Graph RAG System Setup")
    print("=" * 50)
    
    # Check prerequisites
    print("\n📋 Checking prerequisites...")
    if not check_python_version():
        sys.exit(1)
    
    if not check_docker():
        print("⚠️  Docker not available. Please install Docker to use Neo4j.")
        print("   You can still use the system with an external Neo4j instance.")
    
    # Create environment file
    print("\n📝 Setting up environment...")
    create_env_file()
    
    # Install dependencies
    print("\n📦 Installing Python dependencies...")
    if not install_dependencies():
        sys.exit(1)
    
    # Start Neo4j (if Docker is available)
    if check_docker():
        print("\n🐳 Setting up Neo4j...")
        if not start_neo4j():
            print("⚠️  Neo4j setup failed. You can start it manually later.")
    
    print("\n✅ Setup completed!")
    print("\n📋 Next steps:")
    print("1. Edit .env file and add your Google API key")
    print("2. Wait for Neo4j to start (if using Docker)")
    print("3. Run: python index.py init")
    print("4. Upload documents: python index.py upload data/sample_medical.txt")
    print("5. Start querying: python index.py interactive")
    print("\n📚 For more information, see README.md")

if __name__ == "__main__":
    main() 