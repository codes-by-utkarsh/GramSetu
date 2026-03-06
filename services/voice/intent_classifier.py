"""
Intent classification and entity extraction using LLM or rule-based fallback.
Converts transcribed text to structured action + entities.
"""
import json
import re
from typing import Dict, Any
from shared.config import get_settings
from shared.schemas import IntentType, SchemeType
from shared.logging_config import logger

try:
    import boto3
    USE_BEDROCK = True
except ImportError:
    USE_BEDROCK = False

try:
    from openai import AsyncOpenAI
    USE_OPENAI = True
except ImportError:
    USE_OPENAI = False

settings = get_settings()


class IntentClassifier:
    """LLM-powered intent classification for Indian government schemes"""

    SYSTEM_PROMPT = """You are an expert Indian Government Scheme intent classifier for a VLE (Village Level Entrepreneur) app called GramSetu.

A VLE speaks a query describing what a rural citizen needs. Your job is to:
1. Identify the **scheme** from the list below (you MUST pick one — never return null).
2. Identify the **intent** (action).
3. Extract any **entities** mentioned.
4. List **missing_info** fields still needed.

SCHEME MAPPING (use EXACTLY these values):
- pm_kisan       → PM Kisan, PM-Kisan, Kisan Samman Nidhi, farmer money, kisan paisa
- e_shram        → e-Shram, eShram, labour card, shramik card, worker registration
- epfo           → EPFO, PF, provident fund, EPF, employee provident
- widow_pension  → widow pension, vidhwa pension, old age pension, vridha pension
- ayushman_bharat → Ayushman, Ayushman Bharat, PMJAY, health card, ayushman card, golden card, pmjay
- ration_card    → ration card, PDS, anaj, food card, rashan

INTENT OPTIONS (use EXACTLY these values):
- check_status
- apply_new
- register
- update_details
- download_certificate

RULES:
- scheme MUST be one of: pm_kisan, e_shram, epfo, widow_pension, ayushman_bharat, ration_card
- NEVER return null for scheme — pick the closest match
- If genuinely unclear, pick check_status as intent and set confidence < 0.5
- Respond ONLY with valid JSON, no extra text

EXAMPLES:
"Ayushman Card check" → {"intent":"check_status","scheme":"ayushman_bharat","entities":{},"missing_info":["aadhaar_number"],"confidence":0.95}
"PM Kisan status check karna hai" → {"intent":"check_status","scheme":"pm_kisan","entities":{},"missing_info":["aadhaar_number","mobile_number"],"confidence":0.97}
"e-Shram naya registration" → {"intent":"register","scheme":"e_shram","entities":{},"missing_info":["aadhaar_number","mobile_number"],"confidence":0.95}
"Widow pension nahi aa rahi" → {"intent":"check_status","scheme":"widow_pension","entities":{},"missing_info":["aadhaar_number"],"confidence":0.90}
"Ration card update" → {"intent":"update_details","scheme":"ration_card","entities":{},"missing_info":["aadhaar_number"],"confidence":0.90}
"""

    def __init__(self):
        self.bedrock = None          # boto3 bedrock-runtime client
        self.bedrock_claude = False  # Whether Claude (Marketplace) is usable
        self.openai_client = None

        if USE_BEDROCK and settings.aws_access_key_id:
            try:
                self.bedrock = boto3.client(
                    'bedrock-runtime',
                    region_name=settings.aws_region,
                    aws_access_key_id=settings.aws_access_key_id,
                    aws_secret_access_key=settings.aws_secret_access_key,
                )
                self.model_id = settings.bedrock_llm_model
                self.bedrock_claude = True
                logger.info(f"AWS Bedrock client ready — primary model: {self.model_id}")
            except Exception as e:
                logger.warning(f"Bedrock init failed: {e}")

        if self.bedrock is None and USE_OPENAI and settings.openai_api_key:
            self.openai_client = AsyncOpenAI(api_key=settings.openai_api_key)
            logger.info("Using OpenAI for intent classification")

        if self.bedrock is None and self.openai_client is None:
            logger.warning("No LLM configured — using enhanced rule-based fallback")

    async def classify(self, text: str, context: str = None) -> Dict[str, Any]:
        """Classify intent + extract entities from user text."""
        try:
            if self.bedrock and self.bedrock_claude:
                # Try Claude (Anthropic via Marketplace) first
                try:
                    result = await self._classify_bedrock(text)
                except Exception as e:
                    if "AccessDeniedException" in str(e) or "INVALID_PAYMENT" in str(e):
                        logger.warning("Claude access denied (payment instrument) — trying Amazon Titan")
                        self.bedrock_claude = False  # Don't retry Claude
                        result = await self._classify_titan(text)
                    else:
                        raise
            elif self.bedrock:  # Claude disabled, Titan still available
                result = await self._classify_titan(text)
            elif self.openai_client:
                result = await self._classify_openai(text)
            else:
                result = self._classify_rules(text)

            # Safety: ensure scheme is never null
            if not result.get("scheme"):
                logger.warning(f"LLM returned null scheme for: '{text}' — applying rule fallback")
                rule_result = self._classify_rules(text)
                result["scheme"] = rule_result.get("scheme") or SchemeType.PM_KISAN
                result["confidence"] = min(result.get("confidence", 0.6), 0.7)

            # Validate enum values
            valid_schemes = {s.value for s in SchemeType}
            valid_intents = {i.value for i in IntentType}
            
            # Extract string value if it's an Enum object
            current_scheme = result.get("scheme")
            scheme_val = current_scheme.value if hasattr(current_scheme, "value") else current_scheme
            
            if scheme_val not in valid_schemes:
                fallback = self._classify_rules(text).get("scheme")
                result["scheme"] = fallback.value if hasattr(fallback, "value") else (fallback or SchemeType.PM_KISAN.value)
            else:
                result["scheme"] = scheme_val

            current_intent = result.get("intent")
            intent_val = current_intent.value if hasattr(current_intent, "value") else current_intent
            if intent_val not in valid_intents:
                result["intent"] = IntentType.CHECK_STATUS.value
            else:
                result["intent"] = intent_val

            return result

        except Exception as e:
            logger.error(f"Intent classification failed: {e}")
            fallback_res = self._classify_rules(text)
            
            # Ensure safe serialization by returning strictly strings for Enums
            fallback_scheme = fallback_res.get("scheme")
            fallback_intent = fallback_res.get("intent")
            
            fallback_res["scheme"] = fallback_scheme.value if hasattr(fallback_scheme, "value") else (fallback_scheme or SchemeType.PM_KISAN.value)
            fallback_res["intent"] = fallback_intent.value if hasattr(fallback_intent, "value") else IntentType.CHECK_STATUS.value
            return fallback_res

    async def _classify_bedrock(self, text: str) -> Dict[str, Any]:
        """Use AWS Bedrock Claude for classification — proper system/user message split."""
        import asyncio
        loop = asyncio.get_event_loop()

        def _invoke():
            payload = {
                "anthropic_version": "bedrock-2023-05-31",
                "max_tokens": 300,
                "temperature": 0.0,
                "system": self.SYSTEM_PROMPT,
                "messages": [
                    {
                        "role": "user",
                        "content": f"Classify this VLE request and respond with JSON only:\n\n\"{text}\""
                    }
                ]
            }
            response = self.bedrock.invoke_model(
                modelId=self.model_id,
                body=json.dumps(payload)
            )
            return json.loads(response['body'].read())

        try:
            result = await loop.run_in_executor(None, _invoke)
        except Exception as e:
            err_str = str(e)
            if "ResourceNotFoundException" in err_str or "have not been granted" in err_str or "use case details" in err_str:
                logger.warning(
                    f"Bedrock model '{self.model_id}' not yet enabled for this account. "
                    "Go to AWS Console → Bedrock → Model Catalog and enable Claude 3 Haiku. "
                    "Falling back to rule-based classification."
                )
                self.bedrock = None   # Disable for future calls so we don't keep retrying
                return self._classify_rules(text)
            raise

        content = result['content'][0]['text'].strip()

        # Strip markdown code fences if present
        content = re.sub(r"^```(?:json)?\s*", "", content)
        content = re.sub(r"\s*```$", "", content)

        parsed = json.loads(content)
        logger.info(f"Bedrock classification: scheme={parsed.get('scheme')}, intent={parsed.get('intent')}, conf={parsed.get('confidence')}")
        return parsed

    async def _classify_titan(self, text: str) -> Dict[str, Any]:
        """
        Use Amazon Titan Express for classification.
        AWS-native model — NO Marketplace subscription required.
        Works with just AWS credentials + credits.
        Model: amazon.titan-text-express-v1
        """
        import asyncio
        loop = asyncio.get_event_loop()

        prompt = (
            f"{self.SYSTEM_PROMPT}\n\n"
            f"User: Classify this VLE request and respond with JSON only:\n\"{text}\"\n\nAssistant:"
        )

        def _invoke_titan():
            payload = {
                "inputText": prompt,
                "textGenerationConfig": {
                    "maxTokenCount": 300,
                    "temperature": 0.0,
                    "topP": 1,
                    "stopSequences": []
                }
            }
            response = self.bedrock.invoke_model(
                modelId="amazon.titan-text-express-v1",
                body=json.dumps(payload),
                contentType="application/json",
                accept="application/json"
            )
            return json.loads(response['body'].read())

        try:
            result = await loop.run_in_executor(None, _invoke_titan)
            raw = result.get("results", [{}])[0].get("outputText", "").strip()

            # Strip code fences
            raw = re.sub(r"^```(?:json)?\s*", "", raw)
            raw = re.sub(r"\s*```$", "", raw)

            # Extract JSON object from response
            match = re.search(r"\{.*\}", raw, re.DOTALL)
            if not match:
                raise ValueError(f"No JSON found in Titan response: {raw[:100]}")

            parsed = json.loads(match.group())
            logger.info(f"Titan classification: scheme={parsed.get('scheme')}, intent={parsed.get('intent')}")
            return parsed

        except Exception as e:
            logger.warning(f"Titan classification failed: {e} — falling back to rules")
            return self._classify_rules(text)

    async def _classify_openai(self, text: str) -> Dict[str, Any]:
        """Use OpenAI for classification."""
        response = await self.openai_client.chat.completions.create(
            model=settings.openai_model,
            messages=[
                {"role": "system", "content": self.SYSTEM_PROMPT},
                {"role": "user", "content": f"Classify this VLE request:\n\n\"{text}\""}
            ],
            temperature=0.0,
            response_format={"type": "json_object"},
            max_tokens=300
        )
        content = response.choices[0].message.content
        parsed = json.loads(content)
        logger.info(f"OpenAI classification: {parsed}")
        return parsed

    def _classify_rules(self, text: str) -> Dict[str, Any]:
        """
        Enhanced rule-based fallback — handles Hindi, Hinglish, English keywords.
        Used when no LLM is available OR as scheme-null safety net.
        """
        t = text.lower()

        # ── Scheme detection ─────────────────────────────────────
        SCHEME_KEYWORDS = {
            SchemeType.AYUSHMAN_BHARAT: [
                "ayushman", "aayushman", "pmjay", "health card", "golden card",
                "ayushman card", "treatment", "hospital", "bimar"
            ],
            SchemeType.PM_KISAN: [
                "pm kisan", "pm-kisan", "kisan", "farmer", "kisaan",
                "samman nidhi", "kisan paisa", "farm"
            ],
            SchemeType.E_SHRAM: [
                "e-shram", "eshram", "e shram", "shram", "labour", "labor",
                "shramik", "worker card", "majdur", "mazdoor", "e-sharam", "sharam"
            ],
            SchemeType.EPFO: [
                "epfo", "provident fund", "pf", "epf", "employee fund"
            ],
            SchemeType.WIDOW_PENSION: [
                "widow", "vidhwa", "pension", "vridha", "old age", "budhapa"
            ],
            SchemeType.RATION_CARD: [
                "ration", "rashan", "pds", "anaj", "food card", "ration card"
            ],
        }

        scheme = None
        for scheme_type, keywords in SCHEME_KEYWORDS.items():
            if any(kw in t for kw in keywords):
                scheme = scheme_type
                break

        # ── Intent detection ──────────────────────────────────────
        intent = IntentType.CHECK_STATUS
        if any(kw in t for kw in ["apply", "naya", "new", "nayi", "register", "registration", "banao", "bana"]):
            intent = IntentType.APPLY_NEW
        elif any(kw in t for kw in ["update", "change", "modify", "badlo", "sahi karo"]):
            intent = IntentType.UPDATE_DETAILS
        elif any(kw in t for kw in ["download", "certificate", "proof", "print", "nikalo"]):
            intent = IntentType.DOWNLOAD_CERTIFICATE

        # ── Missing info defaults per scheme ─────────────────────
        missing: list = []
        if scheme in (SchemeType.PM_KISAN, SchemeType.E_SHRAM, SchemeType.WIDOW_PENSION):
            missing = ["aadhaar_number", "mobile_number"]
        elif scheme == SchemeType.AYUSHMAN_BHARAT:
            missing = ["aadhaar_number"]
        elif scheme == SchemeType.EPFO:
            missing = ["uan_number", "mobile_number"]
        elif scheme == SchemeType.RATION_CARD:
            missing = ["ration_card_number", "mobile_number"]

        conf = 0.75 if scheme else 0.4
        logger.info(f"Rule-based classification: scheme={scheme}, intent={intent}, conf={conf}")

        return {
            "intent": intent,
            "scheme": scheme,
            "entities": {},
            "missing_info": missing,
            "confidence": conf
        }
