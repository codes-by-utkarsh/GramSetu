"""
Voice Interface Service — AWS Transcribe (replaces Bhashini for ASR)
+ AWS Translate for Hindi/regional → English translation
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import base64
from typing import Optional

from shared.config import get_settings
from shared.schemas import VoiceInput, VoiceOutput, IntentType
from shared.logging_config import setup_logging

from services.voice.transcribe_client import TranscribeClient
from services.voice.audio_processor import AudioProcessor
from services.voice.intent_classifier import IntentClassifier

settings = get_settings()
logger = setup_logging("voice-service")

transcribe_client = TranscribeClient()
audio_processor = AudioProcessor()
intent_classifier = IntentClassifier()

# Will be set True after successful init
TRANSCRIBE_READY = False


@asynccontextmanager
async def lifespan(app: FastAPI):
    global TRANSCRIBE_READY
    logger.info("Voice service starting up")
    try:
        await transcribe_client.initialize()
        TRANSCRIBE_READY = True
        logger.info("AWS Transcribe + Translate clients ready")
    except Exception as e:
        logger.warning(f"Transcribe init warning: {e} — will attempt lazy-init per request")
    yield
    logger.info("Voice service shutting down")


app = FastAPI(title="GramSetu Voice Service", version="2.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "voice",
        "asr_backend": "aws_transcribe",
        "transcribe_ready": TRANSCRIBE_READY,
    }


@app.post("/process-audio", response_model=VoiceOutput)
async def process_audio(voice_input: VoiceInput):
    """
    Process voice audio through pipeline:
    1. Decode base64 audio bytes
    2. Noise suppression + format normalisation
    3. ASR via AWS Transcribe (Hindi/regional → text)
    4. Translate to English via AWS Translate
    5. Classify intent + extract entities via IntentClassifier
    """
    try:
        logger.info("Processing voice input", extra={"vle_id": voice_input.vle_id})

        audio_bytes = base64.b64decode(voice_input.audio_base64)

        # Preprocess: noise reduction, resample to 16kHz WAV
        try:
            processed_audio = await audio_processor.preprocess(audio_bytes)
        except Exception as prep_err:
            logger.warning(f"Audio preprocessing failed: {prep_err} — using raw bytes")
            processed_audio = audio_bytes

        # --- Speech-to-text via AWS Transcribe ---
        source_lang = voice_input.language_hint or "hi"
        try:
            transcript = await transcribe_client.speech_to_text(
                processed_audio,
                source_language=source_lang,
            )
            logger.info(f"Transcript: {transcript}")
        except Exception as asr_err:
            logger.error(f"ASR failed: {asr_err}")
            transcript = "[ASR failed — please try again]"

        # --- Translate to English via AWS Translate (if needed) ---
        english_text = transcript
        if source_lang != "en" and transcript and not transcript.startswith("["):
            try:
                english_text = await transcribe_client.translate(
                    transcript,
                    source_lang=source_lang,
                    target_lang="en",
                )
                logger.info(f"English: {english_text}")
            except Exception as tr_err:
                logger.warning(f"Translation failed: {tr_err} — using raw transcript")
                english_text = transcript

        # --- Intent classification ---
        intent_result = await intent_classifier.classify(
            english_text, context=voice_input.session_id
        )

        return VoiceOutput(
            transcript=transcript,
            intent=intent_result.get("intent", IntentType.CHECK_STATUS),
            scheme=intent_result.get("scheme"),
            entities=intent_result.get("entities", {}),
            missing_info=intent_result.get("missing_info", []),
            confidence=float(intent_result.get("confidence", 0.0)),
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Voice processing failed: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


# ─────────────────────────────────────────────────────────────────────────────
# Text-only classify endpoint — called when user types instead of speaking
# ─────────────────────────────────────────────────────────────────────────────

class TextClassifyRequest(BaseModel):
    text: str
    vle_id: str = "vle_demo"
    language: str = "en"
    session_id: Optional[str] = None


@app.post("/classify-text")
async def classify_text(req: TextClassifyRequest):
    """
    Classify raw text (typed or from on-device speech recognition).
    Translates regional language text to English first if needed.
    """
    try:
        logger.info(f"Classifying text: {req.text[:60]}")

        english_text = req.text
        if req.language != "en":
            try:
                english_text = await transcribe_client.translate(
                    req.text, source_lang=req.language, target_lang="en"
                )
            except Exception:
                english_text = req.text

        intent_result = await intent_classifier.classify(
            english_text, context=req.session_id
        )

        return {
            "transcript": req.text,
            "english_text": english_text,
            "intent": intent_result.get("intent", IntentType.CHECK_STATUS),
            "scheme": intent_result.get("scheme"),
            "entities": intent_result.get("entities", {}),
            "missing_info": intent_result.get("missing_info", []),
            "confidence": float(intent_result.get("confidence", 0.0)),
        }

    except Exception as e:
        logger.error(f"Text classification failed: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "services.voice.main:app",
        host=settings.api_host,
        port=8001,
        reload=False,
    )
