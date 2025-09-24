from app.services.ai_services.goals_service import get_goals_service
from app.services.backend_services.health_alert_service import get_health_alert_service
from app.services.ai_services.lab_report_service import get_lab_report_service
from app.schemas.ai.lab_report import LabReport, LabReportScore, LabReportScoreType
from app.services.backend_services.db import get_db
from app.schemas.backend.health_score import HealthScore
from typing import Optional


class HealthScoreService:
    def __init__(self):
        self.goals_service = get_goals_service()
        self.health_alert_service = get_health_alert_service()
        self.lab_report_service = get_lab_report_service()
        self.db = get_db()
        self.user_collection = self.db["users"]

        self.WEIGHTED_LABS = ["cardiac markers", "cholesterol", "HbA1c"]

    async def calculate_health_score(self, user_email: str) -> HealthScore:
        streak_score = await self.goals_service.get_streak_score(user_email)
        lab_report_responses = await self.lab_report_service.get_lab_reports_by_user(
            user_email
        )
        lab_reports = []
        for report in lab_report_responses:
            print("hi")
            lab_report_response = await self.lab_report_service.get_lab_report_by_id(
                report.id, user_email
            )
            lab_report = LabReport(
                test_title=lab_report_response.test_title,
                test_description=lab_report_response.test_description,
                # TODO: Clearly as some schema issue that needs to be solved in lab report service
                properties=[
                    prop.model_dump() for prop in lab_report_response.properties
                ],
                test_date=(
                    lab_report_response.test_date.isoformat()
                    if lab_report_response.test_date
                    else None
                ),
                lab_name=lab_report_response.lab_name,
                doctor_name=lab_report_response.doctor_name,
            )
            print(lab_report)
            lab_reports.append(lab_report)

        lab_overall_score = 40
        for report in lab_reports:
            lab_score = self.lab_report_service.score_lab_report(report)
            if lab_score == LabReportScoreType.NOT_GOOD:
                if report.test_title.lower() in self.WEIGHTED_LABS:
                    lab_overall_score -= 10
                else:
                    lab_overall_score -= 5

        lab_overall_score = max(lab_overall_score, 0)
        health_data = (
            await self.health_alert_service.get_latest_health_data_by_user_email(
                user_email
            )
        )
        health_data_score = self.health_alert_service.score_health_data(health_data) if health_data else None
        weighted_data_score = (health_data_score.score / 100) * 25 if health_data_score else 0
        weighted_streak_score = (streak_score.score / 25) * 25
        weighted_lab_score = (lab_overall_score / 40) * 50
        total_health_score = (
            weighted_data_score + weighted_streak_score + weighted_lab_score
        )

        return HealthScore(
            score=round(total_health_score, 2),
            health_data_score=health_data_score,
            streak_score=streak_score,
            lab_report_score=lab_reports
        )

    async def _background_recalculate_health_score(self, user_email: str):
        health_score = await self.calculate_health_score(user_email)
        await self.user_collection.update_one(
            {"email": user_email}, {"$set": {"health_score": health_score.model_dump()}}
        )

    async def get_health_score(self, user_email: str) -> Optional[HealthScore]:
        user = await self.user_collection.find_one({"email": user_email})
        health_score = user.get("health_score")
        if not health_score:
            health_score = await self.calculate_health_score(user_email)
            print(health_score)
            if not health_score:
                raise ValueError("Could not calculate health score for user.")
            await self.user_collection.update_one(
                {"email": user_email}, {"$set": {"health_score": health_score.model_dump()}}
            )
            return health_score
        else:
            health_score = HealthScore(**health_score)
            self._background_recalculate_health_score(user_email)
            return health_score

def get_health_score_service():
    return HealthScoreService()
