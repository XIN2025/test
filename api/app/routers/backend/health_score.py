from app.services.backend_services.health_score_service import get_health_score_service

from fastapi import APIRouter, HTTPException

from app.schemas.utils import HttpResponse

health_score_router = APIRouter()
health_score_service = get_health_score_service()

@health_score_router.get('/{user_email}', response_model=HttpResponse)
async def get_health_score(user_email: str):
    try:
        score = await health_score_service.get_health_score(user_email)
        return HttpResponse(success=True, data={"health_score": score}, message="Health score fetched successfully")
    except Exception as e:
        # TODO: If user is not found and I keep it as Internal Server Error, the message doesn't get passed to the client
        # And if I do then there is a security concern, look into thi
        raise HTTPException(status_code=500, detail=str(e))