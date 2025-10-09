from pydantic import BaseModel, EmailStr, Field
from typing import Dict, List, Optional, Any
from datetime import datetime
from bson import ObjectId
from enum import Enum
from app.schemas.backend.encrypt import EncryptedField

class LabTestProperty(BaseModel):
    """Individual lab test property with value and unit"""
    property_name: str = Field(..., description="Name of the lab test property (e.g., 'glucose', 'vitamin_d')")
    value: str = Field(..., description="Value of the test result")
    unit: Optional[str] = Field(None, description="Unit of measurement (e.g., 'mmol/L', 'mg/dL')")
    reference_range: Optional[str] = Field(None, description="Normal reference range if available")
    status: Optional[str] = Field(None, description="Status like 'normal', 'high', 'low'")
    property_description: Optional[str] = Field(None, description="Description of the test property")

class LabReportCreate(BaseModel):
    """Schema for creating a new lab report"""
    user_email: EmailStr
    test_title: str = Field(..., description="Title of the test (small, 3-5 words)")
    test_description: str = Field(..., description="Description of what this lab test is for")
    properties: List[LabTestProperty] = Field(..., description="List of test properties and values")
    test_date: Optional[datetime] = Field(None, description="Date when the test was conducted")
    lab_name: Optional[str] = Field(None, description="Name of the laboratory")
    doctor_name: Optional[str] = Field(None, description="Name of the ordering physician")

class LabReportResponse(BaseModel):
    """Schema for lab report response"""
    id: str = Field(..., description="Unique identifier for the lab report")
    user_email: EmailStr
    test_title: str
    test_description: str
    properties: List[LabTestProperty] = Field(..., description="List of test properties and values")
    test_date: Optional[datetime] = None
    lab_name: Optional[str] = None
    doctor_name: Optional[str] = None
    filename: str = Field(..., description="Original PDF filename")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    class Config:
        arbitrary_types_allowed = True
        json_encoders = {
            ObjectId: str,
            datetime: lambda v: v.isoformat() if v else None
        }

class LabReportSummary(BaseModel):
    """Schema for lab report summary (list view)"""
    id: str
    test_title: str
    test_description: str
    test_date: Optional[datetime] = None
    properties_count: int = Field(..., description="Number of test properties")
    filename: str
    created_at: datetime
    
    class Config:
        arbitrary_types_allowed = True
        json_encoders = {
            ObjectId: str,
            datetime: lambda v: v.isoformat() if v else None
        }

class LabReportUploadResponse(BaseModel):
    """Response schema for successful lab report upload"""
    success: bool
    lab_report_id: str
    message: str
    test_title: str
    test_description: str
    properties_count: int

class LabReportScoreType(str, Enum):
    GOOD = "Good"
    NOT_GOOD = "Not Good"

class LabReportScoreGenerate(BaseModel):
    score: LabReportScoreType = Field(..., description="The overall health score assigned to the lab report (e.g., 'good' or 'bad')")
    reasons: List[str] = Field(..., description="List of reasons impacting the score")
  
class LabReportScore(LabReportScoreGenerate):
    lab_report_id: str

class LabTestPropertyForLLM(BaseModel):
    property_name: str = EncryptedField(...)
    value: str = EncryptedField(...)
    unit: Optional[str] = EncryptedField(None)
    reference_range: Optional[str] = EncryptedField(None)
    status: Optional[str] = EncryptedField(None)
    property_description: Optional[str] = EncryptedField(None)
    
    class Config:
        extra = "forbid"  # This sets additionalProperties to false

class LabReport(BaseModel): 
    test_description: str = EncryptedField(...)
    test_title: str = EncryptedField(...)
    properties: List[LabTestPropertyForLLM]
    test_date: Optional[str] = EncryptedField(None)
    lab_name: Optional[str] = EncryptedField(None)
    doctor_name: Optional[str] = EncryptedField(None)

    class Config:
        extra = "forbid"  # This sets additionalProperties to false
