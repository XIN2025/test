from datetime import date
from pydantic import BaseModel, EmailStr, Field, validator
import re

from typing import Optional

class UserProfileUpdate(BaseModel):
    email: EmailStr
    full_name: Optional[str] = Field(default=None, max_length=100)
    phone_number: Optional[str] = Field(default=None)
    date_of_birth: Optional[str] = Field(default=None)  # Format: YYYY-MM-DD
    blood_type: Optional[str] = Field(default=None)
    notifications_enabled: Optional[bool] = Field(default=None)

    @validator('date_of_birth')
    def validate_date_of_birth(cls, v):
        if v is None or v == "":
            return None
        try:
            year, month, day = map(int, v.split('-'))
            birth_date = date(year, month, day)
            today = date.today()
            if birth_date > today:
                raise ValueError("Date of birth cannot be in the future")
            if today.year - birth_date.year > 120:
                raise ValueError("Date of birth seems too old")
            return v
        except ValueError as e:
            raise ValueError("Invalid date format. Use YYYY-MM-DD")

    @validator('phone_number')
    def validate_phone(cls, v):
        if v is None or v == "":
            return None
        pattern = re.compile(r'^\+?1?\d{10,14}$')
        if not pattern.match(v):
            raise ValueError("Invalid phone number format")
        return v

    @validator('blood_type')
    def validate_blood_type(cls, v):
        if v is None or v == "":
            return None
        pattern = re.compile(r'^(A|B|AB|O)[+-]$')
        if not pattern.match(v):
            raise ValueError("Invalid blood type format")
        return v.upper()

    @validator('full_name')
    def validate_name(cls, v):
        if v is None or v == "":
            return None
        v = v.strip()
        if not v:
            return None
        if not all(c.isalpha() or c.isspace() or c in "-'" for c in v):
            raise ValueError("Name can only contain letters, spaces, hyphens, and apostrophes")
        return v
