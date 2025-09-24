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
        raise HTTPException(status_code=500, detail="Internal Server Error")