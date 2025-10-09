# TODO:
# - Do a proper error handling for each of the functions

from datetime import datetime, timezone
from typing import List, Optional
from app.services.backend_services.db import get_db
from app.schemas.backend.health_alert import (
    HealthAlertCreate,
    HealthAlertGenerate,
    HealthData,
    HealthMetricHourlyData,
    AggregatedHealthSummary,
    HealthDataCreate,
    StepSummary,
    HeartRateSummary,
    ActiveEnergySummary,
    SleepSummary,
    WeightSummary,
    BodyFatSummary,
    BloodGlucoseSummary,
    OxygenSaturationSummary,
    HealthMetricData,
    HealthAlert,
    HealthAlertGenerationResponse,
    HealthAlertSeverity,
    AlertStatus,
    HealthDataScoreGenerate,
    HealthDataScore,
)
from bson import ObjectId
from app.utils.ai.prompts import get_prompts
from app.services.backend_services.nudge_service import get_nudge_service
from langchain_core.messages import SystemMessage, HumanMessage
from langchain_openai import ChatOpenAI
from app.config import OPENAI_API_KEY, LLM_MODEL, LLM_TEMPERATURE
from app.services.backend_services.encryption_service import get_encryption_service


class HealthAlertService:
    def __init__(self):
        self.db = get_db()
        self.health_data_collection = self.db["health_data"]
        self.health_alert_collection = self.db["health_alerts"]
        self.nudge_service = get_nudge_service()
        self.prompts = get_prompts()
        self.encryption_service = get_encryption_service()
        # TODO: Create a central instance to use ChatOpenAI service
        MAX_RETRIES = 5
        self.llm = ChatOpenAI(
            api_key=OPENAI_API_KEY,
            model=LLM_MODEL,
            temperature=LLM_TEMPERATURE,
            max_retries=MAX_RETRIES,
        )

    def _calculate_aggregated_summary(
        self, hourly_data: List[HealthMetricHourlyData]
    ) -> AggregatedHealthSummary:
        total_steps = sum(item.data.steps.value for item in hourly_data)
        heart_rates = [item.data.heartRate.value for item in hourly_data]
        active_energy = sum(item.data.activeEnergy.value for item in hourly_data)
        total_sleep = sum(item.data.sleep.value for item in hourly_data)
        weights = [item.data.weight.value for item in hourly_data]
        body_fats = [item.data.bodyFat.value for item in hourly_data]
        blood_glucose_values = [item.data.bloodGlucose.value for item in hourly_data]
        oxygen_saturation_values = [
            item.data.oxygenSaturation.value for item in hourly_data
        ]

        step_summary = StepSummary(total=total_steps)
        heart_rate_summary = HeartRateSummary(
            average=sum(heart_rates) / len(heart_rates) if heart_rates else 0,
            max=max(heart_rates) if heart_rates else 0,
            min=min(heart_rates) if heart_rates else 0,
        )
        active_energy_summary = ActiveEnergySummary(total=active_energy)
        sleep_summary = SleepSummary(totalHours=total_sleep)
        weight_summary = WeightSummary(
            value=sum(weights) / len(weights) if weights else 0,
            unit=hourly_data[0].data.weight.unit if hourly_data else "kg",
        )
        body_fat_summary = BodyFatSummary(
            value=sum(body_fats) / len(body_fats) if body_fats else 0,
            unit=hourly_data[0].data.bodyFat.unit if hourly_data else "%",
        )
        blood_glucose_summary = BloodGlucoseSummary(
            average=(
                sum(blood_glucose_values) / len(blood_glucose_values)
                if blood_glucose_values
                else 0
            ),
            max=max(blood_glucose_values) if blood_glucose_values else 0,
            min=min(blood_glucose_values) if blood_glucose_values else 0,
        )
        oxygen_saturation_summary = OxygenSaturationSummary(
            average=(
                sum(oxygen_saturation_values) / len(oxygen_saturation_values)
                if oxygen_saturation_values
                else 0
            ),
            max=max(oxygen_saturation_values) if oxygen_saturation_values else 0,
            min=min(oxygen_saturation_values) if oxygen_saturation_values else 0,
        )

        aggregated_summary_dict = {
            "date": datetime.now(timezone.utc),
            "step": step_summary,
            "heartRate": heart_rate_summary,
            "activeEnergy": active_energy_summary,
            "sleep": sleep_summary,
            "weight": weight_summary,
            "bodyFat": body_fat_summary,
            "bloodGlucose": blood_glucose_summary,
            "oxygenSaturation": oxygen_saturation_summary,
        }

        return AggregatedHealthSummary(**aggregated_summary_dict)

    def _generate_aggregated_summary_with_single_health_metric_data(
        self, data: HealthMetricData
    ) -> AggregatedHealthSummary:
        aggregated_summary_dict = {
            "date": datetime.now(timezone.utc),
            "step": {"total": data.steps.value},
            "heartRate": {
                "average": data.heartRate.value,
                "max": data.heartRate.value,
                "min": data.heartRate.value,
            },
            "activeEnergy": {"total": data.activeEnergy.value},
            "sleep": {"totalHours": data.sleep.value},
            "weight": {"value": data.weight.value, "unit": data.weight.unit},
            "bodyFat": {"value": data.bodyFat.value, "unit": data.bodyFat.unit},
            "bloodGlucose": {
                "average": data.bloodGlucose.value,
                "max": data.bloodGlucose.value,
                "min": data.bloodGlucose.value,
            },
            "oxygenSaturation": {
                "average": data.oxygenSaturation.value,
                "max": data.oxygenSaturation.value,
                "min": data.oxygenSaturation.value,
            },
        }
        return AggregatedHealthSummary(**aggregated_summary_dict)

    async def get_latest_health_data_by_user_email(self, user_email: str) -> Optional[HealthData]:
        now_utc = datetime.now(timezone.utc)
        start_of_day = now_utc.replace(hour=0, minute=0, second=0, microsecond=0)
        end_of_day = now_utc.replace(hour=23, minute=59, second=59, microsecond=999999)
        health_data_dict = await self.health_data_collection.find_one(
            {
                "user_email": user_email,
                "created_at": {"$gte": start_of_day, "$lte": end_of_day},
            }
        )
        if not health_data_dict:
            return None
        health_data = HealthData(
            id=str(health_data_dict["_id"]),
            created_at=health_data_dict["created_at"],
            user_email=health_data_dict["user_email"],
            hourly_data=[
                HealthMetricHourlyData(**item)
                for item in health_data_dict.get("hourly_data", [])
            ],
            aggregated_summary=AggregatedHealthSummary(
                **health_data_dict.get("aggregated_summary", {})
            ),
        )
        health_data = self.encryption_service.decrypt_document(health_data, HealthData)
        return health_data

    # TODO: Use get_latest_health_data_by_user_email instead of manually querying the DB
    # TODO: Update updated_at field in the health data document
    async def store_hourly_health_data(
        self, user_email: str, data: HealthMetricData
    ) -> HealthMetricHourlyData:
        now_utc = datetime.now(timezone.utc)
        start_of_day = now_utc.replace(hour=0, minute=0, second=0, microsecond=0)
        end_of_day = now_utc.replace(hour=23, minute=59, second=59, microsecond=999999)
        health_data_dict = await self.health_data_collection.find_one(
            {
                "user_email": user_email,
                "created_at": {"$gte": start_of_day, "$lte": end_of_day},
            }
        )
        if not health_data_dict:
            aggregated_summary = (
                self._generate_aggregated_summary_with_single_health_metric_data(data)
            )
            health_metric_hourly_data = HealthMetricHourlyData(
                data=data, created_at=datetime.now(timezone.utc)
            )
            health_data_dict = {
                "user_email": user_email,
                "created_at": datetime.now(timezone.utc),
                "hourly_data": [health_metric_hourly_data.model_dump()],
                "aggregated_summary": aggregated_summary.model_dump(),
            }
            health_data_create = HealthDataCreate(**health_data_dict)
            insertion = await self.health_data_collection.insert_one(
                health_data_create.model_dump()
            )
            health_data = HealthData(
                id=str(insertion.inserted_id),
                created_at=health_data_create.created_at,
                user_email=health_data_create.user_email,
                hourly_data=health_data_create.hourly_data,
                aggregated_summary=health_data_create.aggregated_summary,
            )
            health_data = self.encryption_service.encrypt_document(health_data, HealthData)
        else:
            health_data_dict["id"] = str(health_data_dict["_id"])
            del health_data_dict["_id"]

            prev_health_metric_hourly_data_list = [
                HealthMetricHourlyData(**health_metric_hourly_data_dict)
                for health_metric_hourly_data_dict in health_data_dict["hourly_data"]
            ]

            health_metric_hourly_data = HealthMetricHourlyData(
                data=data, created_at=datetime.now(timezone.utc)
            )

            health_metric_hourly_data_list = prev_health_metric_hourly_data_list + [
                health_metric_hourly_data
            ]

            aggregated_summary = self._calculate_aggregated_summary(
                health_metric_hourly_data_list
            )

            health_data = HealthData(
                id=health_data_dict["id"],
                created_at=health_data_dict["created_at"],
                user_email=health_data_dict["user_email"],
                hourly_data=health_metric_hourly_data_list,
                aggregated_summary=aggregated_summary,
            )
            health_data = self.encryption_service.encrypt_document(health_data, HealthData)

            await self.health_data_collection.update_one(
                {"user_email": user_email},
                {
                    "$push": {"hourly_data": health_metric_hourly_data.model_dump()},
                    "$set": {"aggregated_summary": aggregated_summary.model_dump()},
                },
            )

        health_alerts = await self._generate_health_alerts(health_data)
        for alert_generate in health_alerts:
            alert = HealthAlertCreate(
                **alert_generate.model_dump(),
                user_email=user_email,
                health_data_id=health_data.id,
                status=AlertStatus.ACTIVE,
                created_at=datetime.now(timezone.utc),
            )
            alert = self.encryption_service.encrypt_document(alert, HealthAlertCreate)
            await self.health_alert_collection.insert_one(alert.model_dump())

            if alert.severity == HealthAlertSeverity.HIGH:
                await self.nudge_service.send_fcm_notification(
                    email=user_email,
                    title=alert.title,
                    body=alert.message,
                )

        return health_metric_hourly_data

    async def _get_previous_health_alerts(
        self, health_data_id: str
    ) -> List[HealthAlert]:
        previous_alerts = await self.health_alert_collection.find(
            {"health_data_id": ObjectId(health_data_id), "status": AlertStatus.ACTIVE.value}
        ).to_list(length=None)
        for alert in previous_alerts:
            alert["id"] = str(alert["_id"])
            del alert["_id"]
        previous_alerts = [HealthAlert(**alert) for alert in previous_alerts]
        previous_alerts = [
            self.encryption_service.decrypt_document(alert, HealthAlert)
            for alert in previous_alerts
        ]
        return previous_alerts

    async def _generate_health_alerts(
        self, health_data: HealthData
    ) -> List[HealthAlertGenerate]:
        # TODO: Handle duplicate alerts based on previous active health alerts
        health_data_id = health_data.id
        previous_health_alerts = await self._get_previous_health_alerts(health_data_id)
        prompt = self.prompts.get_health_alerts_prompt(
            health_data=health_data.model_dump(),
            previous_health_alerts=[
                alert.model_dump() for alert in previous_health_alerts
            ],
        )
        # TODO: You can shift this to prompt.py file instead
        system_prompt = "You are a health monitoring AI that generates structured health alerts based on health metrics."
        messages = [SystemMessage(content=system_prompt), HumanMessage(content=prompt)]
        structured_llm = self.llm.with_structured_output(HealthAlertGenerationResponse)
        response = await structured_llm.ainvoke(messages)
        if not response.should_generate_alert:
            return []
        return response.alerts

    async def get_active_health_alerts(self, user_email: str) -> List[HealthAlert]:
        active_alerts = await self.health_alert_collection.find(
            {"user_email": user_email, "status": AlertStatus.ACTIVE.value}
        ).to_list(length=None)
        for alert in active_alerts:
            alert["id"] = str(alert["_id"])
            del alert["_id"]
        alerts = [HealthAlert(**alert) for alert in active_alerts]
        alerts = [
            self.encryption_service.decrypt_document(alert, HealthAlert)
            for alert in alerts
        ]
        return alerts
    
    async def score_health_data(self, health_data: HealthData) -> HealthDataScore:
        prompt = self.prompts.get_health_data_score_prompt(health_data)
        structured_llm = self.llm.with_structured_output(HealthDataScoreGenerate)
        response = await structured_llm.ainvoke([{"role": "user", "content": prompt}])
        health_data_score = HealthDataScore(
            health_data_id=health_data.id,
            score=response.score,
            reasons=response.reasons
        )
        return health_data_score

    async def mark_health_alert_resolve(self, health_alert_id: str) -> bool:
        result = await self.health_alert_collection.update_one(
            {"_id": ObjectId(health_alert_id)},
            {"$set": {"status": AlertStatus.RESOLVED.value}},
        )
        return result.modified_count > 0


def get_health_alert_service():
    return HealthAlertService()
