# Design Document: GramSetu
## Sovereign Agentic Infrastructure for Last-Mile Public Service Delivery

## 1. Executive Architecture Overview

GramSetu implements a **four-pillar autonomous agent architecture** designed for hackathon execution with parallel development. The system transforms "read-only" government portals into "read-write" APIs through visual navigation, enabling 10x VLE productivity increase.

### 1.1 Core Design Principles

1. **Visual Navigation Over DOM Parsing**: Screenshot-based navigation using multimodal LLMs (immune to portal changes)
2. **Mock Portal Strategy**: Development independence through S3-hosted portal clones
3. **Human-in-the-Loop at Checkpoints**: Autonomous navigation with VLE approval for critical actions (CAPTCHA, OTP, submission)
4. **Privacy-by-Design**: Edge-based Aadhaar masking before any cloud processing
5. **Offline-First**: Job queue architecture with burst sync and state persistence
6. **Event-Driven Architecture**: Redis pub/sub for inter-service communication
7. **API-Contract-First**: Parallel development through predefined JSON schemas

### 1.2 Technology Stack

| Layer | Technology | Justification |
|-------|-----------|---------------|
| Voice Interface | Bhashini ASR/TTS/NMT | Sovereign AI, 11+ Indian languages |
| Intent Extraction | Llama-3-8B via Bedrock | Local dialect understanding |
| Visual Navigation | Claude 3.5 Sonnet + AgentCore | Screenshot analysis, resilient to DOM changes |
| Browser Automation | AWS Bedrock Browser Tool | Managed, secure remote browser |
| Document OCR | AWS Textract + OpenCV | Intelligent extraction + edge masking |
| Message Bus | Redis + Socket.io | Real-time updates, job queuing |
| Backend API | FastAPI | High performance, async support |
| Mobile App | React Native + RxDB | Offline-first, cross-platform |
| Notifications | WhatsApp Business API (Twilio) | Citizen reach, 95%+ penetration |
| Mock Portals | S3 + CloudFront | Static hosting, development independence |

---

## 2. Four-Pillar Architecture

### Architecture Diagram

```mermaid
graph TB
    subgraph "Edge Layer (VLE Mobile)"
        MobileApp[React Native App]
        EdgeMasker[Aadhaar Masker - OpenCV]
        OfflineDB[RxDB - Offline Queue]
        Camera[Camera + Audio]
    end
    
    subgraph "Gateway Layer - Member 1"
        VoiceAPI[/api/v1/ingress/voice]
        Bhashini[Bhashini ASR/NMT/TTS]
        IntentExtractor[Llama-3-8B Intent Extraction]
        DialectMapper[Regional Dialect Mapper]
    end
    
    subgraph "Platform Layer - Member 4"
        JobQueue[Redis Job Queue]
        JobAPI[/api/v1/jobs/*]
        StateManager[Session State Manager]
        WhatsAppAPI[WhatsApp Notifications]
        EventBus[Socket.io Event Bus]
    end
    
    subgraph "Security Layer - Member 3"
        DocAPI[/api/v1/ingress/document]
        OCREngine[AWS Textract]
        CrossVerify[/api/v1/identity/cross-verify]
        OutputVerify[/api/v1/verify/output]
        ConsentMgr[Consent Manager]
    end
    
    subgraph "Automation Layer - Member 2"
        AgentAPI[/api/v1/agent/execute]
        BedrockAgent[AWS Bedrock Agent]
        VisualNav[Claude 3.5 Sonnet]
        BrowserTool[AgentCore Browser Tool]
        MockPortal[S3 Mock Portal]
        PortalSwitcher[Portal Mode Switcher]
    end
    
    subgraph "External Systems"
        LivePortals[Government Portals]
    end
    
    Camera --> EdgeMasker
    EdgeMasker --> MobileApp
    MobileApp --> VoiceAPI
    MobileApp --> DocAPI
    MobileApp --> JobAPI
    
    VoiceAPI --> Bhashini
    Bhashini --> IntentExtractor
    IntentExtractor --> DialectMapper
    DialectMapper --> JobQueue
    
    DocAPI --> OCREngine
    OCREngine --> CrossVerify
    CrossVerify --> JobQueue
    
    JobQueue --> AgentAPI
    JobQueue --> EventBus
    EventBus --> MobileApp
    
    AgentAPI --> BedrockAgent
    BedrockAgent --> VisualNav
    VisualNav --> BrowserTool
    BrowserTool --> PortalSwitcher
    
    PortalSwitcher -->|production| LivePortals
    PortalSwitcher -->|mock| MockPortal
    
    BrowserTool --> OutputVerify
    OutputVerify --> WhatsAppAPI
    
    StateManager --> OfflineDB
    
    style BedrockAgent fill:#ff9
    style VisualNav fill:#ff9
    style EdgeMasker fill:#f99
    style JobQueue fill:#9f9
```

---

## 3. Feature Stream I: Gateway Architect (Member 1)

### 3.1 Objective
Convert noisy vernacular voice into structured job requests with 90%+ intent accuracy.

### 3.2 Processing Pipeline

```
Raw Audio → Noise Suppression (RNNoise) → VAD (Silero) → Bhashini ASR (Hindi/Tamil/etc.) → 
Bhashini NMT (→ English) → Llama-3-8B (Intent Classification) → Dialect Mapping → 
Phonetic Matching → Structured Job Request
```

### 3.3 Implementation Details

**Noise Suppression (Edge)**
- RNNoise library on mobile before upload
- Reduces WER (Word Error Rate) by 30-40% in CSC environments

**Bhashini Integration**
```python
# Pipeline API call structure
{
  "pipelineTasks": [
    {"taskType": "asr", "config": {"language": {"sourceLanguage": "hi"}}},
    {"taskType": "translation", "config": {"language": {"sourceLanguage": "hi", "targetLanguage": "en"}}}
  ],
  "inputData": {"audio": [{"audioContent": "base64_audio"}]}
}
```

**Intent Extraction Prompt**
```
System: You are an Indian government scheme intent classifier.
User: "{translated_text}" 
State: {geolocation_state}

Output JSON:
{
  "intent": "check_beneficiary_status | start_application | upload_document | ...",
  "scheme": "pm_kisan | e_shram | nrega | ...",
  "entities": {"name": "...", "field": "..."},
  "missing_info": ["aadhaar_number", ...]
}
```

**Dialect Mapping**
```json
{
  "bhojpuri_mappings": {
    "kagaz": {"hindi": "दस्तावेज़", "context": "document"},
    "paisa": {"hindi": "पैसा", "context": "money/payment"}
  },
  "marathi_mappings": {
    "7/12": {"standard": "land_record", "state": "Maharashtra"}
  }
}
```

**Phonetic Matching Algorithm**
```python
def match_name(voice_name, document_name):
    # Levenshtein distance
    leven_score = levenshtein(voice_name, document_name)
    
    # Indic Soundex
    soundex_match = indic_soundex(voice_name) == indic_soundex(document_name)
    
    # Weighted scoring
    if soundex_match and leven_score < 3:
        return 95  # High confidence match
    elif soundex_match:
        return 85  # Phonetic match with spelling variation
    elif leven_score < 5:
        return 75  # Partial match
    else:
        return 50  # Low match
```

### 3.4 API Contract

**Endpoint**: `POST /api/v1/ingress/voice`

**Request:**
```json
{
  "audio_base64": "UklGRiQAAABXQVZFZm10...",
  "geolocation": {"state": "Bihar", "district": "Gaya"},
  "vle_id": "VLE_12345",
  "timestamp": "2024-02-13T10:30:00Z"
}
```

**Response:**
```json
{
  "job_request": {
    "intent": "check_beneficiary_status",
    "scheme": "pm_kisan",
    "entities": {"name_phonetic": "Ramesh Kumar", "state": "Bihar"},
    "missing_info": ["aadhaar_number"],
    "confidence": 0.92
  },
  "audio_metadata": {"duration_ms": 4500, "language_detected": "hindi"}
}
```

---

## 4. Feature Stream II: Automation Architect (Member 2)

### 4.1 Objective
Execute autonomous visual navigation with session recovery and mock portal fallback.

### 4.2 Visual Navigation Strategy

**The "Insane" Core: Screenshot-Based Navigation**

Traditional approach (RPA):
```python
driver.find_element(By.ID, "ctl00_ContentPlaceHolder1_txtAadhaar")  # Breaks on DOM changes
```

GramSetu approach (Visual):
```python
# 1. Capture screenshot
screenshot = browser.screenshot()

# 2. Send to Claude 3.5 Sonnet
prompt = f"""
Analyze this government portal screenshot.
Task: Find the text input field for "Aadhaar Number"
Return JSON: {{"x": pixel_x, "y": pixel_y, "confidence": 0.0-1.0}}
"""
response = claude_vision(screenshot, prompt)

# 3. Execute human-like click
browser.mouse_move(response.x, response.y)
browser.click()
```

**Benefits:**
- Immune to `id`, `class`, `xpath` changes
- Works with obfuscated DOM, iframes, shadow DOMs
- Handles visual CAPTCHAs (pause for VLE)

### 4.3 Mock Portal Infrastructure

**Why Mock Portals?**
1. Government sites go down at night (common during demos)
2. Some portals block cloud IPs (AWS ranges)
3. Development velocity (no wait for slow servers)

**Implementation:**
```bash
# Clone live portal
wget --mirror --convert-links --adjust-extension --page-requisites \
  --no-parent https://pmkisan.gov.in/BeneficiaryStatus.aspx

# Upload to S3
aws s3 sync ./pmkisan.gov.in s3://gramsetu-mock-portals/pm-kisan/
aws cloudfront create-distribution --default-root-object index.html
```

**Portal Switcher Logic:**
```python
def get_portal_url(scheme, mode):
    if mode == "development":
        return "https://mock.gramsetu.in/pm-kisan"
    elif mode == "production":
        try:
            response = requests.get("https://pmkisan.gov.in/health", timeout=3)
            if response.status_code == 200:
                return "https://pmkisan.gov.in"
        except:
            logger.warn("Live portal unreachable, falling back to mock")
    
    return "https://mock.gramsetu.in/pm-kisan"  # Fallback
```

### 4.4 Session Recovery

**Problem:** Portal session expires after 5 minutes, form data lost.

**Solution:** State caching + auto-resume
```python
# Cache state every action
session_state = {
    "job_id": "pmk_001",
    "current_url": "https://pmkisan.gov.in/page2.aspx",
    "filled_fields": {
        "txtName": "Ramesh Kumar",
        "txtState": "Bihar"
    },
    "pending_steps": ["fill_bank_details", "upload_document", "submit"]
}
redis.setex(f"session:{job_id}", ttl=86400, json.dumps(session_state))

# On session timeout detection
if detect_session_expired_modal(screenshot):
    state = redis.get(f"session:{job_id}")
    browser.navigate(portal_login_url)
    browser.fill_form(login_credentials)
    browser.navigate(state["current_url"])
    # Resume from exact point
    for field, value in state["filled_fields"].items():
        browser.fill(field, value)
```

### 4.5 Error Classification

```python
class ErrorClassifier:
    RECOVERABLE = ["session_timeout", "network_timeout", "element_loading_delay"]
    FATAL = ["invalid_credentials", "form_validation_error", "server_500"]
    MOCKABLE = ["connection_refused", "dns_resolution_failed", "http_502_503_504"]
    
    def handle_error(self, error):
        if error in self.RECOVERABLE:
            return {"action": "retry", "max_attempts": 2, "backoff": "exponential"}
        elif error in self.MOCKABLE:
            return {"action": "switch_to_mock"}
        else:  # FATAL
            return {"action": "escalate_to_vle", "message": f"Unable to proceed: {error}"}
```

### 4.6 API Contract

**Endpoint**: `POST /api/v1/agent/execute`

**Request:**
```json
{
  "job_id": "pmk_2024_02_13_001",
  "target_portal": "pm_kisan",
  "mode": "production",
  "form_data": {
    "aadhaar_masked": "xxxx-xxxx-1234",
    "name": "Ramesh Kumar",
    "state": "Bihar"
  },
  "intent": "check_beneficiary_status"
}
```

**Response:**
```json
{
  "job_id": "pmk_2024_02_13_001",
  "status": "completed",
  "result": {
    "beneficiary_status": "Amount credited on 2024-02-01",
    "screenshot_ref": "s3://screenshots/ack.png",
    "acknowledgment_id": "PMK/2024/887766"
  },
  "execution_log": [
    {"step": "navigate_login", "duration_ms": 2300, "screenshot": "s3://..."},
    {"step": "fill_form", "duration_ms": 4500, "screenshot": "s3://..."}
  ]
}
```

---

## 5. Feature Stream III: Security Architect (Member 3)

### 5.1 Objective
Privacy-preserving document processing with 100% Aadhaar masking accuracy and cross-verification.

### 5.2 Edge-Based Aadhaar Masking

**The "Edge Redactor" (Mobile-Side Processing)**

```python
# React Native mobile app - BEFORE upload
import cv2

def mask_aadhaar_on_device(image_path):
    # 1. Load image
    img = cv2.imread(image_path)
    
    # 2. Detect Aadhaar card (aspect ratio 3.37:2.13)
    contours = cv2.findContours(img, cv2.RETR_EXTERNAL)
    aadhaar_card = filter_by_aspect_ratio(contours, target=1.58)
    
    # 3. OCR for 12-digit number detection
    text = pytesseract.image_to_string(img)
    aadhaar_pattern = r'\b\d{4}\s?\d{4}\s?\d{4}\b'
    matches = re.findall(aadhaar_pattern, text)
    
    # 4. Validate with Verhoeff checksum
    for match in matches:
        if verify_verhoeff(match):
            # 5. Mask middle 8 digits
            masked = f"{match[:4]}-XXXX-XX{match[-2:]}"
            
            # 6. Blur on image
            bbox = find_text_bbox(img, match)
            img[bbox.y:bbox.y+bbox.h, bbox.x:bbox.x+bbox.w] = \
                cv2.GaussianBlur(img[bbox.y:bbox.y+bbox.h, bbox.x:bbox.x+bbox.w], (51, 51), 0)
    
    # 7. Return masked image (never upload original)
    return img, masked
```

**Compliance Win:** Cloud infrastructure never receives unmasked Aadhaar → DPDP Act compliant by design.

### 5.3 Cross-Verification Engine

**Fuzzy Matching Between Voice and OCR Data**

```python
def cross_verify(voice_data, document_data):
    scores = {}
    
    # Name matching
    scores['name'] = fuzzy_match_name(
        voice_data['name'], 
        document_data['name']
    )
    
    # Aadhaar last 4 digits (if spoken)
    if 'aadhaar_last4' in voice_data:
        scores['aadhaar'] = 100 if voice_data['aadhaar_last4'] == document_data['aadhaar_masked'][-4:] else 0
    
    # Weighted aggregate
    overall_score = (scores['name'] * 0.7) + (scores.get('aadhaar', 100) * 0.3)
    
    # Decision matrix
    if overall_score >= 95:
        return {"action": "AUTO_APPROVE", "score": overall_score}
    elif 80 <= overall_score < 95:
        return {"action": "PROCEED_WITH_FLAG", "score": overall_score, "alert": "Minor discrepancy"}
    elif 70 <= overall_score < 80:
        return {"action": "VLE_REVIEW", "score": overall_score, "alert": "Manual verification required"}
    else:
        return {"action": "BLOCK", "score": overall_score, "alert": "Significant mismatch"}
```

### 5.4 Output Verification

**Validate Agent Results Against Original Documents**

```python
def verify_output(agent_screenshot, original_document_data):
    # 1. OCR the acknowledgment screenshot
    ack_text = textract.detect_document_text(agent_screenshot)
    
    # 2. Template matching (is this a valid acknowledgment page?)
    template_match_score = match_template(agent_screenshot, "pm_kisan_ack_template.png")
    
    if template_match_score < 0.9:
        return {"status": "FAIL", "reason": "Screenshot doesn't match acknowledgment template"}
    
    # 3. Extract key fields
    extracted = {
        "name": extract_field(ack_text, pattern="Beneficiary Name: (.+)"),
        "application_id": extract_field(ack_text, pattern="Application ID: ([A-Z0-9]+)")
    }
    
    # 4. Round-trip verification
    if extracted['name'].lower() != original_document_data['name'].lower():
        return {"status": "FAIL", "reason": "Name mismatch"}
    
    # 5. PII exposure check
    if re.search(r'\b\d{4}\s?\d{4}\s?\d{4}\b', ack_text):  # Unmasked Aadhaar detected
        return {"status": "FAIL", "reason": "PII exposure detected"}
    
    return {"status": "PASS", "checks": {"template_match": template_match_score, "data_integrity": True}}
```

### 5.5 API Contracts

**1. Document Ingress**: `POST /api/v1/ingress/document`
**2. Cross-Verification**: `POST /api/v1/identity/cross-verify`
**3. Output Verification**: `POST /api/v1/verify/output`
**4. Consent Recording**: `POST /api/v1/consent/record`

(See requirements.md for full JSON schemas)

---

## 6. Feature Stream IV: Platform Architect (Member 4)

### 6.1 Objective
Event-driven orchestration with offline resilience and real-time VLE updates.

### 6.2 Asynchronous Job Queue Architecture

**Why Async?** Government portals take 30+ seconds to respond. Synchronous = frozen UI.

**Redis + Socket.io Architecture:**

```python
# Job creation
@app.post("/api/v1/jobs/create")
async def create_job(job_request):
    job_id = generate_uuid()
    
    # 1. Persist to Redis
    await redis.hset(f"job:{job_id}", mapping={
        "status": "queued",
        "vle_id": job_request.vle_id,
        "scheme": job_request.scheme,
        "created_at": datetime.utcnow().isoformat()
    })
    
    # 2. Publish to job queue
    await redis.lpush("job_queue", job_id)
    
    # 3. Emit real-time event
    await socketio.emit("job:created", {
        "job_id": job_id,
        "status": "queued",
        "queue_position": await redis.llen("job_queue")
    }, room=job_request.vle_id)
    
    return {"job_id": job_id, "status": "queued"}

# Worker process (picks jobs)
async def job_worker():
    while True:
        job_id = await redis.brpop("job_queue", timeout=0)
        
        # Update status
        await redis.hset(f"job:{job_id}", "status", "processing")
        await socketio.emit("job:update", {"job_id": job_id, "status": "processing"})
        
        # Execute via Member 2's agent
        result = await call_agent_execute(job_id)
        
        # Final status
        await redis.hset(f"job:{job_id}", "status", result.status)
        await socketio.emit("job:completed", {"job_id": job_id, "result": result})
```

### 6.3 Offline Burst Sync

**Mobile App Strategy:**
```javascript
// React Native with RxDB
const offlineQueue = await db.offline_jobs.find().exec();

// When connectivity detected
window.addEventListener('online', async () => {
    const response = await fetch('/api/v1/sync/offline', {
        method: 'POST',
        body: JSON.stringify({
            vle_id: currentVLE.id,
            offline_jobs: offlineQueue.map(job => ({
                offline_job_id: job.id,
                collected_at: job.timestamp,
                voice_audio_ref: job.audio_file_path,
                document_images: job.document_paths,
                intent: job.intent
            }))
        })
    });
    
    // Map offline IDs to cloud IDs
    response.synced_jobs.forEach(sync => {
        db.offline_jobs.findOne(sync.offline_job_id).update({
            $set: { cloud_job_id: sync.job_id, synced: true }
        });
    });
});
```

### 6.4 WhatsApp Integration

```python
from twilio.rest import Client

async def send_whatsapp_notification(citizen_phone, job_result):
    message_body = f"""
नमस्ते {job_result.citizen_name}जी,

आपका {job_result.scheme_name} आवेदन सफलतापूर्वक जमा हो गया है।

Application ID: {job_result.ack_id}
Status: Submitted

Acknowledgment: [attached screenshot]
    """
    
    client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
    
    message = client.messages.create(
        from_='whatsapp:+14155238886',
        body=message_body,
        to=f'whatsapp:+91{citizen_phone}',
        media_url=[job_result.screenshot_url]
    )
    
    await audit_log("whatsapp_sent", {
        "job_id": job_result.job_id,
        "message_sid": message.sid,
        "citizen_phone": hash_phone(citizen_phone)
    })
```

### 6.5 State Persistence Schema

**Redis Session State:**
```json
{
  "job_id": "pmk_2024_02_13_001",
  "status": "agent_executing",
  "current_step": "form_page_2",
  "collected_data": {
    "name": "Ramesh Kumar",
    "aadhaar_masked": "xxxx-xxxx-1234",
    "state": "Bihar"
  },
  "portal_state": {
    "current_url": "https://pmkisan.gov.in/beneficiary.aspx",
    "filled_fields": {"txtName": "Ramesh Kumar"},
    "session_cookies": "encrypted_cookie_jar"
  },
  "error_history": [
    {"timestamp": "2024-02-13T10:31:22Z", "error": "session_timeout", "recovered": true, "retry_count": 1}
  ],
  "consent_record": "s3://consent/audio_hash_001.wav",
  "ttl": 86400
}
```

---

## 7. Compliance & Privacy Architecture

### 7.1 DPDP Act 2023 Compliance Matrix

| Requirement | Implementation | Verification |
|-------------|----------------|--------------|
| Consent | Voice recording + SHA-256 hash | Audit log entry |
| Data Minimization | Collect only required fields per scheme | Schema validation |
| Purpose Limitation | Data used only for stated scheme | Access control |
| Storage Limitation | Delete docs after 5 min, logs after 90 days | TTL policies |
| Data Localization | All servers in AWS ap-south-1 (Mumbai) | Infrastructure audit |
| Right to Access | VLE can request citizen data export | API endpoint |
| Right to Deletion | Citizen can request data deletion | Cascade delete |
| Audit Trail | Immutable log with 7-year retention | Cryptographic signing |

### 7.2 Aadhaar Masking Enforcement

**Multiple Layers:**
1. **Edge**: Mobile app masks before upload (OpenCV)
2. **Cloud**: API gateway rejects unmasked Aadhaar (regex validation)
3. **Display**: UI always shows masked version
4. **Logs**: Audit logs exclude Aadhaar entirely
5. **Screenshots**: Auto-blur Aadhaar regions before storage

### 7.3 Audit Trail Schema

```json
{
  "log_id": "uuid",
  "timestamp": "2024-02-13T10:30:15.234Z",
  "session_id": "uuid",
  "vle_id": "sha256_hash",
  "event_type": "INTENT_CONFIRMED",
  "event_data": {
    "intent": "START_APPLICATION",
    "scheme": "PM-KISAN",
    "confidence": 0.92
  },
  "ip_address": "hashed",
  "signature": "RSA_signature"
}
```

---

## 8. Deployment Architecture

### 8.1 AWS Infrastructure

```yaml
Infrastructure:
  Compute:
    - AWS Bedrock Agents (serverless agent runtime)
    - ECS Fargate (FastAPI backend, auto-scaling)
    - Lambda (event handlers, webhooks)
  
  Storage:
    - S3 (mock portals, screenshots, consent artifacts)
    - ElastiCache Redis (job queue, session state)
    - RDS PostgreSQL (knowledge base, consent records)
    - DocumentDB (audit logs - MongoDB compatible)
  
  Networking:
    - CloudFront (mock portal CDN, edge caching)
    - API Gateway (rate limiting, WAF)
    - VPC (isolated network for browser agents)
  
  Security:
    - KMS (encryption key management)
    - Secrets Manager (API keys, credentials)
    - IAM (role-based access control)
    - WAF (DDoS protection, bot detection)
  
  Monitoring:
    - CloudWatch (metrics, logs, alarms)
    - X-Ray (distributed tracing)
    - SNS (alert notifications)
```

### 8.2 Scaling Strategy

| Component | Scaling Trigger | Target |
|-----------|----------------|--------|
| FastAPI Backend | CPU > 70% | 2x instances |
| Job Workers | Queue depth > 100 | +5 workers |
| Redis | Memory > 80% | Vertical scale |
| Agent Browsers | Active sessions > 1000 | +10 browser instances |

---

## 9. 24-Hour Hackathon Execution Plan

### Hour-by-Hour Breakdown

| Time | Member 1 | Member 2 | Member 3 | Member 4 |
|------|----------|----------|----------|----------|
| 00-04 | Bhashini integration + mock data | Playwright setup + mock portal | OpenCV masking script | FastAPI boilerplate + API contracts |
| 04-08 | Intent extraction + dialect map | Visual navigation logic | Textract integration | Job queue + Redis setup |
| 08-12 | Live Bhashini + phonetic matching | Live portal navigation | Cross-verify engine | Mobile app UI + offline DB |
| 12-16 | TTS feedback + optimization | Session recovery + error handling | Output verification | WhatsApp integration |
| 16-20 | **Integration testing** | **Integration testing** | **Integration testing** | **Integration testing** |
| 20-24 | Demo script prep | Portal switcher polish | Compliance slide deck | Dashboard + pitch deck |

### Critical Path

1. **Hour 4**: All API contracts finalized with mock data
2. **Hour 12**: All services exposing real endpoints
3. **Hour 16**: End-to-end integration working
4. **Hour 20**: Production-ready demo

---

## 10. Key Technical Decisions

### Decision Log

| Decision | Rationale | Trade-off |
|----------|-----------|-----------|
| Visual navigation over DOM parsing | Resilient to portal changes | Higher latency (2-3s per action) |
| Mock portals for development | Independence from live sites | Requires maintenance on portal updates |
| Edge-based Aadhaar masking | DPDP compliance by design | Mobile app complexity |
| Redis for job queue | Simple, fast, proven | Single point of failure (mitigate with Redis Sentinel) |
| WhatsApp over SMS | 95% penetration, media support | Requires business API approval |
| Async job queue over sync API | Better UX, scalability | Complexity in state management |
| React Native over Flutter | Team familiarity, ecosystem | Performance slightly lower |

---

**Document Version**: 2.0  
**Alignment**: Full alignment with agentic infrastructure requirements  
**Status**: Hackathon-Ready
