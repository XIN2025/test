import httpx
from typing import Dict , Optional , Any
import firebase_admin
from firebase_admin import credentials, messaging
from firebase_admin.messaging import Message
import asyncio
import json
import os
from typing import Optional, Dict, Any
from app.exceptions import NotificationError

import httpx

email = "r.rahul.developer@gmail.com"

async def send_fcm_notification(
) -> Dict[str, Any]:

	fcm_token = "dfV67mClTQm6GVOLpKKWW1:APA91bGI-Iu06sosMY021CDMNHf2irZdbkW8xq--6mXdPiL1txGDietSpNhqUpwlPT9Jbhysa9pP8GswWZiFPAllOyuq71PuAl_FhrY4pYZzpqVMSucArck"
	cred = credentials.Certificate("./evra-fcm-firebase-adminsdk-fbsvc-837cdb7566.json")
	firebase_admin.initialize_app(cred)


	message = messaging.Message(
            token=fcm_token,
            notification=messaging.Notification(
                title="Nudge",
                body="Nudge",
            ),
            data={},
            android=messaging.AndroidConfig(
                priority="high",
                notification=messaging.AndroidNotification(
                    channel_id="default",
                    sound="default",
                    color="#16A34A",
                    icon="@drawable/notification_icon",
                ),
            ),
            apns=messaging.APNSConfig(
                payload=messaging.APNSPayload(
                    aps=messaging.Aps(sound="default")
                )
            ),
        )

	try:
		message_id = messaging.send(message)
		return {"success": True, "message_id": message_id}
	except Exception as e:
		raise NotificationError(
			f"Failed to send FCM notification: {str(e)}",
			details={"email": email},
		)


async def _main_async() -> None:
	await send_fcm_notification()


def main() -> None:
	asyncio.run(_main_async())


if __name__ == "__main__":
	main()