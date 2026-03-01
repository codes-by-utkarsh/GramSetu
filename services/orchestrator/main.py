"""
Member 4: Orchestrator Service
Main API gateway, job queue management, WhatsApp integration
"""
from fastapi import FastAPI, HTTPException, Depends, WebSocket
from fastapi.middleware.cors import CORSMiddleware
import uuid
from datetime import datetime

from shared.config import get_settings
from shared.schemas import (
    JobRequest, JobResponse, JobStatusResponse,
    JobStatus, WhatsAppNotification
)
from shared.logging_config import setup_logging
from pydantic import BaseModel
import random

# In-memory OTP store for MVP (Phone Number -> OTP Code)
OTP_STORE = {}

class LoginRequest(BaseModel):
    phone: str
    password: str

class SignupRequest(BaseModel):
    phone: str
    password: str
    fullName: str = ""
    cscId: str = ""
    twilioNumber: str = ""

class VerifyRequest(BaseModel):
    phone: str
    otp: str
    is_new_user: bool = False
    twilio_number: str = ""
    fullName: str = ""

from services.orchestrator.job_manager import JobManager
from services.orchestrator.whatsapp_client import WhatsAppClient

# Initialize
settings = get_settings()
logger = setup_logging("orchestrator")
app = FastAPI(title="GramSetu Orchestrator", version="1.0.0")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_origin_regex=r"^http://(localhost|127\.0\.0\.1|192\.168\.\d+\.\d+)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Service components
job_manager = JobManager()
whatsapp_client = WhatsAppClient()


@app.on_event("startup")
async def startup():
    """Initialize connections"""
    logger.info("Orchestrator starting up")
    await job_manager.initialize()
    await whatsapp_client.initialize()


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "orchestrator"}


@app.post("/jobs", response_model=JobResponse)
async def create_job(job_request: JobRequest):
    """
    Create new job from VLE
    
    Flow:
    1. Generate job ID
    2. Validate consent
    3. Enqueue voice processing
    4. Enqueue document processing
    5. Return job ID to VLE
    """
    try:
        # Generate job ID
        job_id = str(uuid.uuid4())
        
        logger.info(
            "Creating job",
            job_id=job_id,
            vle_id=job_request.vle_id,
            citizen=job_request.citizen_name
        )
        
        # Validate consent
        if not job_request.consent_recorded:
            raise HTTPException(
                status_code=400,
                detail="Verbal consent must be recorded before processing"
            )
        
        # Create job in manager
        await job_manager.create_job(job_id, job_request)
        
        return JobResponse(
            job_id=job_id,
            status=JobStatus.QUEUED,
            estimated_completion_seconds=60,
            message=f"Job created for {job_request.citizen_name}. Processing started."
        )
        
    except Exception as e:
        logger.error(f"Job creation failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/jobs/{job_id}", response_model=JobStatusResponse)
async def get_job_status(job_id: str):
    """Get job status"""
    try:
        status = await job_manager.get_status(job_id)
        if not status:
            raise HTTPException(status_code=404, detail="Job not found")
        return status
    except Exception as e:
        logger.error(f"Status retrieval failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

class JobUpdateWebhook(BaseModel):
    job_id: str
    status: str
    message: str
    citizen_phone: str = ""

@app.post("/internal/jobs/update-status")
async def update_job_status(req: JobUpdateWebhook):
    """Internal Webhook mapping between Agent Completion and AWS DynamoDB/Twilio updates"""
    try:
        # 1. Update AWS DynamoDB state
        job_data = await job_manager.get_status(req.job_id)
        if job_data:
            job_manager.jobs_table.update_item(
                Key={'job_id': req.job_id},
                UpdateExpression="set #st = :s, current_step = :m, updated_at = :t",
                ExpressionAttributeValues={
                    ':s': req.status,
                    ':m': req.message,
                    ':t': datetime.utcnow().isoformat()
                },
                ExpressionAttributeNames={"#st": "status"}
            )
            logger.info("DynamoDB Job Tracker synchronized", job_id=req.job_id, new_status=req.status)
        else:
            logger.warning("Job not found in DynamoDB on async update", job_id=req.job_id)

        # 2. Trigger Twilio WhatsApp Notification
        if req.citizen_phone and req.citizen_phone != "unknown":
            whatsapp_msg = WhatsAppNotification(
                job_id=req.job_id,
                recipient_phone=req.citizen_phone,
                message_text=f"GramSetu AI Update: Your application status is now *{req.status}*.\nDetails: {req.message}",
                status=JobStatus.COMPLETED if req.status == "completed" else JobStatus.PROCESSING
            )
            await whatsapp_client.send_notification(whatsapp_msg)
            
        return {"status": "success", "message": "Global system architecture updated."}
    except Exception as e:
        logger.error(f"Failed internal webhook update: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/auth/signup")
async def auth_signup(req: SignupRequest):
    """Registers a new user and sends OTP"""
    try:
        user = await job_manager.get_user(req.phone)
        if user:
            raise HTTPException(status_code=400, detail="User already exists")
        
        otp = str(random.randint(100000, 999999))
        OTP_STORE[req.phone] = otp
        
        success = await whatsapp_client.send_otp(req.phone, otp)
        if success:
            return {"status": "success", "message": "OTP sent to WhatsApp for registration"}
        else:
            raise HTTPException(status_code=500, detail="Failed to send OTP via Twilio")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Signup failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/auth/login")
async def auth_login(req: LoginRequest):
    """Generates an OTP and sends it via Twilio WhatsApp"""
    try:
        user = await job_manager.get_user(req.phone)
        if not user:
            raise HTTPException(status_code=404, detail="User not found. Please sign up.")
            
        otp = str(random.randint(100000, 999999))
        OTP_STORE[req.phone] = otp
        
        # In a real app, verify password hash from DB here
        success = await whatsapp_client.send_otp(req.phone, otp)
        
        if success:
            return {"status": "success", "message": "OTP sent to WhatsApp"}
        else:
            raise HTTPException(status_code=500, detail="Failed to send OTP via Twilio")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Login failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/auth/verify")
async def auth_verify(req: VerifyRequest):
    """Verifies the OTP and registers user in DB if new"""
    stored_otp = OTP_STORE.get(req.phone)
    
    if not stored_otp or stored_otp != req.otp:
        raise HTTPException(status_code=400, detail="Invalid or expired OTP")
        
    try:
        if req.is_new_user:
            # Save user configuration securely to DynamoDB
            await job_manager.create_user(req.phone, req.twilio_number, req.fullName)
            
        del OTP_STORE[req.phone]
        return {"status": "success", "message": "Authenticated"}
        
    except Exception as e:
        logger.error(f"Verification failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

class ProfileUpdateRequest(BaseModel):
    phone: str
    fullName: str
    twilioNumber: str
    dob: str = ""
    cscId: str = ""

@app.get("/user/{phone}")
async def get_user_profile(phone: str):
    try:
        user_data = await job_manager.get_user(phone)
        if not user_data:
            raise HTTPException(status_code=404, detail="User not found")
        return {"status": "success", "data": user_data}
    except Exception as e:
        logger.error(f"Failed to fetch user profile: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/user/update")
async def update_user_profile(req: ProfileUpdateRequest):
    try:
        user_data = await job_manager.get_user(req.phone)
        if not user_data:
            # We must recreate the user
            await job_manager.create_user(req.phone, req.twilioNumber, req.fullName)
        else:
            # Note: A real implementation would implement an update_user in job_manager
            # but for MVP we can use put_item to overwrite.
            job_manager.users_table.put_item(
                Item={
                    'phone': req.phone,
                    'full_name': req.fullName,
                    'twilio_number': req.twilioNumber,
                    'dob': req.dob,
                    'csc_id': req.cscId,
                    'created_at': user_data.get('created_at', datetime.utcnow().isoformat()),
                    'updated_at': datetime.utcnow().isoformat()
                }
            )
        return {"status": "success", "message": "Profile updated successfully"}
    except Exception as e:
        logger.error(f"Failed to update user profile: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.websocket("/ws/{vle_id}")
async def websocket_endpoint(websocket: WebSocket, vle_id: str):
    """
    WebSocket for real-time updates to VLE mobile app
    """
    await websocket.accept()
    logger.info(f"WebSocket connected: {vle_id}")
    
    try:
        while True:
            # Keep connection alive and send updates
            data = await websocket.receive_text()
            # Echo for now (implement real-time job updates)
            await websocket.send_text(f"Received: {data}")
    except Exception as e:
        logger.error(f"WebSocket error: {str(e)}")
    finally:
        logger.info(f"WebSocket disconnected: {vle_id}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=settings.api_host,
        port=settings.api_port,
        reload=(settings.environment == "development")
    )
