from fastapi import APIRouter, HTTPException, Body
from ...services.backend_services.nudge_service import NudgeService
from ...schemas.backend.nudge import FCMTokenRequest, FCMTokenResponse

nudge_router = APIRouter()
nudge_service = NudgeService()

@nudge_router.post("/nudge/register-fcm-token", response_model=FCMTokenResponse)
async def register_fcm_token(token_data: FCMTokenRequest = Body(...)):
    """
    Register or update a user's FCM token for push notifications.
    """
    result = await nudge_service.save_fcm_token(token_data.email, token_data.fcm_token)
    if result:
        return FCMTokenResponse(success=True, message="FCM token registered successfully.")
    else:
        return FCMTokenResponse(success=False, message="Failed to register FCM token.")