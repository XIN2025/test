from pydantic import BaseModel, EmailStr
from typing import List

class UserRegister(BaseModel):
    name: str
    email: EmailStr

class UserLogin(BaseModel):
    email: EmailStr

class OTPVerify(BaseModel):
    email: EmailStr
    otp: str

class UserPreferences(BaseModel):
    email: EmailStr
    age: int
    gender: str
    healthGoals: List[str]
    conditions: List[str]
    communicationStyle: str
    notifications: bool 