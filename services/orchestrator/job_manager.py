"""
Job manager for orchestrating workflow across services
Using AWS DynamoDB for $0 Serverless Cost Architecture
"""
import os
import boto3
from datetime import datetime
from typing import Optional
from shared.schemas import JobRequest, JobStatusResponse, JobStatus
from shared.logging_config import logger

class JobManager:
    """Orchestrates multi-service workflows using AWS Serverless Stack"""
    
    def __init__(self):
        # Initialize DynamoDB resource
        self.dynamodb = boto3.resource(
            'dynamodb',
            aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
            aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY'),
            region_name=os.getenv('AWS_REGION', 'ap-south-1')
        )
        self.jobs_table = self.dynamodb.Table('GramSetu_Jobs')
        self.users_table = self.dynamodb.Table('GramSetu_Users')
    
    async def initialize(self):
        """Initialize connections"""
        logger.info("DynamoDB Job manager initialized")
    
    async def create_user(self, phone: str, twilio_number: str):
        """Creates a new VLE profile in DynamoDB"""
        try:
            self.users_table.put_item(
                Item={
                    'phone': phone,
                    'twilio_number': twilio_number,
                    'created_at': datetime.utcnow().isoformat()
                }
            )
            logger.info(f"VLE {phone} registered in DynamoDB")
        except Exception as e:
            logger.error(f"User creation failed: {str(e)}")
            raise

    async def get_user(self, phone: str):
        """Check if VLE exists"""
        try:
            response = self.users_table.get_item(Key={'phone': phone})
            return response.get('Item')
        except Exception as e:
            logger.error(f"Failed to fetch user: {str(e)}")
            return None

    async def create_job(self, job_id: str, job_request: JobRequest):
        """
        Create and start processing job remotely in DynamoDB
        """
        try:
            # Store job metadata in AWS DynamoDB
            job_data = {
                "job_id": job_id,
                "vle_id": job_request.vle_id,
                "citizen_name": job_request.citizen_name,
                "citizen_phone": job_request.citizen_phone,
                "status": "QUEUED",
                "progress_percentage": 0,
                "current_step": "Initializing",
                "created_at": datetime.utcnow().isoformat(),
                "updated_at": datetime.utcnow().isoformat()
            }
            
            self.jobs_table.put_item(Item=job_data)
            logger.info(f"Job {job_id} successfully queued in AWS DynamoDB!")
            
        except Exception as e:
            logger.error(f"AWS DynamoDB Job creation failed: {str(e)}")
            raise
    
    async def get_status(self, job_id: str) -> Optional[JobStatusResponse]:
        """Get current job status from AWS DynamoDB"""
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
                result=job_data.get("result"),
                created_at=datetime.fromisoformat(job_data["created_at"]),
                updated_at=datetime.fromisoformat(job_data["updated_at"])
            )
            
        except Exception as e:
            logger.error(f"DynamoDB Status retrieval failed: {str(e)}")
            return None
