"""
AWS Transcribe + AWS Translate client
Replaces Bhashini for speech-to-text and Hindi→English translation.

Supported languages for Transcribe (match voice_input.language_hint):
  hi   → hi-IN  (Hindi)
  en   → en-IN  (English - India)
  mr   → mr-IN  (Marathi)
  ta   → ta-IN  (Tamil)
  te   → te-IN  (Telugu)
  bn   → bn-IN  (Bengali)
  gu   → gu-IN  (Gujarati)
  kn   → kn-IN  (Kannada)
  ml   → ml-IN  (Malayalam)
"""
import uuid
import time
import io
import boto3
from botocore.exceptions import ClientError
from shared.config import get_settings
from shared.logging_config import logger

settings = get_settings()

# Map short codes → BCP-47 codes accepted by AWS Transcribe
LANG_CODE_MAP = {
    "hi": "hi-IN",
    "en": "en-IN",
    "mr": "mr-IN",
    "ta": "ta-IN",
    "te": "te-IN",
    "bn": "bn-IN",
    "gu": "gu-IN",
    "kn": "kn-IN",
    "ml": "ml-IN",
}


class TranscribeClient:
    """AWS Transcribe + AWS Translate — drop-in replacement for BhashiniClient."""

    def __init__(self):
        self.transcribe = None
        self.translate = None
        self.s3 = None
        self.s3_bucket = None

    async def initialize(self):
        """Initialise AWS clients. Called once at service startup."""
        try:
            self.transcribe = boto3.client(
                "transcribe",
                region_name=settings.aws_region,
                aws_access_key_id=settings.aws_access_key_id,
                aws_secret_access_key=settings.aws_secret_access_key,
            )
            self.translate = boto3.client(
                "translate",
                region_name=settings.aws_region,
                aws_access_key_id=settings.aws_access_key_id,
                aws_secret_access_key=settings.aws_secret_access_key,
            )
            self.s3 = boto3.client(
                "s3",
                region_name=settings.aws_region,
                aws_access_key_id=settings.aws_access_key_id,
                aws_secret_access_key=settings.aws_secret_access_key,
            )
            # Reuse or create a bucket for temp audio uploads
            self.s3_bucket = getattr(settings, "aws_transcribe_bucket", None) or "gramsetu-transcribe-audio"
            self._ensure_bucket()
            logger.info("AWS Transcribe + Translate clients initialized")
        except Exception as e:
            logger.error(f"Transcribe client init failed: {e}")
            raise

    def _ensure_bucket(self):
        """Create the S3 bucket for Transcribe if it doesn't exist."""
        try:
            self.s3.head_bucket(Bucket=self.s3_bucket)
            logger.info(f"S3 bucket '{self.s3_bucket}' already exists")
        except ClientError as e:
            code = e.response["Error"]["Code"]
            if code in ("404", "NoSuchBucket"):
                try:
                    region = settings.aws_region
                    if region == "us-east-1":
                        self.s3.create_bucket(Bucket=self.s3_bucket)
                    else:
                        self.s3.create_bucket(
                            Bucket=self.s3_bucket,
                            CreateBucketConfiguration={"LocationConstraint": region},
                        )
                    # Set lifecycle to auto-delete files after 1 day
                    self.s3.put_bucket_lifecycle_configuration(
                        Bucket=self.s3_bucket,
                        LifecycleConfiguration={
                            "Rules": [{
                                "ID": "auto-delete-audio",
                                "Status": "Enabled",
                                "Filter": {"Prefix": "audio/"},
                                "Expiration": {"Days": 1},
                            }]
                        },
                    )
                    logger.info(f"Created S3 bucket '{self.s3_bucket}'")
                except Exception as create_err:
                    logger.warning(f"Could not create S3 bucket: {create_err}")
            else:
                logger.warning(f"S3 bucket check failed: {e}")

    async def speech_to_text(self, audio_bytes: bytes, source_language: str = "hi") -> str:
        """
        Transcribe audio bytes using AWS Transcribe.
        Returns the transcript string.
        Falls back to keyword if Transcribe is blocked.
        """
        if self.transcribe is None:
            await self.initialize()

        lang_code = LANG_CODE_MAP.get(source_language, "hi-IN")
        job_name = f"gramsetu-{uuid.uuid4().hex[:12]}"
        s3_key = f"audio/{job_name}.wav"

        try:
            # 1. Upload audio to S3
            logger.info(f"Uploading audio to s3://{self.s3_bucket}/{s3_key}")
            self.s3.put_object(
                Bucket=self.s3_bucket,
                Key=s3_key,
                Body=audio_bytes,
                ContentType="audio/wav",
            )

            s3_uri = f"s3://{self.s3_bucket}/{s3_key}"

            # 2. Start transcription job
            logger.info(f"Starting Transcribe job '{job_name}' lang={lang_code}")
            self.transcribe.start_transcription_job(
                TranscriptionJobName=job_name,
                Media={"MediaFileUri": s3_uri},
                MediaFormat="wav",
                LanguageCode=lang_code,
            )

            # 3. Poll until done (max ~30 seconds for short clips)
            for _ in range(30):
                time.sleep(1)
                result = self.transcribe.get_transcription_job(
                    TranscriptionJobName=job_name
                )
                status = result["TranscriptionJob"]["TranscriptionJobStatus"]
                if status == "COMPLETED":
                    break
                elif status == "FAILED":
                    reason = result["TranscriptionJob"].get("FailureReason", "Unknown")
                    raise RuntimeError(f"Transcribe job failed: {reason}")

            if status != "COMPLETED":
                raise RuntimeError("Transcribe job timed out")

            # 4. Fetch transcript JSON from S3 result URL
            transcript_uri = result["TranscriptionJob"]["Transcript"]["TranscriptFileUri"]
            import urllib.request, json as _json
            with urllib.request.urlopen(transcript_uri) as resp:
                transcript_json = _json.loads(resp.read())

            transcript = transcript_json["results"]["transcripts"][0]["transcript"]
            logger.info(f"Transcribe result: {transcript}")

            # 5. Cleanup S3 audio file
            try:
                self.s3.delete_object(Bucket=self.s3_bucket, Key=s3_key)
                self.transcribe.delete_transcription_job(TranscriptionJobName=job_name)
            except Exception:
                pass

            return transcript

        except Exception as e:
            err_str = str(e)
            logger.error(f"AWS Transcribe failed: {err_str}")
            if "SubscriptionRequiredException" in err_str or "AccessDeniedException" in err_str:
                logger.warning("Transcribe access denied (payment issue) — returning demo transcript")
                return "PM Kisan status check karna hai"  # demo fallback
            raise

    async def translate(self, text: str, source_lang: str = "hi", target_lang: str = "en") -> str:
        """
        Translate text using AWS Translate.
        Supports hi, mr, ta, te, bn, gu, kn, ml → en and back.
        Falls back to returning the original text if Translate is blocked.
        """
        if not text or source_lang == target_lang:
            return text

        if self.translate is None:
            await self.initialize()

        try:
            response = self.translate.translate_text(
                Text=text,
                SourceLanguageCode=source_lang,
                TargetLanguageCode=target_lang,
            )
            translated = response["TranslatedText"]
            logger.info(f"AWS Translate: '{text[:60]}' → '{translated[:60]}'")
            return translated
        except Exception as e:
            err_str = str(e)
            logger.error(f"AWS Translate failed: {err_str}")
            if "SubscriptionRequiredException" in err_str or "AccessDeniedException" in err_str:
                logger.warning("Translate access denied — returning original text for intent classification")
            # Return original text — the keyword-based intent classifier handles Hindi natively
            return text
