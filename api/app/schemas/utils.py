from pydantic import BaseModel

class HttpResponse(BaseModel):
    success: bool
    message: str
    data: dict | None = None