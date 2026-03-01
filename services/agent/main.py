"""
Member 2: Browser Agent Service
Autonomous web navigation using AWS Bedrock Agents + Visual Navigation
"""
import sys
import asyncio

# Fix Playwright asyncio on Windows - use WindowsProactorEventLoopPolicy
# This must be done BEFORE uvicorn starts its own loop
if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())

from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Depends, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional

from shared.config import get_settings
from shared.schemas import AgentTask, AgentResult, JobStatus
from shared.logging_config import setup_logging
from shared.redis_client import get_redis, RedisClient

from services.agent.bedrock_agent import BedrockAgentController
from services.agent.visual_navigator import VisualNavigator
from services.agent.session_manager import SessionManager

# Initialize
settings = get_settings()
logger = setup_logging("agent-service")

# Service components (initialized lazily in lifespan)
bedrock_controller = BedrockAgentController()
visual_navigator = VisualNavigator()
session_manager = SessionManager()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for startup/shutdown events"""
    # Startup
    logger.info("Agent service starting up")
    try:
        await visual_navigator.initialize()
        logger.info("Visual navigator initialized successfully")
    except Exception as e:
        logger.error(f"Visual navigator initialization failed: {e}, continuing without browser")

    try:
        await session_manager.initialize()
        logger.info("Session manager initialized")
    except Exception as e:
        logger.warning(f"Session manager init failed: {e}")

    yield

    # Shutdown
    logger.info("Agent service shutting down")
    try:
        await visual_navigator.cleanup()
    except Exception as e:
        logger.error(f"Cleanup error: {e}")


app = FastAPI(
    title="GramSetu Agent Service",
    version="1.0.0",
    lifespan=lifespan
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    browser_ready = visual_navigator.browser is not None
    return {
        "status": "healthy",
        "service": "agent",
        "browser_ready": browser_ready
    }


@app.post("/execute-task", response_model=AgentResult)
async def execute_task(
    task: AgentTask,
    background_tasks: BackgroundTasks,
    redis: RedisClient = Depends(get_redis)
):
    """
    Execute autonomous browser task

    Flow:
    1. Load portal-specific driver (PM-KISAN, e-Shram, etc.)
    2. Restore session if available
    3. Navigate using visual cues
    4. Solve CAPTCHAs
    5. Fill form with data
    6. Submit and capture acknowledgement
    7. Return result
    """
    try:
        logger.info(
            "Executing agent task",
            task_id=task.task_id,
            scheme=task.scheme,
            action=task.action
        )

        # Update status to processing
        await redis.set_json(
            f"task:{task.task_id}:status",
            {"status": JobStatus.PROCESSING, "step": "Initializing browser"},
            expire=3600
        )

        # Check if browser is available
        if visual_navigator.browser is None:
            logger.warning("Browser not initialized, attempting to reinitialize...")
            await visual_navigator.initialize()

        # Get portal-specific driver
        driver = await bedrock_controller.get_driver(task.scheme)

        # Execute task using visual navigator
        result = await visual_navigator.execute(
            driver=driver,
            task=task,
            session_state=task.session_state
        )

        # Save session for future use
        if result.status == JobStatus.COMPLETED:
            await session_manager.save_session(
                task.task_id,
                driver.get_session_state() if hasattr(driver, 'get_session_state') else {}
            )

        logger.info(
            "Task execution complete",
            task_id=task.task_id,
            status=result.status
        )

        # Notify Orchestrator of completion to trigger Twilio & DynamoDB
        import requests
        try:
            phone_to_notify = task.form_data.get('citizen_phone') or ''

            payload = {
                "job_id": task.task_id,
                "status": "completed" if result.status == JobStatus.COMPLETED else "failed",
                "message": result.acknowledgement_number or result.error_message or "Task processed",
                "citizen_phone": phone_to_notify
            }
            requests.post("http://localhost:8000/internal/jobs/update-status", json=payload, timeout=2)
            logger.info("Successfully pushed task completion to Orchestrator Core")
        except Exception as orchestrator_error:
            logger.warning(f"Could not reach orchestrator for completion sync: {orchestrator_error}")

        return result

    except Exception as e:
        logger.error(f"Task execution failed: {str(e)}", exc_info=True)
        return AgentResult(
            task_id=task.task_id,
            status=JobStatus.FAILED,
            error_message=str(e),
            steps_completed=[]
        )


@app.get("/task-status/{task_id}")
async def get_task_status(
    task_id: str,
    redis: RedisClient = Depends(get_redis)
):
    """Get real-time task status"""
    status = await redis.get_json(f"task:{task_id}:status")
    if not status:
        raise HTTPException(status_code=404, detail="Task not found")
    return status


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=settings.api_host,
        port=8002,
        reload=(settings.environment == "development")
    )
