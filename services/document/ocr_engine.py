"""
OCR engine using AWS Textract — NO mock fallback.
Extracts real structured data from Aadhaar, PAN, and other documents.
"""
import re
import boto3
from PIL import Image
import io
from typing import Dict, Any, Tuple
from shared.config import get_settings
from shared.schemas import DocumentType
from shared.logging_config import logger

settings = get_settings()


class OCREngine:
    """Real document OCR using AWS Textract."""

    def __init__(self):
        self.textract = None

    async def initialize(self):
        """Initialize AWS Textract client using .env credentials."""
        try:
            self.textract = boto3.client(
                'textract',
                region_name=settings.aws_region,
                aws_access_key_id=settings.aws_access_key_id,
                aws_secret_access_key=settings.aws_secret_access_key
            )
            logger.info("AWS Textract client initialized successfully")
        except Exception as e:
            logger.error(f"Textract initialization failed: {e}")
            raise

    async def extract(
        self,
        image: Image.Image,
        document_type: DocumentType
    ) -> Tuple[Dict[str, Any], Dict[str, float]]:
        """
        Extract structured data from a document image using AWS Textract.
        Raises on failure — no silent mocks.
        """
        if self.textract is None:
            # Lazy init if not done via lifespan
            await self.initialize()

        # Convert PIL image to JPEG bytes (Textract handles JPEG better than PNG for photos)
        img_byte_arr = io.BytesIO()
        if image.mode != 'RGB':
            image = image.convert('RGB')
        image.save(img_byte_arr, format='JPEG', quality=95)
        img_bytes = img_byte_arr.getvalue()

        logger.info(f"Calling AWS Textract for document type: {document_type}")

        # Call Textract — analyze_document returns key-value pairs AND raw blocks
        response = self.textract.analyze_document(
            Document={'Bytes': img_bytes},
            FeatureTypes=['FORMS', 'TABLES']
        )

        logger.info(f"Textract response received. Blocks count: {len(response.get('Blocks', []))}")

        if document_type == DocumentType.AADHAAR:
            return await self._parse_aadhaar(response)
        elif document_type == DocumentType.PAN:
            return await self._parse_pan(response)
        else:
            return await self._parse_generic(response)

    async def _parse_aadhaar(self, response: Dict) -> Tuple[Dict, Dict]:
        """
        Parse Aadhaar card from Textract response.
        Extracts: name, DOB, gender, Aadhaar last4.
        Note: By law (and DPDP Act), only last 4 digits are stored.
        """
        extracted: Dict[str, Any] = {}
        confidences: Dict[str, float] = {}

        # Collect all LINE blocks sorted top-to-bottom by Y position
        lines = sorted(
            [b for b in response['Blocks'] if b['BlockType'] == 'LINE'],
            key=lambda b: b.get('Geometry', {}).get('BoundingBox', {}).get('Top', 0)
        )

        raw_lines = [(b['Text'].strip(), b['Confidence'] / 100.0) for b in lines]
        logger.debug(f"Aadhaar raw lines: {[l[0] for l in raw_lines]}")

        for i, (text, conf) in enumerate(raw_lines):
            text_upper = text.upper()

            # DOB — matches DD/MM/YYYY or YYYY
            dob_match = re.search(r'\d{2}/\d{2}/\d{4}', text)
            if dob_match and 'dob' not in extracted:
                extracted['dob'] = dob_match.group()
                confidences['dob'] = conf

            # Gender detection
            if re.search(r'\b(MALE|FEMALE|पुरुष|महिला|TRANSGENDER)\b', text_upper) and 'gender' not in extracted:
                if 'FEMALE' in text_upper or 'महिला' in text:
                    gender_val = 'F'
                elif 'MALE' in text_upper or 'पुरुष' in text:
                    gender_val = 'M'
                else:
                    gender_val = 'T'
                extracted['gender'] = gender_val
                confidences['gender'] = conf

            # Aadhaar last 4: line with 4 digits (masked card shows XXXX XXXX 1234)
            full_aadhaar = re.findall(r'\d{4}', text)
            if len(full_aadhaar) >= 1 and 'aadhaar_last4' not in extracted:
                # Take the last 4-digit block (least significant / last4)
                extracted['aadhaar_last4'] = full_aadhaar[-1]
                confidences['aadhaar_last4'] = conf

            # Name: comes before DOB on Aadhaar, usually 2-3 words, not numeric, not "Government"
            if 'name' not in extracted and 'dob' in extracted:
                # Look backwards for the name line (appears above DOB)
                pass

        # Second pass for name (the line after "दिनांक" or before DOB)
        for i, (text, conf) in enumerate(raw_lines):
            if 'name' in extracted:
                break
            # Skip boilerplate and numeric lines
            skip_patterns = ['GOVERNMENT', 'INDIA', 'UIDAI', 'AADHAAR', 'UNIQUE', 'AUTHORITY', 'DOB', 'DATE', 'https', 'www']
            if any(p in text.upper() for p in skip_patterns):
                continue
            if re.search(r'\d', text):
                continue  # skip lines with numbers (aadhaar no, year)
            words = text.strip().split()
            if 2 <= len(words) <= 5 and all(len(w) > 1 for w in words):
                # Likely a proper name
                extracted['name'] = text.strip()
                confidences['name'] = conf

        logger.info(f"Aadhaar extraction complete: {extracted}")
        return extracted, confidences

    async def _parse_pan(self, response: Dict) -> Tuple[Dict, Dict]:
        """Parse PAN card — extracts PAN number, name, and DOB."""
        extracted: Dict[str, Any] = {}
        confidences: Dict[str, float] = {}

        lines = [b for b in response['Blocks'] if b['BlockType'] == 'LINE']
        for block in lines:
            text = block['Text'].strip()
            conf = block['Confidence'] / 100.0

            # PAN format: ABCDE1234F
            pan_match = re.match(r'^[A-Z]{5}[0-9]{4}[A-Z]$', text.upper())
            if pan_match and 'pan_number' not in extracted:
                extracted['pan_number'] = text.upper()
                confidences['pan_number'] = conf

            # DOB
            dob_match = re.search(r'\d{2}/\d{2}/\d{4}', text)
            if dob_match and 'dob' not in extracted:
                extracted['dob'] = dob_match.group()
                confidences['dob'] = conf

            # Name: avoid boilerplate
            skip = ['INCOME TAX', 'GOVT', 'INDIA', 'PERMANENT', 'ACCOUNT', 'DEPARTMENT']
            if len(text) > 3 and not any(s in text.upper() for s in skip):
                if not re.search(r'\d', text):
                    if 'name' not in extracted:
                        extracted['name'] = text.strip()
                        confidences['name'] = conf

        logger.info(f"PAN extraction complete: {extracted}")
        return extracted, confidences

    async def _parse_generic(self, response: Dict) -> Tuple[Dict, Dict]:
        """Collect all LINE-level text for unknown document types."""
        extracted: Dict[str, Any] = {}
        confidences: Dict[str, float] = {}
        acc_text = []

        for block in response.get('Blocks', []):
            if block['BlockType'] == 'LINE':
                acc_text.append(block['Text'])
                extracted[f"line_{len(acc_text)}"] = block['Text']
                confidences[f"line_{len(acc_text)}"] = block['Confidence'] / 100.0

        extracted['full_text'] = '\n'.join(acc_text)
        logger.info(f"Generic extraction: {len(acc_text)} lines extracted")
        return extracted, confidences
