from fastapi import APIRouter, HTTPException, UploadFile, File, Query
from pydantic import EmailStr
from typing import List
import logging

from app.services.ai_services.lab_report_service import get_lab_report_service
from app.schemas.ai.lab_report import LabReportResponse, LabReportSummary, LabReportUploadResponse

logger = logging.getLogger(__name__)

lab_report_router = APIRouter(prefix="/lab-reports", tags=["lab-reports"])

@lab_report_router.post("/upload", response_model=LabReportUploadResponse)
async def upload_lab_report(
    file: UploadFile = File(...),
    user_email: EmailStr = Query(..., description="User email for lab report ownership")
):
    """
    Upload a PDF lab report and extract structured data using AI
    
    - **file**: PDF file containing the lab report
    - **user_email**: Email of the user who owns this lab report
    
    Returns the extracted lab report data with structured test results
    """
    try:
        # Validate file type
        if not file.filename:
            logger.error("No file provided")
            raise HTTPException(status_code=400, detail="No file provided")
        
        if not file.filename.lower().endswith('.pdf'):
            logger.error("Only PDF files are supported for lab reports")
            raise HTTPException(
                status_code=400, 
                detail="Only PDF files are supported for lab reports"
            )
        
        # Read file content
        content = file.size
        logger.info(f"File size: {content} bytes")
        if content == 0:
            logger.error("Uploaded file is empty")
            raise HTTPException(status_code=400, detail="Uploaded file is empty")
        
        # Check file size (10MB limit)
        max_size = 10 * 1024 * 1024  # 10MB in bytes
        if content > max_size:
            logger.error(f"File too large: {content} bytes")
            raise HTTPException(
                status_code=400, 
                detail=f"File too large. Maximum size allowed is {max_size // (1024*1024)}MB"
            )
        
        logger.info(f"Processing lab report PDF: {file.filename} for user: {user_email}")
        
        # Process the lab report
        lab_report_service = get_lab_report_service()
        file_content = await file.read()
        lab_report = await lab_report_service.process_lab_report_pdf(
            file_content, file.filename, user_email
        )
        
        return LabReportUploadResponse(
            success=True,
            lab_report_id=lab_report.id,
            message="Lab report processed successfully",
            test_title=lab_report.test_title,
            test_description=lab_report.test_description,
            properties_count=len(lab_report.properties)
        )
        
    except HTTPException:
        logger.error(f"Failed to process lab report: {str(e)}")
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to process lab report: {str(e)}"
        )
    except Exception as e:
        logger.error(f"Error processing lab report upload: {str(e)}")
        raise HTTPException(
            status_code=500, 
            detail=f"Failed to process lab report: {str(e)}"
        )

@lab_report_router.get("/", response_model=List[LabReportSummary])
async def get_lab_reports(
    user_email: EmailStr = Query(..., description="User email to fetch lab reports for")
):
    """
    Get all lab reports for a user (summary view)
    
    - **user_email**: Email of the user whose lab reports to fetch
    
    Returns a list of lab report summaries with basic information
    """
    try:
        lab_report_service = get_lab_report_service()
        reports = await lab_report_service.get_lab_reports_by_user(user_email)
        
        return reports
        
    except Exception as e:
        logger.error(f"Error fetching lab reports for user {user_email}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch lab reports: {str(e)}"
        )

@lab_report_router.get("/{report_id}", response_model=LabReportResponse)
async def get_lab_report_by_id(
    report_id: str,
    user_email: EmailStr = Query(..., description="User email for authorization")
):
    """
    Get detailed lab report by ID
    
    - **report_id**: Unique identifier of the lab report
    - **user_email**: Email of the user (for authorization)
    
    Returns detailed lab report with all test properties and values
    """
    try:
        lab_report_service = get_lab_report_service()
        report = await lab_report_service.get_lab_report_by_id(report_id, user_email)
        
        if not report:
            raise HTTPException(
                status_code=404,
                detail="Lab report not found or you don't have permission to access it"
            )
        
        return report
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching lab report {report_id}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch lab report: {str(e)}"
        )
