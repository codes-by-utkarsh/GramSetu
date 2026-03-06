"""
GramSetu Orchestrator Service — API Gateway
- Auth (signup / login — password-based, no OTP)
- Beneficiary management (per VLE, stored in DynamoDB)
- Job queue + real-time WebSocket status updates
- Human-in-the-loop input requests from agent
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Dict, Any, List
import uuid, random, asyncio
from datetime import datetime

from shared.config import get_settings
from shared.schemas import (
    JobRequest, JobResponse, JobStatusResponse,
    JobStatus, WhatsAppNotification
)
from shared.logging_config import setup_logging
from services.orchestrator.job_manager import JobManager
from services.orchestrator.whatsapp_client import WhatsAppClient

settings = get_settings()
logger = setup_logging("orchestrator")

job_manager = JobManager()
whatsapp_client = WhatsAppClient()

# Simple in-memory session tokens after login (mvp; replace with JWT in prod)
SESSION_STORE: Dict[str, str] = {}

# Active WebSocket connections per VLE phone
WS_CONNECTIONS: Dict[str, List[WebSocket]] = {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Orchestrator starting up")
    try:
        await job_manager.initialize()
    except Exception as e:
        logger.warning(f"JobManager init warning: {e}")
    try:
        await whatsapp_client.initialize()
    except Exception as e:
        logger.warning(f"WhatsApp init warning: {e}")
    yield
    logger.info("Orchestrator shutting down")


app = FastAPI(title="GramSetu Orchestrator", version="2.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ──────────────────────────────────────────────────────
# Misc helper: push update to all connected VLE devices
# ──────────────────────────────────────────────────────

async def push_ws_update(vle_phone: str, payload: dict):
    clients = WS_CONNECTIONS.get(vle_phone, [])
    dead = []
    for ws in clients:
        try:
            await ws.send_json(payload)
        except Exception:
            dead.append(ws)
    for ws in dead:
        clients.remove(ws)


# ──────────────────────────────────────────────────────
# Health
# ──────────────────────────────────────────────────────

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "orchestrator"}


# ──────────────────────────────────────────────────────
# Auth — Simple Password-Based Login / Signup (no OTP)
# ──────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    phone: str
    password: str

class SignupRequest(BaseModel):
    phone: str
    password: str
    fullName: str = ""
    cscId: str = ""


@app.get("/auth/check/{phone}")
async def auth_check(phone: str):
    """Check if a phone number is already registered. Used by frontend to decide login vs signup."""
    user = await job_manager.get_user(phone)
    return {"exists": bool(user)}


@app.post("/auth/signup")
async def auth_signup(req: SignupRequest):
    """Register a new VLE. Returns error if user already exists."""
    user = await job_manager.get_user(req.phone)
    if user:
        raise HTTPException(status_code=400, detail="User already exists. Please login instead.")
    # Store user with hashed-like password (plain text for MVP — add bcrypt in prod)
    await job_manager.create_user(req.phone, "", req.fullName, password=req.password)
    return {"status": "success", "message": "Account created. You can now log in.",
            "user": {"phone": req.phone, "fullName": req.fullName}}


@app.post("/auth/login")
async def auth_login(req: LoginRequest):
    """Verify phone + password, return user profile on success."""
    user = await job_manager.get_user(req.phone)
    if not user:
        raise HTTPException(status_code=404, detail="Account not found. Please sign up first.")
    stored_password = user.get("password", "")
    if stored_password != req.password:
        raise HTTPException(status_code=401, detail="Incorrect password.")
    return {
        "status": "success",
        "message": "Login successful",
        "user": {"phone": req.phone, "fullName": user.get("fullName", ""), "cscId": user.get("cscId", "")}
    }


# ──────────────────────────────────────────────────────
# VLE Profile
# ──────────────────────────────────────────────────────

class ProfileUpdateRequest(BaseModel):
    phone: str
    fullName: str
    twilioNumber: str
    dob: str = ""
    cscId: str = ""


@app.get("/user/{phone}")
async def get_user_profile(phone: str):
    user_data = await job_manager.get_user(phone)
    if not user_data:
        raise HTTPException(status_code=404, detail="User not found")
    return {"status": "success", "data": user_data}


@app.post("/user/update")
async def update_user_profile(req: ProfileUpdateRequest):
    try:
        await job_manager.create_user(req.phone, req.twilioNumber, req.fullName)
    except Exception as e:
        logger.warning(f"Profile update warning: {e}")
    return {"status": "success", "message": "Profile updated successfully"}


# ──────────────────────────────────────────────────────
# Beneficiary management
# ──────────────────────────────────────────────────────

class BeneficiaryCreateRequest(BaseModel):
    vle_phone: str
    name: str
    phone: str = ""
    aadhaar_last4: str = ""
    dob: str = ""
    gender: str = ""
    address: str = ""
    pan_number: str = ""
    bank_account: str = ""
    bank_ifsc: str = ""
    beneficiary_id: str = ""  # optional: provide to update existing


class BeneficiaryUpdateRequest(BaseModel):
    vle_phone: str
    beneficiary_id: str
    updates: Dict[str, Any]


@app.post("/beneficiaries")
async def create_beneficiary(req: BeneficiaryCreateRequest):
    data = req.dict()
    vle_phone = data.pop("vle_phone")
    bid = await job_manager.create_beneficiary(vle_phone, data)
    return {"status": "success", "beneficiary_id": bid}


@app.get("/beneficiaries/{vle_phone}")
async def list_beneficiaries(vle_phone: str):
    items = await job_manager.list_beneficiaries(vle_phone)
    return {"status": "success", "data": items}


@app.get("/beneficiaries/{vle_phone}/{beneficiary_id}")
async def get_beneficiary(vle_phone: str, beneficiary_id: str):
    item = await job_manager.get_beneficiary(vle_phone, beneficiary_id)
    if not item:
        raise HTTPException(status_code=404, detail="Beneficiary not found")
    return {"status": "success", "data": item}


@app.post("/beneficiaries/update")
async def update_beneficiary(req: BeneficiaryUpdateRequest):
    await job_manager.update_beneficiary(req.vle_phone, req.beneficiary_id, req.updates)
    return {"status": "success"}


# ──────────────────────────────────────────────────────
# Jobs
# ──────────────────────────────────────────────────────

@app.post("/jobs", response_model=JobResponse)
async def create_job(job_request: JobRequest):
    job_id = str(uuid.uuid4())
    if not job_request.consent_recorded:
        raise HTTPException(status_code=400, detail="Verbal consent must be recorded first")
    await job_manager.create_job(job_id, job_request)
    return JobResponse(
        job_id=job_id,
        status=JobStatus.QUEUED,
        estimated_completion_seconds=90,
        message=f"Job created for {job_request.citizen_name}. Agent starting..."
    )


@app.get("/jobs/{job_id}", response_model=JobStatusResponse)
async def get_job_status(job_id: str):
    status = await job_manager.get_status(job_id)
    if not status:
        raise HTTPException(status_code=404, detail="Job not found")
    return status


@app.get("/jobs/{job_id}/log")
async def get_job_log(job_id: str):
    """Return the step-by-step log array for live display in app"""
    raw = await job_manager.get_job_raw(job_id)
    if not raw:
        raise HTTPException(status_code=404, detail="Job not found")
    return {
        "job_id": job_id,
        "status": raw.get("status"),
        "current_step": raw.get("current_step"),
        "progress_percentage": int(raw.get("progress_percentage", 0)),
        "steps_log": raw.get("steps_log", []),
        "result_data": raw.get("result_data")
    }


# ──────────────────────────────────────────────────────
# Internal webhook from agent (updates job + notifies VLE)
# ──────────────────────────────────────────────────────

class JobUpdateWebhook(BaseModel):
    job_id: str
    status: str
    step: str
    progress: int = 0
    citizen_phone: str = ""
    result: Optional[Dict] = None
    step_log_entry: Optional[str] = None
    vle_phone: str = ""  # to route WebSocket push


@app.post("/internal/jobs/update-status")
async def update_job_status(req: JobUpdateWebhook):
    await job_manager.update_job(
        job_id=req.job_id,
        status=req.status,
        step=req.step,
        progress=req.progress,
        result=req.result,
        step_log_entry=req.step_log_entry or req.step
    )
    # Push live update to VLE's WebSocket connection
    if req.vle_phone:
        await push_ws_update(req.vle_phone, {
            "type": "job_update",
            "job_id": req.job_id,
            "status": req.status,
            "step": req.step,
            "progress": req.progress,
        })
    # If completed/failed, notify citizen via WhatsApp
    if req.status in ("completed", "failed") and req.citizen_phone:
        msg = (
            f"✅ GramSetu: Your application has been *COMPLETED* successfully!"
            if req.status == "completed"
            else f"❌ GramSetu: Your application processing encountered an issue. Please visit your VLE again."
        )
        notification = WhatsAppNotification(
            job_id=req.job_id,
            recipient_phone=req.citizen_phone,
            message_text=msg,
            status=JobStatus.COMPLETED if req.status == "completed" else JobStatus.FAILED
        )
        await whatsapp_client.send_notification(notification)
    return {"status": "success"}


# ──────────────────────────────────────────────────────
# Human-in-the-loop: agent asks VLE for more info
# ──────────────────────────────────────────────────────

class InputRequestCreate(BaseModel):
    job_id: str
    fields_needed: List[str]
    screenshot_url: str = ""
    message: str = ""
    vle_phone: str = ""


class InputAnswerSubmit(BaseModel):
    request_id: str
    answer: Dict[str, Any]


@app.post("/agent/input-request")
async def create_input_request(req: InputRequestCreate):
    """
    Called by the agent service when a portal requires additional
    information from the VLE (e.g., OTP, missing field, CAPTCHA override).
    """
    request_id = await job_manager.create_input_request(
        job_id=req.job_id,
        fields_needed=req.fields_needed,
        screenshot_url=req.screenshot_url,
        message=req.message
    )
    # Update job status to waiting_for_input
    await job_manager.update_job(
        job_id=req.job_id,
        status=JobStatus.WAITING_FOR_INPUT,
        step=f"Waiting for VLE input: {', '.join(req.fields_needed)}",
        progress=50
    )
    # Push to VLE's phone via WebSocket
    if req.vle_phone:
        await push_ws_update(req.vle_phone, {
            "type": "input_required",
            "job_id": req.job_id,
            "request_id": request_id,
            "fields_needed": req.fields_needed,
            "screenshot_url": req.screenshot_url,
            "message": req.message
        })
    return {"status": "success", "request_id": request_id}


@app.get("/agent/input-request/{request_id}")
async def get_input_request(request_id: str):
    """Agent polls this endpoint waiting for VLE to provide answer."""
    item = await job_manager.get_input_request(request_id)
    if not item:
        raise HTTPException(status_code=404, detail="Input request not found")
    return item


@app.post("/agent/input-answer")
async def submit_input_answer(req: InputAnswerSubmit):
    """VLE submits the answer. Agent will pick it up on its next poll."""
    await job_manager.submit_input_answer(req.request_id, req.answer)
    return {"status": "success"}


# ──────────────────────────────────────────────────────
# WebSocket — Real-time updates per VLE phone
# ──────────────────────────────────────────────────────

@app.websocket("/ws/{vle_phone}")
async def websocket_endpoint(websocket: WebSocket, vle_phone: str):
    await websocket.accept()
    if vle_phone not in WS_CONNECTIONS:
        WS_CONNECTIONS[vle_phone] = []
    WS_CONNECTIONS[vle_phone].append(websocket)
    logger.info(f"WebSocket connected: {vle_phone}")
    try:
        await websocket.send_json({"type": "connected", "vle_phone": vle_phone})
        while True:
            # Keep connection alive — client sends pings
            _ = await websocket.receive_text()
    except WebSocketDisconnect:
        logger.info(f"WebSocket disconnected: {vle_phone}")
    except Exception as e:
        logger.error(f"WebSocket error for {vle_phone}: {e}")
    finally:
        if vle_phone in WS_CONNECTIONS:
            try:
                WS_CONNECTIONS[vle_phone].remove(websocket)
            except ValueError:
                pass


# ──────────────────────────────────────────────────────
# Entry point
# ──────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "services.orchestrator.main:app",
        host=settings.api_host,
        port=settings.api_port,
        reload=False
    )
