from fastapi import FastAPI, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from .services.db import get_db, close_db
from .services.graph_db import get_graph_db, close_graph_db
from .services.vector_store import get_vector_store
from .routers.auth import auth_router
from .routers.user import user_router
from .routers.chat import chat_router
from .routers.upload import upload_router
from .routers.goals import goals_router
from .services.email_utils import send_email

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    get_db()
    # Initialize graph RAG services
    try:
        get_graph_db()
        get_vector_store()
    except Exception as e:
        print(f"Warning: Graph RAG services initialization failed: {e}")
    
    yield
    
    # Shutdown
    close_db()
    close_graph_db()

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(user_router)
app.include_router(chat_router)
app.include_router(upload_router)
app.include_router(goals_router)

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
