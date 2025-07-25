from fastapi import APIRouter, HTTPException, Query
from ..schemas.user import UserPreferences
from ..services.db import get_db
from pydantic import EmailStr

user_router = APIRouter()
db = get_db()

@user_router.get("/api/user/preferences")
def get_user_preferences(email: EmailStr = Query(...)):
    prefs = db["preferences"].find_one({"email": email})
    return {"exists": bool(prefs)}

@user_router.post("/api/user/preferences")
def save_user_preferences(prefs: UserPreferences):
    preferences = db["preferences"]
    preferences.update_one(
        {"email": prefs.email},
        {"$set": prefs.dict()},
        upsert=True
    )
    return {"message": "Preferences saved"} 