from pydantic import BaseModel, EmailStr

class FCMTokenRequest(BaseModel):
    email: EmailStr
    fcm_token: str

class FCMTokenResponse(BaseModel):
    success: bool
    message: str
