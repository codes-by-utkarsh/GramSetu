"""
Voice Interface Service — with proper Bhashini + graceful fallbacks
"""
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import base64
import io
from typing import Optional

from shared.config import get_settings
from shared.schemas import VoiceInput, VoiceOutput, IntentType, SchemeType
from shared.logging_config import setup_logging

from services.voice.bhashini_client import BhashiniClient
from services.voice.audio_processor import AudioProcessor
from services.voice.intent_classifier import IntentClassifier

settings = get_settings()
logger = setup_logging("voice-service")

bhashini_client = BhashiniClient()
audio_processor = AudioProcessor()
intent_classifier = IntentClassifier()

# Detect whether Bhashini is really configured
BHASHINI_CONFIGURED = bool(
    settings.bhashini_api_key
    and settings.bhashini_api_key not in ("your_bhashini_api_key_here", "")
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Voice service starting up")
    if BHASHINI_CONFIGURED:
        try:
            await bhashini_client.initialize()
            logger.info("Bhashini client initialized")
        except Exception as e:
            logger.warning(f"Bhashini init warning: {e}")
    else:
        logger.warning(
            "Bhashini API key not configured — audio-to-text will use raw text fallback. "
            "Set BHASHINI_API_KEY in .env for real ASR."
        )
    yield
    logger.info("Voice service shutting down")


app = FastAPI(title="GramSetu Voice Service", version="1.0.0", lifespan=lifespan)

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
        "bhashini_configured": BHASHINI_CONFIGURED
    }


@app.post("/process-audio", response_model=VoiceOutput)
async def process_audio(voice_input: VoiceInput):
    """
    Process voice audio through pipeline:
    1. Decode audio bytes
    2. Noise suppression + format conversion
    3. ASR via Bhashini (if configured) — else return stub transcript
    4. Translate to English for intent classification
    5. Classify intent + extract entities
    """
    try:
        logger.info("Processing voice input", extra={"vle_id": voice_input.vle_id})

        audio_bytes = base64.b64decode(voice_input.audio_base64)

        transcript = ""
        english_text = ""

        if BHASHINI_CONFIGURED:
            # Full pipeline: preprocess → ASR → translate
            try:
                processed_audio = await audio_processor.preprocess(audio_bytes)
                transcript = await bhashini_client.speech_to_text(
                    processed_audio,
                    source_language=voice_input.language_hint or "hi"
                )
                english_text = await bhashini_client.translate(
                    transcript,
                    source_lang=voice_input.language_hint or "hi",
                    target_lang="en"
                )
                logger.info(f"Bhashini ASR: {transcript}")
            except Exception as asr_err:
                logger.error(f"Bhashini ASR failed: {asr_err}")
                transcript = "[ASR failed — please use text input]"
                english_text = transcript
        else:
            # No Bhashini — we can't transcribe audio; return error so app shows text input
            logger.warning("Bhashini not configured; audio ASR skipped")
            raise HTTPException(
                status_code=503,
                detail="ASR_UNAVAILABLE: Bhashini API key not configured. Use text input instead."
            )

        # Classify intent from English text
        intent_result = await intent_classifier.classify(english_text, context=voice_input.session_id)

        return VoiceOutput(
            transcript=transcript,
            intent=intent_result.get("intent", IntentType.CHECK_STATUS),
            scheme=intent_result.get("scheme"),
            entities=intent_result.get("entities", {}),
            missing_info=intent_result.get("missing_info", []),
            confidence=float(intent_result.get("confidence", 0.0))
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
    Works whether or not Bhashini is configured.
    """
    try:
        logger.info(f"Classifying text: {req.text[:60]}")

        # If not English try to translate with Bhashini first
        english_text = req.text
        if BHASHINI_CONFIGURED and req.language != "en":
            try:
                english_text = await bhashini_client.translate(
                    req.text, source_lang=req.language, target_lang="en"
                )
            except Exception:
                english_text = req.text

        intent_result = await intent_classifier.classify(english_text, context=req.session_id)

        return {
            "transcript": req.text,
            "english_text": english_text,
            "intent": intent_result.get("intent", IntentType.CHECK_STATUS),
            "scheme": intent_result.get("scheme"),
            "entities": intent_result.get("entities", {}),
            "missing_info": intent_result.get("missing_info", []),
            "confidence": float(intent_result.get("confidence", 0.0))
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
        reload=False
    )
