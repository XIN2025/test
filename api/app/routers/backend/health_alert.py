from fastapi import APIRouter, HTTPException

from app.services.backend_services.health_alert_service import (
    get_health_alert_service,
)
from app.schemas.utils import HttpResponse
from app.schemas.backend.health_alert import HealthMetricData

health_alert_router = APIRouter()
health_alert_service = get_health_alert_service()


@health_alert_router.post(
    "/{user_email}/hourly-data", response_model=HttpResponse
)
async def upload_hourly_health_data(user_email: str, data: HealthMetricData):
    try:
        health_data = await health_alert_service.store_hourly_health_data(user_email, data)
        return HttpResponse(success=True, message="Health data uploaded successfully", data={"health_data": health_data.model_dump()})
    except Exception as e:
        return HttpResponse(success=False, message=str(e), data=None)


@health_alert_router.get(
    "/{user_email}/active", response_model=HttpResponse
)
async def get_active_health_alerts(user_email: str):
    try:
        alerts = await health_alert_service.get_active_health_alerts(user_email)
        return HttpResponse(
            success=True,
            message="Active alerts fetched successfully",
            data={"alerts": [alert.model_dump() for alert in alerts]},
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching active alerts")
