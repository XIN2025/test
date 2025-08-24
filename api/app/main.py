from fastapi import FastAPI, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import asyncio
from .services.db import get_db, close_db
from .services.graph_db import get_graph_db, close_graph_db
from .services.vector_store import get_vector_store
from .services.document_manager import get_document_manager
from .routers.auth import auth_router
from .routers.user import user_router
from .routers.chat import chat_router
from .routers.upload import upload_router
from .routers.goals import goals_router
from .routers.preferences import preferences_router
from .services.email_utils import send_email

# Set up better event loop for improved async performance
try:
    import uvloop
    asyncio.set_event_loop_policy(uvloop.EventLoopPolicy())
except ImportError:
    # uvloop not available on Windows, use default
    pass

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("🚀 Starting Medical RAG API...")
    get_db()
    
    # Initialize graph RAG services
    try:
        print("📊 Initializing Graph RAG services...")
        graph_db = get_graph_db()
        vector_store = get_vector_store()
        
        # Sync vector store with graph database on startup
        print("🔄 Syncing vector store with graph database...")
        try:
            vector_store.sync_from_graph(graph_db)
            print("✅ Vector store synchronized successfully")
        except Exception as sync_error:
            print(f"⚠️  Warning: Vector store sync failed: {sync_error}")
            print("   The system will continue to work, but vector search may be incomplete")
        
        # Sync MongoDB with Graph DB and clean up orphaned nodes
        print("🔄 Syncing MongoDB with Graph DB and cleaning orphaned nodes...")
        try:
            document_manager = get_document_manager()
            sync_result = document_manager.sync_graph_with_mongodb()
            print(f"✅ MongoDB-Graph DB sync completed:")
            print(f"   - Documents in MongoDB: {sync_result.get('total_documents', 0)}")
            print(f"   - Valid nodes: {sync_result.get('valid_nodes', 0)}")
            print(f"   - Orphaned nodes found: {sync_result.get('orphaned_nodes', 0)}")
            print(f"   - Nodes deleted: {sync_result.get('deleted_nodes', 0)}")
            print(f"   - Graph nodes after cleanup: {sync_result.get('graph_nodes_after', 0)}")
        except Exception as sync_error:
            print(f"⚠️  Warning: MongoDB-Graph DB sync failed: {sync_error}")
            print("   The system will continue to work, but data consistency may be affected")
        
        print("✅ Graph RAG services initialized successfully")
    except Exception as e:
        print(f"❌ Error: Graph RAG services initialization failed: {e}")
        print("   The API will start but graph RAG features may not work properly")
    
    print("🎉 Medical RAG API startup complete!")
    
    yield
    
    # Shutdown
    print("🛑 Shutting down Medical RAG API...")
    close_db()
    close_graph_db()
    print("✅ Shutdown complete")

app = FastAPI(
    lifespan=lifespan,
    title="Medical RAG API", 
    description="Medical RAG API with async support",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add async middleware for better concurrency
@app.middleware("http")
async def add_async_headers(request, call_next):
    response = await call_next(request)
    response.headers["X-Async-Enabled"] = "true"
    return response

app.include_router(auth_router)
app.include_router(user_router)
app.include_router(chat_router)
app.include_router(upload_router)
app.include_router(goals_router)
app.include_router(preferences_router)

@app.get("/")
async def root():
    db = get_db()
    try:
        server_info = db.client.server_info()
        return {"message": "Hello World", "mongodb": "connected", "version": server_info.get("version", "unknown")}
    except Exception as e:
        return {"message": "Hello World", "mongodb": f"connection error: {str(e)}"}

@app.post("/send-email")
def send_email_endpoint(
    to_email: str = Body(...),
    subject: str = Body(...),
    body: str = Body(...)
):
    try:
        send_email(to_email, subject, body)
        return {"message": "Email sent successfully"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send email: {str(e)}")
