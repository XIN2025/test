import typer
from rich import print
from text_processor import TextProcessor
from graph_db import Neo4jDatabase
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import SystemMessage, HumanMessage
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Get API key
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
if not GOOGLE_API_KEY:
    raise ValueError("GOOGLE_API_KEY not found in environment variables. Please check your .env file.")

app = typer.Typer()
processor = TextProcessor()
db = Neo4jDatabase()
llm = ChatGoogleGenerativeAI(
    model="gemini-1.5-flash",
    google_api_key=GOOGLE_API_KEY
)

@app.command()
def process_text(text: str):
    """Process a block of text to extract entities and relationships"""
    try:
        print("[bold blue]Processing text...[/bold blue]")
        
        # Extract entities and relationships
        entities, relationships = processor.process_text(text)
        
        # Store entities in Neo4j
        print("[bold green]Extracted Entities:[/bold green]")
        for entity in entities:
            print(f"- {entity['name']} ({entity['type']})")
            db.create_entity(entity['type'], entity['name'])
        
        # Store relationships in Neo4j
        print("\n[bold green]Identified Relationships:[/bold green]")
        for rel in relationships:
            print(f"- {rel['from']} -{rel['type']}-> {rel['to']}")
            db.create_relationship(rel['from'], rel['type'], rel['to'])
        
        print("\n[bold blue]Successfully stored in Neo4j![/bold blue]")
    except Exception as e:
        print(f"[bold red]Error processing text: {str(e)}[/bold red]")

@app.command()
def query(question: str):
    """Query the knowledge graph"""
    try:
        print("[bold blue]Processing query...[/bold blue]")
        
        # First, extract entities from the question
        entities = processor.extract_entities(question)
        entity_names = [e["name"] for e in entities]
        
        # Get relevant context from Neo4j
        context = db.get_context(entity_names)
        
        if not context:
            print("[bold red]No relevant information found in the knowledge graph.[/bold red]")
            return
        
        # Format context for LLM
        context_str = "\n".join(context)
        
        # Create messages for the prompt
        messages = [
            SystemMessage(content="You are a helpful assistant that answers questions based on the provided knowledge graph context."),
            HumanMessage(content=f"""Given the following context from a knowledge graph and a question, provide a detailed answer.
            Use only the information provided in the context.
            
            Context:
            {context_str}
            
            Question: {question}""")
        ]
        
        # Get answer from LLM
        response = llm.invoke(messages)
        
        print("\n[bold green]Answer:[/bold green]")
        print(response.content)
    except Exception as e:
        print(f"[bold red]Error processing query: {str(e)}[/bold red]")

@app.command()
def clear():
    """Clear the entire graph database"""
    if typer.confirm("Are you sure you want to clear the entire database?"):
        try:
            db.clear_database()
            print("[bold green]Database cleared successfully![/bold green]")
        except Exception as e:
            print(f"[bold red]Error clearing database: {str(e)}[/bold red]")

if __name__ == "__main__":
    app() 