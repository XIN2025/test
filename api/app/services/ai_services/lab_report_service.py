from typing import List, Dict, Optional, Any
from pydantic import BaseModel
import logging
import base64
from datetime import datetime
from bson import ObjectId

from app.config import OPENAI_API_KEY, LLM_MODEL
from app.services.backend_services.db import get_db
from app.schemas.ai.lab_report import LabTestProperty, LabReportCreate, LabReportResponse, LabReportSummary
from app.services.ai_services.document_processor import get_document_processor
from langchain_openai import ChatOpenAI
from app.config import OPENAI_API_KEY, LLM_MODEL, LLM_TEMPERATURE

logger = logging.getLogger(__name__)

class LabTestPropertyForLLM(BaseModel):
    property_name: str
    value: str
    unit: Optional[str] = None
    reference_range: Optional[str] = None
    status: Optional[str] = None
    property_description: Optional[str] = None
    
    class Config:
        extra = "forbid"  # This sets additionalProperties to false

class LabReport(BaseModel): 
    test_description: str
    test_title: str
    properties: List[LabTestPropertyForLLM]
    test_date: Optional[str] = None  # Keep as string for parsing
    lab_name: Optional[str] = None
    doctor_name: Optional[str] = None
    
    class Config:
        extra = "forbid"  # This sets additionalProperties to false


class LabReportService:
    def __init__(self):
        if not OPENAI_API_KEY:
            raise ValueError("OpenAI API key not found in environment variables")
        
        self.llm = ChatOpenAI(
            model=LLM_MODEL,
            openai_api_key=OPENAI_API_KEY,
            temperature=1
        )
        self.model = LLM_MODEL
        self.document_processor = get_document_processor()
        self.db = get_db()
        self.collection = self.db["lab_reports"]

    async def _extract_lab_data_with_ai(self, base64_pdf: str) -> Dict[str, Any]:
        """Extract structured lab data from text using OpenAI"""
        
        import time
        start_time = time.time()
        
        prompt = """Extract lab test data from this PDF. Return structured JSON with:
- test_title: Title of the test (small, 3-5 words)
- test_description: Brief test purpose
- properties: Array of {property_name, value, unit, reference_range, status}
- test_date: YYYY-MM-DD format if available
- lab_name, doctor_name: If available

Extract ALL test results with precise values and units. Use original test names from the report."""

        try:
            logger.info("🚀 Starting AI extraction for lab report...")
            
            # Use structured output with optimized settings
            structured_llm = self.llm.with_structured_output(LabReport)
            
            # Create proper LangChain message format
            message = {
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": prompt,
                    },
                    {
                        "type": "file",
                        "source_type": "base64",
                        "data": base64_pdf,
                        "mime_type": "application/pdf",
                        "filename": "lab-report.pdf",
                    },
                ]
            }

            logger.info("🤖 Sending request to OpenAI...")
            response = await structured_llm.ainvoke([message])
            
            extraction_time = time.time() - start_time
            logger.info(f"✅ AI extraction completed in {extraction_time:.2f} seconds")
            
            # The response is already a LabReport object, convert to dict
            return response.dict()
        except Exception as e:
            extraction_time = time.time() - start_time
            logger.error(f"❌ AI extraction failed after {extraction_time:.2f} seconds: {str(e)}")
            raise ValueError(f"Failed to extract lab data: {str(e)}")

    async def process_lab_report_pdf(self, file_content: bytes, filename: str, user_email: str) -> LabReportResponse:
        """Process a lab report PDF and extract structured data"""
        try:
            # Convert PDF bytes to base64
            base64_pdf = base64.b64encode(file_content).decode('utf-8')
            
            # Extract structured data using AI
            extracted_data = await self._extract_lab_data_with_ai(base64_pdf)
            
            # Validate and structure the data  
            properties = []
            for prop_data in extracted_data.get("properties", []):
                # Convert LabTestPropertyForLLM to the schema LabTestProperty
                if isinstance(prop_data, dict):
                    # It's already a dictionary
                    prop_dict = prop_data
                else:
                    # It's a LabTestPropertyForLLM object, convert to dict
                    if hasattr(prop_data, 'dict'):
                        prop_dict = prop_data.dict()
                    else:
                        # Fallback: manually extract attributes
                        prop_dict = {
                            "property_name": getattr(prop_data, 'property_name', ''),
                            "value": getattr(prop_data, 'value', ''),
                            "unit": getattr(prop_data, 'unit', None),
                            "reference_range": getattr(prop_data, 'reference_range', None),
                            "status": getattr(prop_data, 'status', None),
                            "property_description": getattr(prop_data, 'property_description', None)
                        }
                
                # Create the schema LabTestProperty object
                property_obj = LabTestProperty(
                    property_name=prop_dict.get("property_name", ""),
                    value=prop_dict.get("value", ""),
                    unit=prop_dict.get("unit"),
                    reference_range=prop_dict.get("reference_range"),
                    status=prop_dict.get("status"),
                    property_description=prop_dict.get("property_description")
                )
                properties.append(property_obj)
            
            # Parse test date if provided
            test_date = None
            if extracted_data.get("test_date"):
                try:
                    # Try to parse the string date to datetime
                    test_date = datetime.strptime(extracted_data["test_date"], "%Y-%m-%d")
                except (ValueError, TypeError):
                    logger.warning(f"Could not parse test date: {extracted_data['test_date']}")
                    # Keep as None if parsing fails
            
            # Create lab report object
            lab_report_data = LabReportCreate(
                user_email=user_email,
                test_title=extracted_data.get("test_title", "Lab Report"),
                test_description=extracted_data.get("test_description", "Lab Report"),
                properties=properties,
                test_date=test_date,
                lab_name=extracted_data.get("lab_name"),
                doctor_name=extracted_data.get("doctor_name")
            )
            
            # Save to database (this is already async)
            saved_report = await self.save_lab_report(lab_report_data, filename)
            return saved_report
            
        except Exception as e:
            logger.error(f"Error processing lab report PDF: {str(e)}")
            raise

    async def process_lab_report_base64(self, base64_content: str, filename: str, user_email: str) -> LabReportResponse:
        """Process a lab report from base64 PDF content (optimized for direct base64 input)"""
        try:
            logger.info(f"Processing base64 lab report: {filename} for user: {user_email}")
            
            # Validate base64 content
            if not base64_content:
                raise ValueError("Base64 content cannot be empty")
            
            # Extract structured data using AI directly from base64
            extracted_data = await self._extract_lab_data_with_ai(base64_content)
            
            # Validate and structure the data  
            properties = []
            for prop_data in extracted_data.get("properties", []):
                # Convert LabTestPropertyForLLM to the schema LabTestProperty
                if isinstance(prop_data, dict):
                    prop_dict = prop_data
                else:
                    # It's a LabTestPropertyForLLM object, convert to dict
                    if hasattr(prop_data, 'dict'):
                        prop_dict = prop_data.dict()
                    else:
                        prop_dict = {
                            "property_name": getattr(prop_data, 'property_name', ''),
                            "value": getattr(prop_data, 'value', ''),
                            "unit": getattr(prop_data, 'unit', None),
                            "reference_range": getattr(prop_data, 'reference_range', None),
                            "status": getattr(prop_data, 'status', None)
                        }
                
                # Create the schema LabTestProperty object
                property_obj = LabTestProperty(
                    property_name=prop_dict.get("property_name", ""),
                    value=prop_dict.get("value", ""),
                    unit=prop_dict.get("unit"),
                    reference_range=prop_dict.get("reference_range"),
                    status=prop_dict.get("status")
                )
                properties.append(property_obj)
            
            # Parse test date if provided
            test_date = None
            if extracted_data.get("test_date"):
                try:
                    test_date = datetime.strptime(extracted_data["test_date"], "%Y-%m-%d")
                except (ValueError, TypeError):
                    logger.warning(f"Could not parse test date: {extracted_data['test_date']}")
            
            # Create lab report object
            lab_report_data = LabReportCreate(
                user_email=user_email,
                test_title=extracted_data.get("test_title", "Lab Report"),
                test_description=extracted_data.get("test_description", "Lab Report"),
                properties=properties,
                test_date=test_date,
                lab_name=extracted_data.get("lab_name"),
                doctor_name=extracted_data.get("doctor_name")
            )
            
            # Save to database
            saved_report = await self.save_lab_report(lab_report_data, filename)
            return saved_report
            
        except Exception as e:
            logger.error(f"Error processing base64 lab report: {str(e)}")
            raise

    async def save_lab_report(self, lab_report: LabReportCreate, filename: str) -> LabReportResponse:
        """Save lab report to database"""
        try:
            # Prepare document for MongoDB
            doc = {
                "user_email": lab_report.user_email,
                "test_title": lab_report.test_title,
                "test_description": lab_report.test_description,
                "properties": [prop.dict() for prop in lab_report.properties],
                "test_date": lab_report.test_date,
                "lab_name": lab_report.lab_name,
                "doctor_name": lab_report.doctor_name,
                "filename": filename,
                "created_at": datetime.utcnow()
            }
            
            # Insert into database
            result = await self.collection.insert_one(doc)
            
            # Return response with generated ID
            return LabReportResponse(
                id=str(result.inserted_id),
                user_email=lab_report.user_email,
                test_title=lab_report.test_title,
                test_description=lab_report.test_description,
                properties=lab_report.properties,
                test_date=lab_report.test_date,
                lab_name=lab_report.lab_name,
                doctor_name=lab_report.doctor_name,
                filename=filename,
                created_at=doc["created_at"]
            )
            
        except Exception as e:
            logger.error(f"Error saving lab report: {str(e)}")
            raise

    async def get_lab_reports_by_user(self, user_email: str) -> List[LabReportSummary]:
        """Get all lab reports for a user (summary view)"""
        try:
            cursor = self.collection.find(
                {"user_email": user_email},
                {
                    "test_title": 1,
                    "test_description": 1,
                    "test_date": 1,
                    "filename": 1,
                    "created_at": 1,
                    "properties": 1
                }
            ).sort("created_at", -1)
            
            reports = []
            async for doc in cursor:
                reports.append(LabReportSummary(
                    id=str(doc["_id"]),
                    test_title=doc.get("test_title", ""),
                    test_description=doc.get("test_description", ""),
                    test_date=doc.get("test_date"),
                    properties_count=len(doc.get("properties", [])),
                    filename=doc.get("filename", ""),
                    created_at=doc.get("created_at", datetime.utcnow())
                ))
            
            return reports
            
        except Exception as e:
            logger.error(f"Error fetching lab reports: {str(e)}")
            raise

    async def get_lab_report_by_id(self, report_id: str, user_email: str) -> Optional[LabReportResponse]:
        """Get detailed lab report by ID"""
        try:
            # Validate ObjectId format
            if not ObjectId.is_valid(report_id):
                return None
            
            doc = await self.collection.find_one({
                "_id": ObjectId(report_id),
                "user_email": user_email
            })
            
            if not doc:
                return None
            
            # Convert properties back to LabTestProperty objects
            properties = []
            for prop_data in doc.get("properties", []):
                properties.append(LabTestProperty(**prop_data))
            
            return LabReportResponse(
                id=str(doc["_id"]),
                user_email=doc.get("user_email", ""),
                test_title=doc.get("test_title", ""),
                test_description=doc.get("test_description", ""),
                properties=properties,
                test_date=doc.get("test_date"),
                lab_name=doc.get("lab_name"),
                doctor_name=doc.get("doctor_name"),
                filename=doc.get("filename", ""),
                created_at=doc.get("created_at", datetime.utcnow())
            )
            
        except Exception as e:
            logger.error(f"Error fetching lab report by ID: {str(e)}")
            raise

# Global instance
_lab_report_service = None

def get_lab_report_service() -> LabReportService:
    """Get or create a LabReportService instance"""
    global _lab_report_service
    if _lab_report_service is None:
        _lab_report_service = LabReportService()
    return _lab_report_service

