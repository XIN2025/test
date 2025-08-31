from starlette.concurrency import run_in_threadpool
from ..services.db import get_db

class NudgeService:
    def __init__(self):
        self.db = get_db()
        self.collection = self.db["fcm_tokens"]

    async def save_fcm_token(self, email: str, fcm_token: str) -> bool:
        """
        Save or update the FCM token for a user identified by email.
        """
        try:
            # Since PyMongo is synchronous, but FastAPI expects async, run in threadpool if needed.
            # Here, we assume the router will call this via await, so we keep the signature async.
            # But the actual call is synchronous.
result = await run_in_threadpool(
    self.collection.update_one,
    {"email": email},
    {"$set": {"fcm_token": fcm_token}},
    upsert=True,
)
except Exception:
    # TODO: add structured logging here
    raise

