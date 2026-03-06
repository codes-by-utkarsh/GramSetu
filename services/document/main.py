"""
Member 3: Document Processing Service
Privacy-preserving OCR with edge-based Aadhaar masking
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import base64
import io
from PIL import Image
import cv2
import numpy as np
import boto3
import uuid

from shared.config import get_settings
from shared.schemas import DocumentInput, DocumentOutput, DocumentType
from shared.logging_config import setup_logging

from services.document.aadhaar_masker import AadhaarMasker
from services.document.ocr_engine import OCREngine
from services.document.document_verifier import DocumentVerifier

# Initialize
settings = get_settings()
logger = setup_logging("document-service")

# Service components
aadhaar_masker = AadhaarMasker()
ocr_engine = OCREngine()
document_verifier = DocumentVerifier()

# S3 client — created lazily to avoid startup crashes on bad creds
_s3_client = None

def _get_s3_client():
    global _s3_client
    if _s3_client is None:
        _s3_client = boto3.client(
            's3',
            aws_access_key_id=settings.aws_access_key_id,
            aws_secret_access_key=settings.aws_secret_access_key,
            region_name=settings.aws_region
        )
    return _s3_client


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager"""
    logger.info("Document service starting up")
    try:
        await ocr_engine.initialize()
        logger.info("OCR engine (AWS Textract) initialized")
    except Exception as e:
        logger.warning(f"OCR engine init warning: {e} - will use fallback")
    yield
    logger.info("Document service shutting down")


app = FastAPI(title="GramSetu Document Service", version="1.0.0", lifespan=lifespan)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "service": "document"}


@app.post("/process-document", response_model=DocumentOutput)
async def process_document(doc_input: DocumentInput):
    """
    Process document with privacy-preserving OCR
    
    Flow:
    1. Decode image
    2. Apply masking if Aadhaar (DPDP compliance)
    3. Run OCR extraction
    4. Verify authenticity
    5. Return structured data
    """
    try:
        logger.info(
            "Processing document",
            document_type=doc_input.document_type,
            vle_id=doc_input.vle_id
        )
        
        # Decode image
        base64_str = doc_input.image_base64
        if ',' in base64_str:
            base64_str = base64_str.split(',', 1)[1]
            
        # Strip any whitespace or newlines first
        import re
        base64_str = re.sub(r'[^A-Za-z0-9+/]', '', base64_str)
            
        # Add safety padding if missing, handling broken strings
        pad_len = len(base64_str) % 4
        if pad_len == 1:
            # 1 char mod 4 is mathematically invalid base64, drop the broken trailing char
            base64_str = base64_str[:-1]
        elif pad_len == 2:
            base64_str += '=='
        elif pad_len == 3:
            base64_str += '='
            
        image_bytes = base64.b64decode(base64_str)
        image = Image.open(io.BytesIO(image_bytes))
        
        # Apply masking if Aadhaar
        masked_image = image
        if doc_input.document_type == DocumentType.AADHAAR and doc_input.apply_masking:
            masked_image = await aadhaar_masker.mask(image)
            logger.info("Aadhaar masking applied")
        
        # Run OCR
        extracted_data, confidence_scores = await ocr_engine.extract(
            masked_image,
            doc_input.document_type
        )
        
        # Verify authenticity
        is_authentic, warnings = await document_verifier.verify(
            masked_image,
            doc_input.document_type,
            extracted_data
        )

        # Upload masked image securely to S3
        masked_image_url = None
        try:
            upload_byte_arr = io.BytesIO()
            masked_image.save(upload_byte_arr, format='JPEG')
            upload_bytes = upload_byte_arr.getvalue()

            s3_filename = f"secure_docs/{doc_input.vle_id}_{uuid.uuid4().hex[:8]}.jpg"
            bucket_name = settings.s3_bucket_name or "gramsetu-storage"

            _get_s3_client().put_object(
                Bucket=bucket_name,
                Key=s3_filename,
                Body=upload_bytes,
                ContentType="image/jpeg",
                ServerSideEncryption="AES256"
            )
            masked_image_url = f"s3://{bucket_name}/{s3_filename}"
            logger.info("Masked Document safely uploaded to AWS S3 Bucket", url=masked_image_url)
        except Exception as e_s3:
            logger.error(f"S3 Upload failed (continuing without upload): {str(e_s3)}")
        
        logger.info(
            "Document processing complete",
            extracted_fields=len(extracted_data),
            is_authentic=is_authentic
        )
        
        return DocumentOutput(
            document_type=doc_input.document_type,
            extracted_data=extracted_data,
            masked_image_url=masked_image_url,
            confidence_scores=confidence_scores,
            is_authentic=is_authentic,
            warnings=warnings
        )
        
    except Exception as e:
        logger.error(f"Document processing failed: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "services.document.main:app",
        host=settings.api_host,
        port=8003,
        reload=False
    )
