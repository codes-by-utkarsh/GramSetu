# GramSetu: Sovereign Agentic Infrastructure for Last-Mile Public Service Delivery

> **"From Information to Agency"** - An autonomous, voice-first, multimodal agentic system for rural India's digital transformation.

GramSetu (Village Bridge) transforms legacy government portals from "read-only" information sources into "read-write" APIs accessible through vernacular voice commands. It empowers Village Level Entrepreneurs (VLEs) at Common Service Centres (CSCs) to process complex government applications in seconds, not minutes.

---

## 🏗️ Master Architecture Overview

The codebase is structured around a four-pillar, microservice-based autonomous agent architecture designed to run on **AWS Infrastructure**. All core microservices expose REST APIs via **FastAPI**, with **React** (Vite) powering the VLE-facing frontend and inter-service communication secured via defined Pydantic `shared/schemas.py`.

### The 4 Pillars (Microservices)

#### 1. 🎤 Voice Interface Service (Member 1 - Port `8001`)
- **Location**: `services/voice/`
- **Responsibilities**: Converting vernacular voice (Hindi/Regional) into structured job requests.
- **Key Tech**: 
  - **AWS Transcribe**: Replaced Bhashini as the primary ASR (Automatic Speech Recognition) engine.
  - **AWS Translate**: Converts regional transcripts to English.
  - **Intent Classification**: Uses LLMs (`Claude Haiku`) to classify the user's intent (e.g., `CHECK_STATUS`, `APPLY_NEW`), identifying the target scheme (e.g., `pm_kisan`).
- **Core Endpoints**:
  - `POST /process-audio`: Takes Base64 audio, applies noise suppression, transcribes, translates, and returns a structured `VoiceOutput` including extrapolated intent, missing info, and confidence scores.
  - `POST /classify-text`: Fallback/text-only intent classification endpoint.

#### 2. 🤖 Browser Agent Service (Member 2 - Port `8002`)
- **Location**: `services/agent/`
- **Responsibilities**: Autonomous web navigation employing a "Visual Navigation over DOM manipulation" approach.
- **Key Tech**:
  - **AWS Bedrock Agents**: Core orchestrator integrating with Claude 3.5 Sonnet.
  - **Visual Navigator (Playwright)**: Takes screenshots and feeds them to the Vision LLM to return `x`, `y` interaction coordinates. This makes the bot completely immune to HTML/DOM changes!
  - **Captcha Solving**: Solves logic and visual CAPTCHAs.
  - **Session Manager**: Caches browser session states to seamlessly recover from 5-minute government portal timeouts.
- **Core Endpoints**:
  - `POST /execute-task`: Initiates navigation routing to the specific portal driver. Triggers real-time callbacks to Orchestrator upon completion.

#### 3. 🔒 Trust & Document Processing Service (Member 3 - Port `8003`)
- **Location**: `services/document/`
- **Responsibilities**: Privacy-preserving OCR and Document verification. Fully **DPDP Act 2023 Compliant**.
- **Key Tech**:
  - **Edge Aadhaar Masking**: OpenCV actively targets and blurs the first 8 digits of Aadhaar cards before processing.
  - **AWS Textract**: The extraction engine for robust details pulling.
  - **S3 Secure Storage**: AES256 encrypted storage with short lifecycles (ephemeral storage).
- **Core Endpoints**:
  - `POST /process-document`: Receives Base64 document images. Masks PII if it's an Aadhaar, runs OCR, cross-verifies data authenticity, uploads a secure version to S3, and returns extracted fields.

#### 4. 🧠 System Orchestrator Service (Member 4 - Port `8000`)
- **Location**: `services/orchestrator/`
- **Responsibilities**: The central API Gateway, state manager, offline-sync burst handler, and the human-in-the-loop bridge.
- **Key Tech**:
  - **PostgreSQL / Redis**: Persistent storage and job queue management.
  - **WebSockets**: Real-time push notifications straight to VLE devices.
  - **Twilio (WhatsApp Business API)**: Sends automated, verified updates to citizen's WhatsApp directly regarding their application status.
- **Core Endpoints**:
  - **Auth**: `POST /auth/signup`, `POST /auth/login` for VLE management.
  - **Beneficiaries**: `POST /beneficiaries`, `GET /beneficiaries/{vle_phone}`.
  - **Jobs Queue**: `POST /jobs`, `GET /jobs/{job_id}/log` tracking execution steps.
  - **WebSockets**: `ws://{host}/ws/{vle_phone}` for real-time progress bars.
  - **WhatsApp Output**: Automatic `POST /internal/jobs/update-status` triggers delivery of WhatsApp PDF receipts and congratulations to citizens.

#### 5. 💻 GramSetu Web/Mobile App
- **Location**: `gramsetu_website/`, `mobile_app_work/`
- **Responsibilities**: Displaying the human-friendly VLE dashboard.
- **Key Tech**: React 19, Vite, Tailwind (Assumed based on CSS), Context/Hooks. Connects deeply to the Orchestrator via WebSockets.

---

## 🔐 Schemas & Communication Protocol (`shared/schemas.py`)

Inter-service communication heavily leans on strictly typed Pydantic models to ensure resilience:
- **`JobStatus`**: State tracker ranging from `QUEUED` ➔ `PROCESSING` ➔ `WAITING_FOR_INPUT` (human-in-the-loop) ➔ `COMPLETED`/`FAILED`.
- **`SchemeType`**: Target schemes mapped (e.g., `PM_KISAN`, `E_SHRAM`, `EPFO`).
- **`IntentType`**: Maps desired action (`CHECK_STATUS`, `APPLY_NEW`).
- **`DocumentOutput`**: Secure packaging with validation warnings limit and masked S3 bucket URLs.

Configuration is globally centralized in `shared/config.py`, powered by `pydantic_settings`.

---

## 🚀 Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+
- Active AWS Account (Bedrock access, S3, Textract, Transcribe)
- Twilio / Meta WhatsApp API Auth Tokens
- Redis server + PostgreSQL running on `localhost`

### Installation & Environment

1. **Clone & Install Backend Dependencies**
```bash
git clone <repository-url>
cd GramSetu
pip install -r requirements.txt
```

2. **Setup ENV Configuration**
Create a `.env` file referencing `.env.example`. Make sure you insert keys for AWS (`aws_access_key_id`, `aws_secret_access_key`), OpenAI/Anthropic/Bhashini fallback, Twilio, Postgres, and Redis credentials.

3. **Start Core Services Individually (Development)**
```bash
# Terminal 1 - The Orchestrator Brain
python -m services.orchestrator.main

# Terminal 2 - Voice & ASR 
python -m services.voice.main

# Terminal 3 - Visual Browser Agent
python -m services.agent.main

# Terminal 4 - Document & Security 
python -m services.document.main
```

4. **Start the React VLE Dashboard**
```bash
cd gramsetu_website
npm install
npm run dev
```

---

## 🔒 Privacy & System Compliance

GramSetu is built exactly to the specification of the **Digital Personal Data Protection (DPDP) Act 2023**:
1. **Consent Generation**: Verbal consent recorded via Audio Hashes (`ConsentRecord`).
2. **Data Minimization & Localization**: Edge Aadhaar truncation ensures primary Cloud providers never ingest full 12-digit blocks.
3. **Ephemeral Storage**: Transient artifacts persist via Redis caching. Documents hit a strict 24-hour AWS S3 lifecycle deletion policy.

---

**Built with ❤️ for Bharat's 900 million rural citizens**
