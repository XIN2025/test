#!/usr/bin/env python3
"""
Comprehensive Graph RAG System with CLI Tool
============================================

A complete system that combines:
1. Graph-based RAG with Neo4j
2. Vector store for similarity search
3. Agentic context retrieval using LangGraph
4. CLI tool for uploading and managing content
5. Interactive query interface

Features:
- Upload documents (PDF, TXT, CSV, etc.)
- Extract entities and relationships
- Store in Neo4j graph database
- Vector embeddings for similarity search
- Agentic retrieval with intelligent exploration
- CLI interface for management
- Web API for queries
"""

import asyncio
import os
import sys
from pathlib import Path
from typing import List, Dict, Any, Optional
from dataclasses import dataclass
import typer
from rich.console import Console
from rich.table import Table
from rich.progress import Progress, SpinnerColumn, TextColumn
from rich.panel import Panel
from rich.prompt import Prompt, Confirm
from rich import print as rprint

# Add the project root to Python path
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

from core.db.graph_db import Neo4jDatabase
from core.retrieval.vector_store import VectorStore
from core.retrieval.agentic_context_retrieval import AgenticContextRetrieval
from core.processing.pdf_processor import PDFProcessor
from core.processing.text_processor import TextProcessor
from langchain_google_genai import ChatGoogleGenerativeAI
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

console = Console()
app = typer.Typer(help="Comprehensive Graph RAG System CLI")

@dataclass
class SystemConfig:
    """Configuration for the Graph RAG system"""
    neo4j_uri: str = "bolt://localhost:7687"
    neo4j_user: str = "neo4j"
    neo4j_password: str = "password"
    google_api_key: str = ""
    vector_store_path: str = "faiss_index.bin"
    max_exploration_depth: int = 3
    similarity_threshold: float = 0.6

class GraphRAGSystem:
    """Main Graph RAG system class"""
    
    def __init__(self, config: SystemConfig):
        self.config = config
        self.db = None
        self.vector_store = None
        self.llm = None
        self.agentic_retrieval = None
        self.text_processor = None
        self.pdf_processor = None
        
    async def initialize(self):
        """Initialize all system components"""
        with console.status("[bold green]Initializing Graph RAG System..."):
            try:
                # Initialize database
                self.db = Neo4jDatabase()
                console.print("✅ Neo4j database connected")
                
                # Initialize vector store
                self.vector_store = VectorStore(index_path=self.config.vector_store_path)
                console.print("✅ Vector store initialized")
                
                # Initialize LLM
                if not self.config.google_api_key:
                    raise ValueError("GOOGLE_API_KEY not found in environment variables")
                
                self.llm = ChatGoogleGenerativeAI(
                    model="gemini-pro",
                    google_api_key=self.config.google_api_key,
                    temperature=0.1
                )
                console.print("✅ LLM initialized")
                
                # Initialize processors
                self.text_processor = TextProcessor()
                self.pdf_processor = PDFProcessor(self.text_processor)
                console.print("✅ Text processors initialized")
                
                # Initialize agentic retrieval
                self.agentic_retrieval = AgenticContextRetrieval(
                    llm=self.llm,
                    db=self.db,
                    vector_store=self.vector_store
                )
                console.print("✅ Agentic retrieval system initialized")
                
                console.print("[bold green]🎉 System initialization complete!")
                
            except Exception as e:
                console.print(f"[bold red]❌ Initialization failed: {e}")
                raise
    
    async def upload_document(self, file_path: str) -> Dict[str, Any]:
        """Upload and process a document"""
        file_path = Path(file_path)
        
        if not file_path.exists():
            raise FileNotFoundError(f"File not found: {file_path}")
        
        console.print(f"[bold blue]📄 Processing document: {file_path.name}")
        
        with open(file_path, 'rb') as f:
            file_content = f.read()
        
        # Process based on file type
        if file_path.suffix.lower() == '.pdf':
            entities, relationships, images = self.pdf_processor.process_pdf(
                file_content, file_path.name
            )
        else:
            # Treat as text file
            text_content = file_content.decode('utf-8')
            entities, relationships = self.text_processor.process_text(text_content)
            images = []
        
        # Store in database
        console.print("[yellow]💾 Storing entities and relationships...")
        
        entity_count = 0
        relationship_count = 0
        
        for entity in entities:
            self.db.create_entity(
                entity_type=entity.get('type', 'Unknown'),
                name=entity.get('name', 'Unknown'),
                properties=entity.get('properties', {})
            )
            entity_count += 1
        
        for rel in relationships:
            self.db.create_relationship(
                from_entity=rel.get('from_entity', ''),
                relationship_type=rel.get('type', 'RELATES_TO'),
                to_entity=rel.get('to_entity', ''),
                properties=rel.get('properties', {})
            )
            relationship_count += 1
        
        # Sync vector store
        console.print("[yellow]🔄 Syncing vector store...")
        self.vector_store.sync_from_graph(self.db)
        
        return {
            'entities': entity_count,
            'relationships': relationship_count,
            'images': len(images),
            'filename': file_path.name
        }
    
    async def query(self, question: str, max_depth: int = None) -> Dict[str, Any]:
        """Query the knowledge graph using agentic retrieval"""
        if max_depth is None:
            max_depth = self.config.max_exploration_depth
        
        console.print(f"[bold blue]🔍 Querying: {question}")
        
        try:
            # Use agentic retrieval
            context = await self.agentic_retrieval.retrieve_context(
                query=question,
                max_depth=max_depth
            )
            
            # Generate answer using LLM
            messages = [
                SystemMessage(content="""You are a helpful assistant that answers questions based on the provided context. 
                Use only the information in the context to answer the question. If the context doesn't contain enough 
                information to answer the question, say so."""),
                HumanMessage(content=f"Context: {' '.join(context)}\n\nQuestion: {question}")
            ]
            
            response = await self.llm.ainvoke(messages)
            answer = response.content
            
            return {
                'question': question,
                'answer': answer,
                'context': context,
                'context_count': len(context)
            }
            
        except Exception as e:
            console.print(f"[bold red]❌ Query failed: {e}")
            raise
    
    async def get_graph_stats(self) -> Dict[str, Any]:
        """Get statistics about the knowledge graph"""
        try:
            # Get all entities
            entities = self.db.get_all_entities()
            
            # Count by type
            entity_types = {}
            for entity in entities:
                entity_type = entity.get('type', 'Unknown')
                entity_types[entity_type] = entity_types.get(entity_type, 0) + 1
            
            # Get graph data for relationship count
            nodes, links = self.db.get_graph_data()
            
            return {
                'total_entities': len(entities),
                'total_relationships': len(links),
                'entity_types': entity_types,
                'nodes': nodes,
                'links': links
            }
            
        except Exception as e:
            console.print(f"[bold red]❌ Failed to get stats: {e}")
            raise
    
    async def clear_database(self):
        """Clear all data from the database"""
        if Confirm.ask("Are you sure you want to clear all data?"):
            self.db.clear_database()
            self.vector_store = VectorStore(index_path=self.config.vector_store_path)
            console.print("[bold green]✅ Database cleared")
        else:
            console.print("[yellow]Operation cancelled")

# Global system instance
system = None

@app.command()
def init():
    """Initialize the Graph RAG system"""
    global system
    
    config = SystemConfig(
        neo4j_uri=os.getenv("NEO4J_URI", "bolt://localhost:7687"),
        neo4j_user=os.getenv("NEO4J_USER", "neo4j"),
        neo4j_password=os.getenv("NEO4J_PASSWORD", "password"),
        google_api_key=os.getenv("GOOGLE_API_KEY", ""),
        vector_store_path=os.getenv("VECTOR_STORE_PATH", "faiss_index.bin"),
        max_exploration_depth=int(os.getenv("MAX_EXPLORATION_DEPTH", "3")),
        similarity_threshold=float(os.getenv("SIMILARITY_THRESHOLD", "0.6"))
    )
    
    system = GraphRAGSystem(config)
    
    try:
        asyncio.run(system.initialize())
        console.print("[bold green]✅ System initialized successfully!")
    except Exception as e:
        console.print(f"[bold red]❌ Initialization failed: {e}")
        sys.exit(1)

@app.command()
def upload(
    file_path: str = typer.Argument(..., help="Path to the file to upload")
):
    """Upload a document to the knowledge graph"""
    global system
    
    if system is None:
        console.print("[bold red]❌ System not initialized. Run 'init' first.")
        sys.exit(1)
    
    try:
        result = asyncio.run(system.upload_document(file_path))
        
        # Display results
        table = Table(title="Upload Results")
        table.add_column("Metric", style="cyan")
        table.add_column("Count", style="magenta")
        
        table.add_row("Entities", str(result['entities']))
        table.add_row("Relationships", str(result['relationships']))
        table.add_row("Images", str(result['images']))
        table.add_row("Filename", result['filename'])
        
        console.print(table)
        
    except Exception as e:
        console.print(f"[bold red]❌ Upload failed: {e}")
        sys.exit(1)

@app.command()
def query(
    question: str = typer.Argument(..., help="Question to ask")
):
    """Query the knowledge graph"""
    global system
    
    if system is None:
        console.print("[bold red]❌ System not initialized. Run 'init' first.")
        sys.exit(1)
    
    try:
        result = asyncio.run(system.query(question))
        
        # Display results
        console.print(Panel(
            f"[bold blue]Question:[/bold blue] {result['question']}\n\n"
            f"[bold green]Answer:[/bold green] {result['answer']}\n\n"
            f"[bold yellow]Context pieces:[/bold yellow] {result['context_count']}",
            title="Query Results",
            border_style="green"
        ))
        
        if result['context']:
            console.print("\n[bold cyan]Context used:[/bold cyan]")
            for i, context in enumerate(result['context'], 1):
                console.print(f"{i}. {context}")
        
    except Exception as e:
        console.print(f"[bold red]❌ Query failed: {e}")
        sys.exit(1)

@app.command()
def stats():
    """Show knowledge graph statistics"""
    global system
    
    if system is None:
        console.print("[bold red]❌ System not initialized. Run 'init' first.")
        sys.exit(1)
    
    try:
        stats = asyncio.run(system.get_graph_stats())
        
        # Display statistics
        table = Table(title="Knowledge Graph Statistics")
        table.add_column("Metric", style="cyan")
        table.add_column("Value", style="magenta")
        
        table.add_row("Total Entities", str(stats['total_entities']))
        table.add_row("Total Relationships", str(stats['total_relationships']))
        
        console.print(table)
        
        if stats['entity_types']:
            console.print("\n[bold cyan]Entities by Type:[/bold cyan]")
            entity_table = Table()
            entity_table.add_column("Type", style="cyan")
            entity_table.add_column("Count", style="magenta")
            
            for entity_type, count in stats['entity_types'].items():
                entity_table.add_row(entity_type, str(count))
            
            console.print(entity_table)
        
    except Exception as e:
        console.print(f"[bold red]❌ Failed to get stats: {e}")
        sys.exit(1)

@app.command()
def clear():
    """Clear all data from the database"""
    global system
    
    if system is None:
        console.print("[bold red]❌ System not initialized. Run 'init' first.")
        sys.exit(1)
    
    try:
        asyncio.run(system.clear_database())
    except Exception as e:
        console.print(f"[bold red]❌ Clear failed: {e}")
        sys.exit(1)

@app.command()
def interactive():
    """Start interactive query mode"""
    global system
    
    if system is None:
        console.print("[bold red]❌ System not initialized. Run 'init' first.")
        sys.exit(1)
    
    console.print("[bold green]🤖 Interactive Query Mode")
    console.print("Type 'quit' to exit\n")
    
    while True:
        try:
            question = Prompt.ask("[bold blue]Question")
            
            if question.lower() in ['quit', 'exit', 'q']:
                console.print("[yellow]Goodbye!")
                break
            
            if not question.strip():
                continue
            
            result = asyncio.run(system.query(question))
            
            console.print(f"\n[bold green]Answer:[/bold green] {result['answer']}")
            console.print(f"[bold yellow]Context pieces used:[/bold yellow] {result['context_count']}\n")
            
        except KeyboardInterrupt:
            console.print("\n[yellow]Goodbye!")
            break
        except Exception as e:
            console.print(f"[bold red]❌ Error: {e}\n")

if __name__ == "__main__":
    app()
