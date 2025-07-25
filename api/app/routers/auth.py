from fastapi import APIRouter, HTTPException
from ..schemas.user import UserRegister, UserLogin, OTPVerify
from ..services.db import get_db
from ..services.email_utils import send_email, generate_otp

auth_router = APIRouter()
db = get_db()

@auth_router.post("/register")
def register(user: UserRegister):
    users = db["users"]
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

@auth_router.post("/login")
def login(user: UserLogin):
    users = db["users"]
    db_user = users.find_one({"email": user.email})
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    if not db_user.get("verified", False):
        raise HTTPException(status_code=403, detail="User not verified. Please register and verify your email.")
    otp = generate_otp()
    users.update_one({"email": user.email}, {"$set": {"otp": otp}})
    send_email(user.email, "Your OTP for Login", f"Your OTP is: {otp}")
    return {"message": "OTP sent to email. Please verify to complete login."}

@auth_router.post("/verify-registration-otp")
def verify_registration_otp(data: OTPVerify):
    users = db["users"]
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

@auth_router.post("/verify-login-otp")
def verify_login_otp(data: OTPVerify):
    users = db["users"]
    db_user = users.find_one({"email": data.email})
    if not db_user or not db_user.get("verified", False):
        raise HTTPException(status_code=404, detail="User not found or not verified")
    if db_user.get("otp") == data.otp:
        users.update_one({"email": data.email}, {"$set": {"otp": None}})
        return {"message": "Login successful", "user": {"name": db_user["name"], "email": db_user["email"]}}
    else:
        raise HTTPException(status_code=400, detail="Invalid OTP") 