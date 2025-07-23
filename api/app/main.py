from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, EmailStr
from pymongo import MongoClient
from passlib.context import CryptContext
import os
from dotenv import load_dotenv
load_dotenv()
from fastapi.middleware.cors import CORSMiddleware

MONGODB_URI = os.getenv("MONGODB_URI")

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # You can restrict this to your frontend's URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class UserRegister(BaseModel):
    name: str
    email: EmailStr
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

@app.on_event("startup")
def startup_db_client():
    app.mongodb_client = MongoClient(MONGODB_URI)
    app.mongodb = app.mongodb_client.get_database()

@app.on_event("shutdown")
def shutdown_db_client():
    app.mongodb_client.close()

@app.post("/register")
def register(user: UserRegister):
    users = app.mongodb["users"]
    if users.find_one({"email": user.email}):
        raise HTTPException(status_code=400, detail="Email already registered")
    hashed_password = pwd_context.hash(user.password)
    user_dict = {"name": user.name, "email": user.email, "password": hashed_password}
    users.insert_one(user_dict)
    return {"message": "User registered successfully"}

@app.post("/login")
def login(user: UserLogin):
    users = app.mongodb["users"]
    db_user = users.find_one({"email": user.email})
    if not db_user or not pwd_context.verify(user.password, db_user["password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    return {"message": "Login successful", "user": {"name": db_user["name"], "email": db_user["email"]}}

@app.get("/")
async def root():
    try:
        server_info = app.mongodb_client.server_info()
        return {"message": "Hello World", "mongodb": "connected", "version": server_info.get("version", "unknown")}
    except Exception as e:
        return {"message": "Hello World", "mongodb": f"connection error: {str(e)}"}
