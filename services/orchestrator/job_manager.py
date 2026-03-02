"""
Job manager — AWS DynamoDB backend.
Handles: VLE users, beneficiaries, jobs, and agent human-in-the-loop input requests.
"""
import os
import uuid
import boto3
from boto3.dynamodb.conditions import Key
from datetime import datetime
from typing import Optional, List, Dict, Any
from shared.schemas import JobRequest, JobStatusResponse, JobStatus
from shared.logging_config import logger
from shared.config import get_settings

settings = get_settings()


class JobManager:
    """Orchestrates multi-service workflows using AWS DynamoDB (Serverless)"""

    def __init__(self):
        self.dynamodb = boto3.resource(
            'dynamodb',
            aws_access_key_id=settings.aws_access_key_id,
            aws_secret_access_key=settings.aws_secret_access_key,
            region_name=settings.aws_region
        )
        self.jobs_table = self.dynamodb.Table('GramSetu_Jobs')
        self.users_table = self.dynamodb.Table('GramSetu_Users')
        self.beneficiaries_table = self.dynamodb.Table('GramSetu_Beneficiaries')
        self.agent_inputs_table = self.dynamodb.Table('GramSetu_AgentInputs')

    async def initialize(self):
        logger.info("DynamoDB Job manager initialized")

    # ──────────────────────────────────────────
    # VLE User management
    # ──────────────────────────────────────────

    async def create_user(self, phone: str, twilio_number: str, full_name: str = ""):
        try:
            self.users_table.put_item(Item={
                'phone': phone,
                'full_name': full_name,
                'twilio_number': twilio_number,
                'created_at': datetime.utcnow().isoformat()
            })
            logger.info(f"VLE {phone} registered in DynamoDB")
        except Exception as e:
            logger.error(f"User creation failed: {e}")
            raise

    async def get_user(self, phone: str):
        try:
            response = self.users_table.get_item(Key={'phone': phone})
            return response.get('Item')
        except Exception as e:
            logger.error(f"Failed to fetch user: {e}")
            return None

    # ──────────────────────────────────────────
    # Beneficiary management (VLE's customers)
    # ──────────────────────────────────────────

    async def create_beneficiary(self, vle_phone: str, data: Dict[str, Any]) -> str:
        """Create or update a beneficiary record under a VLE."""
        beneficiary_id = data.get('beneficiary_id') or str(uuid.uuid4())
        try:
            item = {
                'vle_phone': vle_phone,
                'beneficiary_id': beneficiary_id,
                'name': data.get('name', ''),
                'phone': data.get('phone', ''),
                'aadhaar_last4': data.get('aadhaar_last4', ''),
                'dob': data.get('dob', ''),
                'gender': data.get('gender', ''),
                'address': data.get('address', ''),
                'pan_number': data.get('pan_number', ''),
                'bank_account': data.get('bank_account', ''),
                'bank_ifsc': data.get('bank_ifsc', ''),
                'created_at': data.get('created_at', datetime.utcnow().isoformat()),
                'updated_at': datetime.utcnow().isoformat()
            }
            self.beneficiaries_table.put_item(Item=item)
            logger.info(f"Beneficiary {beneficiary_id} saved for VLE {vle_phone}")
            return beneficiary_id
        except Exception as e:
            logger.error(f"Beneficiary creation failed: {e}")
            raise

    async def get_beneficiary(self, vle_phone: str, beneficiary_id: str) -> Optional[Dict]:
        try:
            response = self.beneficiaries_table.get_item(
                Key={'vle_phone': vle_phone, 'beneficiary_id': beneficiary_id}
            )
            return response.get('Item')
        except Exception as e:
            logger.error(f"Failed to fetch beneficiary: {e}")
            return None

    async def list_beneficiaries(self, vle_phone: str) -> List[Dict]:
        try:
            response = self.beneficiaries_table.query(
                KeyConditionExpression=Key('vle_phone').eq(vle_phone)
            )
            return response.get('Items', [])
        except Exception as e:
            logger.error(f"Failed to list beneficiaries: {e}")
            return []

    async def update_beneficiary(self, vle_phone: str, beneficiary_id: str, updates: Dict[str, Any]):
        """Merge new fields (e.g. aadhaar data from OCR) into existing beneficiary."""
        try:
            existing = await self.get_beneficiary(vle_phone, beneficiary_id)
            if not existing:
                return await self.create_beneficiary(vle_phone, {**updates, 'beneficiary_id': beneficiary_id})
            merged = {**existing, **updates, 'updated_at': datetime.utcnow().isoformat()}
            self.beneficiaries_table.put_item(Item=merged)
            logger.info(f"Beneficiary {beneficiary_id} updated")
        except Exception as e:
            logger.error(f"Beneficiary update failed: {e}")

    # ──────────────────────────────────────────
    # Job management
    # ──────────────────────────────────────────

    async def create_job(self, job_id: str, job_request: JobRequest):
        try:
            job_data = {
                "job_id": job_id,
                "vle_id": job_request.vle_id,
                "citizen_name": job_request.citizen_name,
                "citizen_phone": job_request.citizen_phone,
                "status": JobStatus.QUEUED,
                "progress_percentage": 0,
                "current_step": "Initializing",
                "steps_log": [],
                "created_at": datetime.utcnow().isoformat(),
                "updated_at": datetime.utcnow().isoformat()
            }
            self.jobs_table.put_item(Item=job_data)
            logger.info(f"Job {job_id} queued in DynamoDB")
        except Exception as e:
            logger.error(f"Job creation failed: {e}")
            raise

    async def update_job(self, job_id: str, status: str, step: str, progress: int = 0,
                         result: Optional[Dict] = None, step_log_entry: Optional[str] = None):
        try:
            update_expr = "SET #st = :s, current_step = :m, progress_percentage = :p, updated_at = :t"
            expr_values: Dict[str, Any] = {
                ':s': status, ':m': step, ':p': progress,
                ':t': datetime.utcnow().isoformat()
            }
            if result:
                update_expr += ", result_data = :r"
                expr_values[':r'] = result
            if step_log_entry:
                update_expr += ", steps_log = list_append(if_not_exists(steps_log, :empty), :sl)"
                expr_values[':empty'] = []
                expr_values[':sl'] = [f"[{datetime.utcnow().strftime('%H:%M:%S')}] {step_log_entry}"]
            self.jobs_table.update_item(
                Key={'job_id': job_id},
                UpdateExpression=update_expr,
                ExpressionAttributeValues=expr_values,
                ExpressionAttributeNames={"#st": "status"}
            )
        except Exception as e:
            logger.error(f"Job update failed: {e}")

    async def get_status(self, job_id: str) -> Optional[JobStatusResponse]:
        try:
            response = self.jobs_table.get_item(Key={'job_id': job_id})
            job_data = response.get('Item')
            if not job_data:
                return None
            return JobStatusResponse(
                job_id=job_id,
                status=job_data.get("status", JobStatus.QUEUED),
                progress_percentage=int(job_data.get("progress_percentage", 0)),
                current_step=job_data.get("current_step", "Initializing"),
                result=job_data.get("result_data"),
                created_at=datetime.fromisoformat(job_data["created_at"]),
                updated_at=datetime.fromisoformat(job_data["updated_at"])
            )
        except Exception as e:
            logger.error(f"Status retrieval failed: {e}")
            return None

    async def get_job_raw(self, job_id: str) -> Optional[Dict]:
        try:
            response = self.jobs_table.get_item(Key={'job_id': job_id})
            return response.get('Item')
        except Exception as e:
            logger.error(f"Raw job fetch failed: {e}")
            return None

    # ──────────────────────────────────────────
    # Human-in-the-loop: Agent input requests
    # ──────────────────────────────────────────

    async def create_input_request(self, job_id: str, fields_needed: List[str],
                                    screenshot_url: Optional[str] = None,
                                    message: str = "") -> str:
        """
        Called by the agent when the portal needs additional info from the VLE.
        Returns a request_id so the VLE app can poll/submit the answer.
        """
        request_id = str(uuid.uuid4())
        try:
            self.agent_inputs_table.put_item(Item={
                'request_id': request_id,
                'job_id': job_id,
                'fields_needed': fields_needed,
                'screenshot_url': screenshot_url or '',
                'message': message,
                'status': 'pending',  # pending → answered
                'answer': {},
                'created_at': datetime.utcnow().isoformat()
            })
            logger.info(f"Input request {request_id} created for job {job_id}, needs: {fields_needed}")
            return request_id
        except Exception as e:
            logger.error(f"Failed to create input request: {e}")
            raise

    async def get_input_request(self, request_id: str) -> Optional[Dict]:
        try:
            response = self.agent_inputs_table.get_item(Key={'request_id': request_id})
            return response.get('Item')
        except Exception as e:
            logger.error(f"Failed to fetch input request: {e}")
            return None

    async def submit_input_answer(self, request_id: str, answer: Dict[str, Any]):
        """VLE submits the answer to the agent's question."""
        try:
            self.agent_inputs_table.update_item(
                Key={'request_id': request_id},
                UpdateExpression="SET #st = :s, answer = :a, answered_at = :t",
                ExpressionAttributeValues={
                    ':s': 'answered',
                    ':a': answer,
                    ':t': datetime.utcnow().isoformat()
                },
                ExpressionAttributeNames={"#st": "status"}
            )
            logger.info(f"Answer submitted for request {request_id}")
        except Exception as e:
            logger.error(f"Failed to submit answer: {e}")
            raise
