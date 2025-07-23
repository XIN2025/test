from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, EmailStr
from pymongo import MongoClient
from passlib.context import CryptContext
import os
from dotenv import load_dotenv
load_dotenv()
from fastapi.middleware.cors import CORSMiddleware
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import random

MONGODB_URI = os.getenv("MONGODB_URI")

SMTP_HOST = os.getenv("SMTP_HOST")
SMTP_PORT = int(os.getenv("SMTP_PORT", "465"))
SMTP_USER = os.getenv("SMTP_USER")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")
SMTP_FROM = os.getenv("SMTP_FROM")
SMTP_FROM_NAME = os.getenv("SMTP_FROM_NAME", "JetFuel")

def send_email(to_email: str, subject: str, body: str):
    msg = MIMEMultipart()
    msg["From"] = f"{SMTP_FROM_NAME} <{SMTP_FROM}>"
    msg["To"] = to_email
    msg["Subject"] = subject
    msg.attach(MIMEText(body, "plain"))
    with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT) as server:
        server.login(SMTP_USER, SMTP_PASSWORD)
        server.sendmail(SMTP_FROM, to_email, msg.as_string())

def generate_otp():
    return str(random.randint(100000, 999999))

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

class UserLogin(BaseModel):
    email: EmailStr

class OTPVerify(BaseModel):
    email: EmailStr
    otp: str

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
    otp = generate_otp()
    user_dict = {
        "name": user.name,
        "email": user.email,
        "otp": otp,
        "verified": False
    }
    users.insert_one(user_dict)
    send_email(user.email, "Your OTP for Registration", f"Your OTP is: {otp}")
    return {"message": "OTP sent to email. Please verify to complete registration."}

@app.post("/login")
def login(user: UserLogin):
    users = app.mongodb["users"]
    db_user = users.find_one({"email": user.email})
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    if not db_user.get("verified", False):
        raise HTTPException(status_code=403, detail="User not verified. Please register and verify your email.")
    otp = generate_otp()
    users.update_one({"email": user.email}, {"$set": {"otp": otp}})
    send_email(user.email, "Your OTP for Login", f"Your OTP is: {otp}")
    return {"message": "OTP sent to email. Please verify to complete login."}

@app.post("/verify-registration-otp")
def verify_registration_otp(data: OTPVerify):
    users = app.mongodb["users"]
    db_user = users.find_one({"email": data.email})
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    if db_user.get("verified", False):
        return {"message": "User already verified"}
    if db_user.get("otp") == data.otp:
        users.update_one({"email": data.email}, {"$set": {"verified": True, "otp": None}})
        return {"message": "Registration verified successfully"}
    else:
        raise HTTPException(status_code=400, detail="Invalid OTP")

@app.post("/verify-login-otp")
def verify_login_otp(data: OTPVerify):
    users = app.mongodb["users"]
    db_user = users.find_one({"email": data.email})
    if not db_user or not db_user.get("verified", False):
        raise HTTPException(status_code=404, detail="User not found or not verified")
    if db_user.get("otp") == data.otp:
        users.update_one({"email": data.email}, {"$set": {"otp": None}})
        return {"message": "Login successful", "user": {"name": db_user["name"], "email": db_user["email"]}}
    else:
        raise HTTPException(status_code=400, detail="Invalid OTP")

@app.get("/")
async def root():
    try:
        server_info = app.mongodb_client.server_info()
        return {"message": "Hello World", "mongodb": "connected", "version": server_info.get("version", "unknown")}
    except Exception as e:
        return {"message": "Hello World", "mongodb": f"connection error: {str(e)}"}

from fastapi import Body

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
