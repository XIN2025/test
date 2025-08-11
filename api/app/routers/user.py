from datetime import datetime
from fastapi import APIRouter, HTTPException, Query
from ..schemas.user import UserPreferences
from ..schemas.profile import UserProfileUpdate
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

@user_router.get("/api/user/profile")
def get_user_profile(email: EmailStr = Query(...)):
    """Get user profile information."""
    profile = db["users"].find_one({"email": email}, {"_id": 0})
    if not profile:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Ensure all required fields exist in the response
    defaults = {
        "name": "",
        "phone_number": "",
        "date_of_birth": "",
        "blood_type": "",
        "notifications_enabled": True
    }
    profile = {**defaults, **profile}  # Merge defaults with actual data
    
    return {
        "email": profile["email"],
        "name": profile["name"],
        "phone_number": profile["phone_number"],
        "date_of_birth": profile["date_of_birth"],
        "blood_type": profile["blood_type"],
        "notifications_enabled": profile["notifications_enabled"]
    }

@user_router.post("/api/user/profile/update")
def update_user_profile(profile: UserProfileUpdate):
    """Update user profile information."""
    users = db["users"]
    
    # First check if user exists
    existing_user = users.find_one({"email": profile.email})
    if not existing_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    try:
        # Start with only tracking the update time
        update_data = {
            "updated_at": datetime.utcnow()  # Track when profile was last updated
        }

        # Only include fields that were sent in the request
        if hasattr(profile, 'full_name'):
            update_data["name"] = profile.full_name
            
        # Only update these fields if they were explicitly provided (not None)
        for field, db_field in [
            ('phone_number', 'phone_number'),
            ('date_of_birth', 'date_of_birth'),
            ('blood_type', 'blood_type'),
            ('notifications_enabled', 'notifications_enabled')
        ]:
            if hasattr(profile, field) and getattr(profile, field) is not None:
                value = getattr(profile, field)
                # Special handling for blood type
                if field == 'blood_type' and value:
                    value = value.upper()
                update_data[db_field] = value
        
        # Update user profile with only the provided fields
        result = users.update_one(
            {"email": profile.email},
            {"$set": update_data}
        )
        
        if result.modified_count == 0:
            # This should rarely happen since we checked existence above
            raise HTTPException(status_code=500, detail="Failed to update profile")
        
        # Return the updated profile
        return {
            "message": "Profile updated successfully",
            "profile": get_user_profile(email=profile.email)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) 