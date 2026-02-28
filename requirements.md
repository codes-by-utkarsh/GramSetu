<<<<<<< HEAD
# Requirements Document: GramSetu
## Sovereign Agentic Infrastructure for Last-Mile Public Service Delivery

## 1. Introduction

### 1.1 Executive Vision

GramSetu (Village Bridge) represents a paradigmatic shift from **Informational AI to Agentic AI** in India's digital governance landscape. While existing solutions like Jugalbandi excel at retrieving information, they fail to address the critical **Action Gap** - the inability to perform complex, multi-step actions required to actually apply for government schemes.

GramSetu is an **autonomous, voice-first, multimodal agentic infrastructure** capable of navigating legacy government websites exactly as a human would - seeing the screen, clicking buttons, typing text - driven entirely by vernacular voice commands. This system empowers Village Level Entrepreneurs (VLEs) at Common Service Centres (CSCs) to process complex applications in seconds rather than minutes, fundamentally altering the economics of rural service delivery.

### 1.2 The "Insane" Proposition

We propose an autonomous system that:
- Navigates legacy portals using **visual web navigation** (multimodal LLMs analyzing screenshots)
- Operates through **vernacular voice commands** in 11+ Indian languages
- Performs **privacy-preserving OCR** with automatic Aadhaar masking at the edge
- Maintains **sovereign AI infrastructure** using Bhashini and AWS Bedrock
- Achieves **10x VLE productivity** increase (₹60/hour → ₹600/hour)
- Operates **offline-first** with intelligent sync and state recovery

### 1.3 Problem Statement: The Action Gap

**Current State:**
- 900 million rural Indians lack access to digital services despite infrastructure availability
- Existing AI chatbots inform citizens of eligibility but cannot complete applications
- Government portals feature hostile UX: aggressive timeouts, English/Sarkari Hindi, complex workflows
- VLEs spend 20 minutes per application due to repetitive form-filling
- Low throughput (3 applications/hour) forces VLEs to charge illicit fees

**The Root Cause:**
The "Read-Only Trap" - Government portals are effectively read-only for target demographics due to:
- Linguistic exclusion (Sanskritized administrative Hindi vs. regional dialects)
- Hostile UX patterns (session timeouts, non-responsive layouts)
- Cognitive overload (15-20 field mapping from physical documents)
- Traditional RPA brittleness (fixed selectors break when DOM changes)

**GramSetu's Solution:**
Transform "read-only" portals into "read-write" APIs through autonomous agents that:
- Navigate visually (immune to DOM changes)
- Understand vernacular voice commands
- Recover from failures intelligently
- Maintain human oversight for accountability

## 2. Goals and Non-Goals

### 2.1 Goals

**Primary Goals:**
1. Enable **autonomous portal navigation** with VLE supervision for critical checkpoints
2. Achieve **10x VLE productivity** increase (3 apps/hour → 30 apps/hour)
3. Support **11+ Indian languages** through Bhashini integration with dialect mapping
4. Implement **privacy-by-design** with edge-based Aadhaar masking
5. Operate **offline-tolerant** with intelligent job queuing and sync
6. Provide **WhatsApp-based citizen notifications** for transparency
7. Maintain **DPDP Act 2023 compliance** with consent capture and audit trails
8. Support **20+ high-impact government schemes** at launch

**Performance Goals:**
- Voice-to-intent latency: < 3 seconds
- Application completion time: 2 minutes (vs. 20 minutes manual)
- Intent recognition accuracy: > 90%
- Aadhaar masking accuracy: 100%
- System uptime: 99.5%
- Offline sync success rate: > 90%

**Economic Goals:**
- VLE hourly revenue: ₹60 → ₹600 (10x increase)
- VLE monthly revenue: ₹12,000 → ₹1,20,000
- Transaction fee: ₹2 per successful application (10% of VLE earnings)
- Freemium model: First 100 transactions free

### 2.2 Non-Goals

1. **NOT** a direct citizen-facing app (VLEs remain essential intermediaries)
2. **NOT** bypassing security measures (CAPTCHA/OTP require VLE intervention)
3. **NOT** storing Aadhaar numbers permanently
4. **NOT** modifying government portal functionality
5. **NOT** 100% autonomous (human-in-the-loop for critical decisions)
6. **NOT** supporting all schemes on day one (phased rollout)

## 3. Stakeholders

### 3.1 Primary Stakeholders
- **Village Level Entrepreneurs (VLEs)**: System operators with 10x productivity gain
- **Rural Citizens**: Beneficiaries receiving faster, error-free service
- **CSC SPV**: Network operator overseeing 5+ lakh CSCs nationwide

### 3.2 Secondary Stakeholders
- **Ministry of Electronics and IT (MeitY)**: Policy oversight and compliance
- **Bhashini Ecosystem**: Multilingual AI infrastructure providers
- **Government Departments**: Portal owners (DARPG, NITI Aayog, State governments)
- **System Administrators**: Technical staff managing deployments
- **Auditors**: DPDP Act compliance verification

## 4. User Personas

### Persona 1: Rajesh - Experienced VLE
- **Location**: Uttar Pradesh, semi-urban CSC
- **Experience**: 5 years, handles 40 citizens daily
- **Current Pain**: Repetitive form-filling, portal changes, time pressure
- **GramSetu Impact**: 40 citizens/day → 120 citizens/day, ₹800/day → ₹2,400/day
- **Key Needs**: Speed, reliability, minimal learning curve

### Persona 2: Lakshmi - New VLE
- **Location**: Tamil Nadu, remote village CSC
- **Experience**: 6 months, handles 15 citizens daily
- **Current Pain**: Portal complexity, language barriers, fear of errors
- **GramSetu Impact**: Confidence boost, error reduction, guided workflows
- **Key Needs**: Clear guidance, error prevention, Tamil language support

### Persona 3: Arjun - High-Volume VLE
- **Location**: Maharashtra, district headquarters CSC
- **Experience**: 8 years, handles 80 citizens daily with assistants
- **Current Pain**: Peak-hour connectivity issues, scaling bottlenecks
- **GramSetu Impact**: 80 citizens/day → 240 citizens/day, team productivity multiplier
- **Key Needs**: Offline resilience, batch processing, multi-session handling

## 5. Glossary

### System Components
- **GramSetu**: Complete agentic infrastructure including all four feature streams
- **Gateway Architect (Member 1)**: Input & Context Layer - vernacular ASR, intent extraction
- **Automation Architect (Member 2)**: Action & Recovery Layer - browser automation, visual navigation
- **Security Architect (Member 3)**: Trust & Verification Layer - OCR, PII masking, cross-verification
- **Platform Architect (Member 4)**: Integration Layer - message bus, state management, UX

### Technical Terms
- **Visual Navigation**: Screenshot-based portal navigation using multimodal LLMs
- **Agent Orchestrator**: AWS Bedrock Agent with AgentCore Browser Tool capability
- **Mock Portal**: Static clone of government portals for development independence
- **Masked_Aadhaar**: Aadhaar with digits 5-12 replaced (NNNN-XXXX-XXNN format)
- **Job Queue**: Asynchronous task queue using Redis with Socket.io for real-time updates
- **Burst Sync**: Offline-to-online synchronization of queued actions
- **Cross-Verification**: Fuzzy matching between voice-transcribed and OCR-extracted data
- **Output Verification**: Validation of agent results against original documents

### Compliance Terms
- **DPDP Act**: Digital Personal Data Protection Act, 2023
- **Consent Artifact**: Cryptographically hashed verbal consent recording
- **Edge Redactor**: On-device Aadhaar masking before cloud upload
- **Audit Trail**: Immutable log of all system actions with 7-year retention

## 6. Four-Pillar Architecture

GramSetu is architected into four tightly integrated feature streams, each owned by a team member with clearly defined API contracts:

### 6.1 Feature Stream I: Gateway Architect (Input & Context Layer)

**Owner**: Member 1  
**Responsibility**: Convert vernacular voice and context into structured job requests

**Key Components:**
- Bhashini ASR integration with pre-processing (RNNoise, Silero VAD)
- Intent extraction using fine-tuned Llama-3-8B via Bedrock
- Dialect mapping (Bhojpuri, Maithili, Marwari regional variations)
- Phonetic matching (Soundex/Metaphone adapted for Indic scripts)

**API Endpoint**: `/api/v1/ingress/voice`

**Request:**
```json
{
  "audio_base64": "...",
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
    "entities": {
      "name_phonetic": "Ramesh Kumar",
      "state": "Bihar"
    },
    "missing_info": ["aadhaar_number"]
  },
  "audio_metadata": {
    "duration_ms": 4500,
    "confidence": 0.92
  }
}
```

### 6.2 Feature Stream II: Automation Architect (Action & Recovery Layer)

**Owner**: Member 2  
**Responsibility**: Execute autonomous portal navigation with visual intelligence

**Key Components:**
- AWS Bedrock Agent with AgentCore Browser Tool
- Visual navigation using Claude 3.5 Sonnet (screenshot analysis)
- Mock Portal infrastructure (S3-hosted clones for development)
- Session recovery and error classification
- Portal switcher (dev/mock/production modes)

**API Endpoint**: `/api/v1/agent/execute`

**Request:**
```json
{
  "job_id": "pmk_2024_02_13_001",
  "target_portal": "pm_kisan",
  "mode": "production",
  "form_data": {
    "aadhaar_number_masked": "xxxx-xxxx-1234",
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
    "screenshot_ref": "s3://screenshots/step_3.png",
    "acknowledgment_id": "PMK/2024/887766"
  },
  "execution_log": [
    {"step": "navigate_login", "duration_ms": 2300},
    {"step": "fill_form", "duration_ms": 4500},
    {"step": "submit", "duration_ms": 1200}
  ]
}
```

**Error Recovery:**
- RECOVERABLE (session timeout, network blip) → Auto-retry
- FATAL (form validation failed, server 500) → Escalate to VLE
- MOCKABLE (live site down) → Switch to mock portal

### 6.3 Feature Stream III: Security Architect (Trust & Verification Layer)

**Owner**: Member 3  
**Responsibility**: Privacy-preserving document processing and verification

**Key Components:**
- Edge-based Aadhaar masking (OpenCV on mobile before upload)
- AWS Textract / BharatOCR for intelligent document processing
- Cross-verification engine (fuzzy matching between voice and OCR data)
- Output verification (screenshot validation, data integrity checks)
- Consent manager with voice recording and hashing
- Fake document detection (Moiré pattern, template matching)

**API Endpoints:**

**1. Document Ingress**: `/api/v1/ingress/document`
```json
{
  "document_image_base64": "...",
  "document_type": "aadhaar",
  "vle_id": "VLE_12345",
  "job_id": "pmk_2024_02_13_001"
}
```

**2. Cross-Verification**: `/api/v1/identity/cross-verify`
```json
{
  "job_id": "pmk_2024_02_13_001",
  "voice_data": {"name": "Ramesh Kumar", "confidence": 0.92},
  "document_data": {"name": "Ramesh Kr.", "aadhaar_masked": "xxxx-xxxx-1234"}
}
```

**Response:**
```json
{
  "cross_verify_score": 88,
  "match_status": "PARTIAL_MATCH",
  "action_required": "PROCEED_WITH_FLAG",
  "discrepancies": [
    {
      "field": "name",
      "voice_value": "Ramesh Kumar",
      "document_value": "Ramesh Kr.",
      "similarity": 88,
      "suggested_action": "log_only"
    }
  ],
  "vle_alert": "Name has minor variation. Please verify quickly."
}
```

**3. Output Verification**: `/api/v1/verify/output`
```json
{
  "verification_status": "PASS",
  "checks": {
    "screenshot_template_match": 0.96,
    "data_integrity": true,
    "pii_exposure": false,
    "field_completeness": 100
  }
}
```

### 6.4 Feature Stream IV: Platform Architect (Integration Layer)

**Owner**: Member 4  
**Responsibility**: Orchestration, state management, and user experience

**Key Components:**
- Redis-based job queue with Socket.io real-time updates
- FastAPI backend with standardized REST endpoints
- React Native VLE mobile app with offline storage
- WhatsApp Business API integration (Twilio)
- Health check registry and heartbeat monitoring
- Offline-first architecture with burst sync

**API Endpoints:**

**1. Job Creation**: `/api/v1/jobs/create`
```json
{
  "job_id": "pmk_2024_02_13_001",
  "status": "queued",
  "queue_position": 2,
  "estimated_wait_sec": 45
}
```

**2. Job Status**: `/api/v1/jobs/status`
```json
{
  "job_id": "pmk_2024_02_13_001",
  "status": "completed",
  "progress": 100,
  "timeline": [
    {"step": "created", "timestamp": "2024-02-13T10:30:00Z"},
    {"step": "voice_processed", "timestamp": "2024-02-13T10:30:05Z"},
    {"step": "document_verified", "timestamp": "2024-02-13T10:30:12Z"},
    {"step": "agent_completed", "timestamp": "2024-02-13T10:31:45Z"}
  ]
}
```

**3. Offline Sync**: `/api/v1/sync/offline`
```json
{
  "synced_jobs": [
    {
      "offline_job_id": "offline_001",
      "job_id": "pmk_2024_02_13_001",
      "status": "queued"
    }
  ]
}
```

## 7. Functional Requirements

### FR-1: Visual Portal Navigation (The "Insane" Core)

**User Story**: As an autonomous agent, I need to navigate government portals by analyzing screenshots rather than parsing HTML, so that I remain resilient to frequent DOM changes.

**Acceptance Criteria:**
1. WHEN navigating a portal, THE Agent SHALL capture screenshots of each page state
2. WHEN analyzing a screenshot, THE Agent SHALL use Claude 3.5 Sonnet to identify interactive elements
3. GIVEN an instruction "Click the blue button that says 'Login'", THE Agent SHALL return pixel coordinates (x, y) for the target element
4. WHEN the DOM structure changes, THE Agent SHALL continue navigation using visual cues without code updates
5. WHEN an element is not visible, THE Agent SHALL use human-like mouse movements and scrolling to locate it
6. THE Agent SHALL log each visual navigation action with before/after screenshots for audit

**Technology**: AWS Bedrock AgentCore Browser Tool + Claude 3.5 Sonnet

### FR-2: Vernacular Voice Command Processing

**User Story**: As a VLE, I want to issue commands in my regional dialect, so that I can work naturally without language translation overhead.

**Acceptance Criteria:**
1. THE System SHALL support voice input in Hindi, English, Tamil, Telugu, Marathi, Bengali, Gujarati, Kannada, Malayalam, Punjabi, and Odia
2. WHEN a VLE speaks in Bhojpuri dialect, THE System SHALL map it to standard Hindi for processing
3. WHEN speech recognition confidence < 0.7, THE System SHALL request repetition
4. THE System SHALL provide real-time voice transcription display for VLE verification
5. WHEN Bhashini API is unavailable, THE System SHALL fall back to text input mode
6. THE System SHALL process voice-to-intent within 3 seconds under normal conditions

**Technology**: Bhashini ASR/NMT/TTS + Llama-3-8B for intent extraction

### FR-3: Privacy-Preserving Aadhaar Handling

**User Story**: As a citizen, I want my Aadhaar number masked automatically before any system processing, so that my privacy is protected by design.

**Acceptance Criteria:**
1. WHEN a document is captured on mobile, THE System SHALL detect Aadhaar using OpenCV at the edge
2. BEFORE any cloud upload, THE System SHALL mask digits 5-12 with 'X' (format: NNNN-XXXX-XXNN)
3. THE System SHALL NEVER display, log, or store unmasked Aadhaar numbers
4. WHEN submitting to portal, THE System SHALL use masked Aadhaar in encrypted transit
5. THE System SHALL validate detected Aadhaar using Verhoeff checksum algorithm
6. THE System SHALL achieve 100% Aadhaar masking accuracy with zero false negatives

**Technology**: OpenCV (edge) + AWS Textract (cloud) + Verhoeff validation

### FR-4: Cross-Verification Between Voice and Documents

**User Story**: As a system, I need to verify that voice-transcribed data matches OCR-extracted data, so that fraud is prevented and data integrity is maintained.

**Acceptance Criteria:**
1. WHEN voice data and document data are extracted, THE System SHALL perform fuzzy matching on key fields (name, DOB, address)
2. WHEN using Levenshtein distance + Soundex/Metaphone for name matching
3. GIVEN match score 95-100%, THE System SHALL auto-approve and proceed silently
4. GIVEN match score 80-94%, THE System SHALL proceed with flag for audit
5. GIVEN match score 70-79%, THE System SHALL alert VLE: "Name mismatch detected. Please verify manually."
6. GIVEN match score < 70%, THE System SHALL block submission and require VLE override with reason
7. THE System SHALL handle regional name variations (short names, title variations, spelling differences)

**Technology**: Levenshtein + Indic-adapted Soundex/Metaphone + weighted scoring

### FR-5: Offline-Tolerant Job Queue Architecture

**User Story**: As a VLE, I want to continue serving citizens during internet outages, so that rural connectivity issues don't halt my work.

**Acceptance Criteria:**
1. WHEN connectivity is lost, THE System SHALL notify VLE and continue accepting voice/document inputs
2. WHEN operating offline, THE System SHALL queue actions in local encrypted storage (RxDB/WatermelonDB)
3. WHEN connectivity resumes, THE System SHALL perform "burst sync" automatically
4. WHEN queueing fails, THE System SHALL display offline_job_id to VLE for tracking
5. THE System SHALL detect connectivity using health checks every 30 seconds
6. WHEN offline > 30 minutes, THE System SHALL advise VLE on which services require connectivity

**Technology**: Redis job queue + Socket.io + RxDB/WatermelonDB (mobile)

### FR-6: Mock Portal Infrastructure

**User Story**: As a developer (Member 2), I want static clones of government portals, so that I can develop and demo regardless of live site uptime or blocking.

**Acceptance Criteria:**
1. THE System SHALL maintain S3-hosted static clones of target portals (PM-KISAN, e-Shram, NREGA)
2. WHEN in development mode, THE Agent SHALL route to mock.gramsetu.in
3. WHEN in production mode, THE Agent SHALL route to live portal (e.g., pmkisan.gov.in)
4. WHEN live portal returns 5xx errors, THE Agent SHALL auto-switch to mock portal
5. THE Mock Portal SHALL respond with realistic success/failure messages
6. THE Mock Portal SHALL maintain identical UI layout and form fields as live portal

**Technology**: S3 static hosting + CloudFront + portal switcher logic

### FR-7: Session Recovery and State Persistence

**User Story**: As a VLE, I want to resume interrupted sessions from exactly where I left off, so that connectivity issues or crashes don't force me to restart applications.

**Acceptance Criteria:**
1. WHEN any action occurs, THE System SHALL persist session state to Redis within 30 seconds
2. WHEN a session is interrupted, THE System SHALL save state with status: PROCESSING_FAILED
3. WHEN VLE relogs, THE System SHALL offer: "Resume incomplete session for Ramesh Kumar?"
4. WHEN resuming, THE Agent SHALL navigate to exact failure point using saved state
5. THE Session state SHALL include: current intent, portal position, filled fields, uploaded documents, error history
6. THE System SHALL retain session state for 24 hours with auto-delete thereafter

**Technology**: Redis with TTL policies + cryptographic session keys

### FR-8: WhatsApp Citizen Notifications

**User Story**: As a citizen, I want to receive application status updates on WhatsApp, so that I don't need to visit the CSC repeatedly for updates.

**Acceptance Criteria:**
1. WHEN application is submitted successfully, THE System SHALL send WhatsApp message to citizen within 60 seconds
2. THE Message SHALL include: citizen name, scheme name, application ID, acknowledgment screenshot
3. THE Message SHALL be in citizen's preferred language (as specified by VLE)
4. WHEN WhatsApp delivery fails, THE System SHALL retry 3 times with exponential backoff
5. WHEN citizen opts out, THE System SHALL respect opt-out preferences
6. THE System SHALL log all notification attempts in audit trail

**Technology**: WhatsApp Business API (Twilio) + message templates

### FR-9: Output Verification Against Original Documents

**User Story**: As a system, I need to verify that agent-submitted data matches original documents, so that submission errors are caught before finalization.

**Acceptance Criteria:**
1. WHEN agent completes submission, THE System SHALL capture final acknowledgment screenshot
2. THE System SHALL perform OCR on screenshot to extract application details
3. THE System SHALL compare extracted details against original documents using template matching
4. WHEN screenshot matches expected template with confidence > 0.9, THE System SHALL mark PASS
5. WHEN screenshot contains error messages, THE System SHALL mark FAIL and alert VLE
6. THE System SHALL check for unmasked PII exposure in screenshot and flag if detected

**Technology**: AWS Textract + OpenCV template matching + anomaly detection

### FR-10: Consent Capture with Voice Recording

**User Story**: As a compliance officer, I need cryptographic proof of citizen consent, so that DPDP Act requirements are met.

**Acceptance Criteria:**
1. WHEN starting a citizen session, THE System SHALL prompt VLE: "Please obtain citizen consent"
2. THE System SHALL record verbal consent: "Do you consent to GramSetu using your Aadhaar for PM-Kisan application?"
3. WHEN citizen says "Yes" (recognized in any supported language), THE System SHALL record audio
4. THE System SHALL create SHA-256 hash of consent audio and store as consent artifact
5. THE Consent record SHALL include: citizen name (encrypted), purpose, data categories, timestamp, VLE ID, audio hash
6. THE System SHALL provide consent records in human-readable format upon request
7. THE System SHALL retain consent records for 3 years per DPDP Act

**Technology**: Audio recording + SHA-256 hashing + encrypted PostgreSQL storage

### FR-11: Intelligent Error Classification and Recovery

**User Story**: As an agent, I need to classify errors intelligently, so that I can auto-recover from transient issues while escalating critical failures.

**Acceptance Criteria:**
1. THE Agent SHALL classify errors into three categories:
   - RECOVERABLE: session timeout, network blip, server busy → Auto-retry up to 2 times
   - FATAL: form validation failed, authentication error → Escalate to VLE immediately
   - MOCKABLE: live portal down (5xx errors) → Switch to mock portal
2. WHEN encountering session timeout, THE Agent SHALL detect visual markers (e.g., "Session Expired" popup)
3. WHEN auto-recovering, THE Agent SHALL use cached session state to re-login and navigate to failure point
4. WHEN escalating to VLE, THE Agent SHALL display: error type, suggested resolution, option for manual control
5. THE Agent SHALL log all errors with full context (screenshot, action attempted, portal state)

**Technology**: Visual error detection + state caching + retry logic with exponential backoff

### FR-12: Scheme Knowledge Base with Auto-Update

**User Story**: As a VLE, I want the system to guide me on scheme eligibility and portal navigation, so that I can serve citizens accurately without memorizing rules.

**Acceptance Criteria:**
1. THE System SHALL maintain a knowledge base of 20+ government schemes with:
   - Eligibility criteria (multilingual)
   - Required documents list
   - Portal navigation steps (versioned)
   - Common errors and solutions
2. WHEN VLE asks: "Is this farmer eligible for PM-Kisan?", THE System SHALL match citizen data against criteria
3. WHEN scheme rules change, THE System SHALL update knowledge base within 48 hours of official notification
4. THE System SHALL track portal element selectors with versioning
5. WHEN navigation fails repeatedly, THE System SHALL flag for knowledge base review
6. THE System SHALL cache frequently accessed schemes for offline reference

**Technology**: PostgreSQL with full-text search + automated web scraping + admin interface

## 8. Non-Functional Requirements

### NFR-1: Performance

| Metric | Target | Measurement |
|--------|--------|-------------|
| Voice-to-intent latency | < 3 seconds | 95th percentile under normal network |
| Agent navigation action identification | < 2 seconds | Per action decision time |
| Document Aadhaar masking | < 5 seconds | For files up to 10MB |
| Application completion time | 2 minutes | End-to-end (vs. 20 min manual) |
| Concurrent VLE sessions | 100,000 | Nationwide deployment capacity |
| Peak voice interactions | 50,000 | Simultaneous processing |
| Document uploads per day | 1,000,000 | Processing capacity |

### NFR-2: Scalability

1. THE System SHALL scale horizontally to support 500,000 VLEs within 2 years
2. THE System SHALL use serverless architecture (AWS Lambda, ECS Fargate) for elastic scaling
3. THE System SHALL implement auto-scaling based on queue depth and CPU utilization
4. THE System SHALL distribute load across multiple availability zones

### NFR-3: Reliability and Availability

1. THE System SHALL maintain 99.5% uptime (excluding planned maintenance)
2. WHEN a component fails, THE System SHALL gracefully degrade rather than complete failure
3. THE System SHALL implement circuit breakers for external API calls (Bhashini, WhatsApp)
4. THE System SHALL recover from crashes without data loss using persistent state
5. THE System SHALL perform automated health checks every 30 seconds with heartbeat monitoring

### NFR-4: Security

1. THE System SHALL encrypt all data in transit using TLS 1.3
2. THE System SHALL encrypt all data at rest using AES-256
3. THE System SHALL authenticate VLEs using multi-factor authentication (OTP + biometric)
4. THE System SHALL implement role-based access control (RBAC) for admin functions
5. THE System SHALL isolate browser sessions per VLE with automatic cookie clearing
6. THE System SHALL undergo annual security audits by CERT-In certified auditors
7. THE System SHALL implement rate limiting (100 requests/minute per VLE) to prevent abuse
8. THE System SHALL prevent unmasked Aadhaar from ever reaching cloud infrastructure

### NFR-5: Privacy and Compliance

1. THE System SHALL comply with Digital Personal Data Protection Act, 2023
2. THE System SHALL comply with Aadhaar Act, 2016 and UIDAI regulations
3. THE System SHALL implement data minimization (collect only necessary fields)
4. THE System SHALL delete citizen data within 90 days post-application unless legally required
5. THE System SHALL provide data portability (export in JSON/CSV format)
6. THE System SHALL implement purpose limitation (data used only for stated purpose)
7. THE System SHALL store all data within India (data localization requirement)
8. THE System SHALL maintain audit logs for 7 years for compliance

### NFR-6: Accessibility

1. THE System SHALL support voice interaction for visually impaired VLEs
2. THE System SHALL provide high-contrast visual modes for low vision users
3. THE System SHALL support keyboard navigation for all functions
4. THE System SHALL provide text alternatives for all audio content

### NFR-7: Maintainability

1. THE System SHALL use standardized API contracts (OpenAPI 3.0 specification)
2. THE System SHALL implement comprehensive logging with structured JSON logs
3. THE System SHALL provide admin dashboard for monitoring and configuration
4. THE System SHALL support A/B testing for UI/UX improvements
5. THE System SHALL maintain versioned API endpoints for backward compatibility

## 9. Success Metrics and KPIs

### 9.1 VLE Productivity Metrics

| Metric | Baseline | Target | Impact |
|--------|----------|--------|--------|
| Time per application | 20 minutes | 2 minutes | 10x faster |
| Applications per hour | 3 | 30 | 10x throughput |
| VLE hourly revenue | ₹60 | ₹600 | 10x income |
| VLE monthly revenue | ₹12,000 | ₹1,20,000 | Life-changing |
| Application error rate | 15% | < 5% | 3x quality improvement |

### 9.2 System Performance Metrics

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| Intent recognition accuracy | > 90% | Correct intent on first attempt |
| Document OCR accuracy | > 95% | Field extraction correctness |
| Aadhaar masking accuracy | 100% | Zero unmasked exposures |
| Portal navigation success | > 85% | Tasks completed without manual intervention |
| Voice response time | < 3 sec | 95th percentile latency |
| System uptime | 99.5% | Monthly availability |
| Offline sync success | > 90% | Queued actions successfully synced |

### 9.3 User Adoption Metrics

| Metric | Target | Timeline |
|--------|--------|----------|
| VLE adoption rate | 70% | Within 3 months of training |
| Daily active VLEs | 60% | Of registered VLEs |
| Session completion rate | 85% | Started sessions completed successfully |
| Citizen satisfaction score | 4.0+/5.0 | Post-service surveys |
| Repeat visit rate | 70% | Citizens returning to same VLE |

### 9.4 Compliance Metrics

| Metric | Target |
|--------|--------|
| Aadhaar masking rate | 100% (zero tolerance) |
| Consent capture rate | 100% (mandatory) |
| Audit log completeness | 100% (no gaps) |
| Data deletion compliance | 100% (within 90 days) |
| Security audit pass rate | 100% (annual CERT-In audits) |

## 10. Constraints and Assumptions

### 10.1 Constraints

**Technical Constraints:**
- GramSetu must operate within existing CSC infrastructure (no specialized hardware)
- The system cannot modify government portal code or bypass security (CAPTCHA/OTP)
- Bhashini API availability and performance limits multilingual capabilities
- Rural internet connectivity: intermittent 2G/3G with bandwidth < 1 Mbps
- Mobile devices: entry-level Android (4GB RAM, limited storage)

**Regulatory Constraints:**
- DPDP Act 2023 compliance mandatory (consent, minimization, localization)
- UIDAI regulations prohibit permanent Aadhaar storage
- CERT-In guidelines require incident reporting within 6 hours
- IT Act 2000 liability for data breaches

**Operational Constraints:**
- VLEs have varying technical literacy (interface must be intuitive)
- Budget limits initial scheme coverage to 20 high-priority schemes
- CSCs have basic IT support (system must be self-healing)
- Government portals change without notice (visual navigation mitigates)

### 10.2 Assumptions

**Infrastructure Assumptions:**
- VLEs have access to smartphones with camera and microphone
- CSCs have basic internet connectivity (even if intermittent)
- AWS infrastructure remains available and performant
- Bhashini services continue to improve and remain free/affordable

**User Assumptions:**
- Citizens provide informed consent for data processing
- VLEs receive 2-day training on GramSetu before deployment
- CSCs have basic troubleshooting capabilities (restart app, check network)
- VLEs are motivated by 10x income increase to adopt new system

**Regulatory Assumptions:**
- Government portals remain accessible (not blocked for automation)
- DPDP Act enforcement allows legitimate service delivery use cases
- Scheme eligibility rules are publicly documented and accessible
- Portal authentication mechanisms (OTP) remain human-verifiable

## 11. Out of Scope (Explicitly Excluded)

1. **Direct citizen self-service app**: GramSetu serves VLEs, not citizens directly
2. **CAPTCHA/OTP bypass**: These require human intervention by design
3. **Payment processing**: Integration with payment gateways deferred to Phase 2
4. **Biometric authentication**: Aadhaar e-KYC integration deferred to Phase 2
5. **Voice biometrics**: "Voice as password" deferred to Q3 2024
6. **Offline voice recognition**: Requires cloud Bhashini APIs
7. **Support for all 700+ government schemes**: Phased rollout starting with top 20
8. **Multi-tenancy for non-CSC operators**: Initial focus on CSC ecosystem only
9. **Mobile app for tier-1 city citizens**: Product market fit is rural India

## 12. Appendix: API Contract Summary

### Complete API Specification

| Endpoint | Owner | Method | Purpose |
|----------|-------|--------|---------|
| `/api/v1/ingress/voice` | Member 1 | POST | Convert audio to structured intent |
| `/api/v1/ingress/document` | Member 3 | POST | Accept and process scanned documents |
| `/api/v1/identity/verify` | Member 3 | POST | OCR + Aadhaar masking |
| `/api/v1/identity/cross-verify` | Member 3 | POST | Fuzzy match voice vs. document |
| `/api/v1/agent/execute` | Member 2 | POST | Trigger browser automation |
| `/api/v1/agent/mock` | Member 2 | GET | Serve mock portal |
| `/api/v1/jobs/create` | Member 4 | POST | Create new job ticket |
| `/api/v1/jobs/status` | Member 4 | GET | Query job status |
| `/api/v1/jobs/history` | Member 4 | GET | Retrieve past applications |
| `/api/v1/sync/offline` | Member 4 | POST | Handle burst sync |
| `/api/v1/consent/record` | Member 3 | POST | Store consent artifacts |
| `/api/v1/verify/output` | Member 3 | POST | Validate agent output |

### Event Bus Schema (Redis Pub/Sub)

**Channel**: `job:updates`
```json
{
  "job_id": "pmk_2024_02_13_001",
  "status": "agent_executing",
  "progress": 45,
  "current_step": "filling_form_page_2",
  "estimated_completion_sec": 12
}
```

### Session State Schema (Redis)

```json
{
  "job_id": "pmk_2024_02_13_001",
  "status": "agent_executing",
  "current_step": "form_page_2",
  "collected_data": {
    "name": "Ramesh Kumar",
    "aadhaar_masked": "xxxx-xxxx-1234"
  },
  "error_history": [
    {"timestamp": "...", "error": "session_timeout", "recovered": true}
  ],
  "consent_record": "s3://consent-artifacts/audio_hash_001.wav",
  "ttl": 86400
}
```

---

**Document Version**: 1.0  
**Last Updated**: 2024-02-15  
**Status**: Hackathon-Ready  
**Approval**: Awaiting technical review
=======
# Requirements Document: GramSetu
## Sovereign Agentic Infrastructure for Last-Mile Public Service Delivery

## 1. Introduction

### 1.1 Executive Vision

GramSetu (Village Bridge) represents a paradigmatic shift from **Informational AI to Agentic AI** in India's digital governance landscape. While existing solutions like Jugalbandi excel at retrieving information, they fail to address the critical **Action Gap** - the inability to perform complex, multi-step actions required to actually apply for government schemes.

GramSetu is an **autonomous, voice-first, multimodal agentic infrastructure** capable of navigating legacy government websites exactly as a human would - seeing the screen, clicking buttons, typing text - driven entirely by vernacular voice commands. This system empowers Village Level Entrepreneurs (VLEs) at Common Service Centres (CSCs) to process complex applications in seconds rather than minutes, fundamentally altering the economics of rural service delivery.

### 1.2 The "Insane" Proposition

We propose an autonomous system that:
- Navigates legacy portals using **visual web navigation** (multimodal LLMs analyzing screenshots)
- Operates through **vernacular voice commands** in 11+ Indian languages
- Performs **privacy-preserving OCR** with automatic Aadhaar masking at the edge
- Maintains **sovereign AI infrastructure** using Bhashini and AWS Bedrock
- Achieves **10x VLE productivity** increase (₹60/hour → ₹600/hour)
- Operates **offline-first** with intelligent sync and state recovery

### 1.3 Problem Statement: The Action Gap

**Current State:**
- 900 million rural Indians lack access to digital services despite infrastructure availability
- Existing AI chatbots inform citizens of eligibility but cannot complete applications
- Government portals feature hostile UX: aggressive timeouts, English/Sarkari Hindi, complex workflows
- VLEs spend 20 minutes per application due to repetitive form-filling
- Low throughput (3 applications/hour) forces VLEs to charge illicit fees

**The Root Cause:**
The "Read-Only Trap" - Government portals are effectively read-only for target demographics due to:
- Linguistic exclusion (Sanskritized administrative Hindi vs. regional dialects)
- Hostile UX patterns (session timeouts, non-responsive layouts)
- Cognitive overload (15-20 field mapping from physical documents)
- Traditional RPA brittleness (fixed selectors break when DOM changes)

**GramSetu's Solution:**
Transform "read-only" portals into "read-write" APIs through autonomous agents that:
- Navigate visually (immune to DOM changes)
- Understand vernacular voice commands
- Recover from failures intelligently
- Maintain human oversight for accountability

## 2. Goals and Non-Goals

### 2.1 Goals

**Primary Goals:**
1. Enable **autonomous portal navigation** with VLE supervision for critical checkpoints
2. Achieve **10x VLE productivity** increase (3 apps/hour → 30 apps/hour)
3. Support **11+ Indian languages** through Bhashini integration with dialect mapping
4. Implement **privacy-by-design** with edge-based Aadhaar masking
5. Operate **offline-tolerant** with intelligent job queuing and sync
6. Provide **WhatsApp-based citizen notifications** for transparency
7. Maintain **DPDP Act 2023 compliance** with consent capture and audit trails
8. Support **20+ high-impact government schemes** at launch

**Performance Goals:**
- Voice-to-intent latency: < 3 seconds
- Application completion time: 2 minutes (vs. 20 minutes manual)
- Intent recognition accuracy: > 90%
- Aadhaar masking accuracy: 100%
- System uptime: 99.5%
- Offline sync success rate: > 90%

**Economic Goals:**
- VLE hourly revenue: ₹60 → ₹600 (10x increase)
- VLE monthly revenue: ₹12,000 → ₹1,20,000
- Transaction fee: ₹2 per successful application (10% of VLE earnings)
- Freemium model: First 100 transactions free

### 2.2 Non-Goals

1. **NOT** a direct citizen-facing app (VLEs remain essential intermediaries)
2. **NOT** bypassing security measures (CAPTCHA/OTP require VLE intervention)
3. **NOT** storing Aadhaar numbers permanently
4. **NOT** modifying government portal functionality
5. **NOT** 100% autonomous (human-in-the-loop for critical decisions)
6. **NOT** supporting all schemes on day one (phased rollout)

## 3. Stakeholders

### 3.1 Primary Stakeholders
- **Village Level Entrepreneurs (VLEs)**: System operators with 10x productivity gain
- **Rural Citizens**: Beneficiaries receiving faster, error-free service
- **CSC SPV**: Network operator overseeing 5+ lakh CSCs nationwide

### 3.2 Secondary Stakeholders
- **Ministry of Electronics and IT (MeitY)**: Policy oversight and compliance
- **Bhashini Ecosystem**: Multilingual AI infrastructure providers
- **Government Departments**: Portal owners (DARPG, NITI Aayog, State governments)
- **System Administrators**: Technical staff managing deployments
- **Auditors**: DPDP Act compliance verification

## 4. User Personas

### Persona 1: Rajesh - Experienced VLE
- **Location**: Uttar Pradesh, semi-urban CSC
- **Experience**: 5 years, handles 40 citizens daily
- **Current Pain**: Repetitive form-filling, portal changes, time pressure
- **GramSetu Impact**: 40 citizens/day → 120 citizens/day, ₹800/day → ₹2,400/day
- **Key Needs**: Speed, reliability, minimal learning curve

### Persona 2: Lakshmi - New VLE
- **Location**: Tamil Nadu, remote village CSC
- **Experience**: 6 months, handles 15 citizens daily
- **Current Pain**: Portal complexity, language barriers, fear of errors
- **GramSetu Impact**: Confidence boost, error reduction, guided workflows
- **Key Needs**: Clear guidance, error prevention, Tamil language support

### Persona 3: Arjun - High-Volume VLE
- **Location**: Maharashtra, district headquarters CSC
- **Experience**: 8 years, handles 80 citizens daily with assistants
- **Current Pain**: Peak-hour connectivity issues, scaling bottlenecks
- **GramSetu Impact**: 80 citizens/day → 240 citizens/day, team productivity multiplier
- **Key Needs**: Offline resilience, batch processing, multi-session handling

## 5. Glossary

### System Components
- **GramSetu**: Complete agentic infrastructure including all four feature streams
- **Gateway Architect (Member 1)**: Input & Context Layer - vernacular ASR, intent extraction
- **Automation Architect (Member 2)**: Action & Recovery Layer - browser automation, visual navigation
- **Security Architect (Member 3)**: Trust & Verification Layer - OCR, PII masking, cross-verification
- **Platform Architect (Member 4)**: Integration Layer - message bus, state management, UX

### Technical Terms
- **Visual Navigation**: Screenshot-based portal navigation using multimodal LLMs
- **Agent Orchestrator**: AWS Bedrock Agent with AgentCore Browser Tool capability
- **Mock Portal**: Static clone of government portals for development independence
- **Masked_Aadhaar**: Aadhaar with digits 5-12 replaced (NNNN-XXXX-XXNN format)
- **Job Queue**: Asynchronous task queue using Redis with Socket.io for real-time updates
- **Burst Sync**: Offline-to-online synchronization of queued actions
- **Cross-Verification**: Fuzzy matching between voice-transcribed and OCR-extracted data
- **Output Verification**: Validation of agent results against original documents

### Compliance Terms
- **DPDP Act**: Digital Personal Data Protection Act, 2023
- **Consent Artifact**: Cryptographically hashed verbal consent recording
- **Edge Redactor**: On-device Aadhaar masking before cloud upload
- **Audit Trail**: Immutable log of all system actions with 7-year retention

## 6. Four-Pillar Architecture

GramSetu is architected into four tightly integrated feature streams, each owned by a team member with clearly defined API contracts:

### 6.1 Feature Stream I: Gateway Architect (Input & Context Layer)

**Owner**: Member 1  
**Responsibility**: Convert vernacular voice and context into structured job requests

**Key Components:**
- Bhashini ASR integration with pre-processing (RNNoise, Silero VAD)
- Intent extraction using fine-tuned Llama-3-8B via Bedrock
- Dialect mapping (Bhojpuri, Maithili, Marwari regional variations)
- Phonetic matching (Soundex/Metaphone adapted for Indic scripts)

**API Endpoint**: `/api/v1/ingress/voice`

**Request:**
```json
{
  "audio_base64": "...",
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
    "entities": {
      "name_phonetic": "Ramesh Kumar",
      "state": "Bihar"
    },
    "missing_info": ["aadhaar_number"]
  },
  "audio_metadata": {
    "duration_ms": 4500,
    "confidence": 0.92
  }
}
```

### 6.2 Feature Stream II: Automation Architect (Action & Recovery Layer)

**Owner**: Member 2  
**Responsibility**: Execute autonomous portal navigation with visual intelligence

**Key Components:**
- AWS Bedrock Agent with AgentCore Browser Tool
- Visual navigation using Claude 3.5 Sonnet (screenshot analysis)
- Mock Portal infrastructure (S3-hosted clones for development)
- Session recovery and error classification
- Portal switcher (dev/mock/production modes)

**API Endpoint**: `/api/v1/agent/execute`

**Request:**
```json
{
  "job_id": "pmk_2024_02_13_001",
  "target_portal": "pm_kisan",
  "mode": "production",
  "form_data": {
    "aadhaar_number_masked": "xxxx-xxxx-1234",
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
    "screenshot_ref": "s3://screenshots/step_3.png",
    "acknowledgment_id": "PMK/2024/887766"
  },
  "execution_log": [
    {"step": "navigate_login", "duration_ms": 2300},
    {"step": "fill_form", "duration_ms": 4500},
    {"step": "submit", "duration_ms": 1200}
  ]
}
```

**Error Recovery:**
- RECOVERABLE (session timeout, network blip) → Auto-retry
- FATAL (form validation failed, server 500) → Escalate to VLE
- MOCKABLE (live site down) → Switch to mock portal

### 6.3 Feature Stream III: Security Architect (Trust & Verification Layer)

**Owner**: Member 3  
**Responsibility**: Privacy-preserving document processing and verification

**Key Components:**
- Edge-based Aadhaar masking (OpenCV on mobile before upload)
- AWS Textract / BharatOCR for intelligent document processing
- Cross-verification engine (fuzzy matching between voice and OCR data)
- Output verification (screenshot validation, data integrity checks)
- Consent manager with voice recording and hashing
- Fake document detection (Moiré pattern, template matching)

**API Endpoints:**

**1. Document Ingress**: `/api/v1/ingress/document`
```json
{
  "document_image_base64": "...",
  "document_type": "aadhaar",
  "vle_id": "VLE_12345",
  "job_id": "pmk_2024_02_13_001"
}
```

**2. Cross-Verification**: `/api/v1/identity/cross-verify`
```json
{
  "job_id": "pmk_2024_02_13_001",
  "voice_data": {"name": "Ramesh Kumar", "confidence": 0.92},
  "document_data": {"name": "Ramesh Kr.", "aadhaar_masked": "xxxx-xxxx-1234"}
}
```

**Response:**
```json
{
  "cross_verify_score": 88,
  "match_status": "PARTIAL_MATCH",
  "action_required": "PROCEED_WITH_FLAG",
  "discrepancies": [
    {
      "field": "name",
      "voice_value": "Ramesh Kumar",
      "document_value": "Ramesh Kr.",
      "similarity": 88,
      "suggested_action": "log_only"
    }
  ],
  "vle_alert": "Name has minor variation. Please verify quickly."
}
```

**3. Output Verification**: `/api/v1/verify/output`
```json
{
  "verification_status": "PASS",
  "checks": {
    "screenshot_template_match": 0.96,
    "data_integrity": true,
    "pii_exposure": false,
    "field_completeness": 100
  }
}
```

### 6.4 Feature Stream IV: Platform Architect (Integration Layer)

**Owner**: Member 4  
**Responsibility**: Orchestration, state management, and user experience

**Key Components:**
- Redis-based job queue with Socket.io real-time updates
- FastAPI backend with standardized REST endpoints
- React Native VLE mobile app with offline storage
- WhatsApp Business API integration (Twilio)
- Health check registry and heartbeat monitoring
- Offline-first architecture with burst sync

**API Endpoints:**

**1. Job Creation**: `/api/v1/jobs/create`
```json
{
  "job_id": "pmk_2024_02_13_001",
  "status": "queued",
  "queue_position": 2,
  "estimated_wait_sec": 45
}
```

**2. Job Status**: `/api/v1/jobs/status`
```json
{
  "job_id": "pmk_2024_02_13_001",
  "status": "completed",
  "progress": 100,
  "timeline": [
    {"step": "created", "timestamp": "2024-02-13T10:30:00Z"},
    {"step": "voice_processed", "timestamp": "2024-02-13T10:30:05Z"},
    {"step": "document_verified", "timestamp": "2024-02-13T10:30:12Z"},
    {"step": "agent_completed", "timestamp": "2024-02-13T10:31:45Z"}
  ]
}
```

**3. Offline Sync**: `/api/v1/sync/offline`
```json
{
  "synced_jobs": [
    {
      "offline_job_id": "offline_001",
      "job_id": "pmk_2024_02_13_001",
      "status": "queued"
    }
  ]
}
```

## 7. Functional Requirements

### FR-1: Visual Portal Navigation (The "Insane" Core)

**User Story**: As an autonomous agent, I need to navigate government portals by analyzing screenshots rather than parsing HTML, so that I remain resilient to frequent DOM changes.

**Acceptance Criteria:**
1. WHEN navigating a portal, THE Agent SHALL capture screenshots of each page state
2. WHEN analyzing a screenshot, THE Agent SHALL use Claude 3.5 Sonnet to identify interactive elements
3. GIVEN an instruction "Click the blue button that says 'Login'", THE Agent SHALL return pixel coordinates (x, y) for the target element
4. WHEN the DOM structure changes, THE Agent SHALL continue navigation using visual cues without code updates
5. WHEN an element is not visible, THE Agent SHALL use human-like mouse movements and scrolling to locate it
6. THE Agent SHALL log each visual navigation action with before/after screenshots for audit

**Technology**: AWS Bedrock AgentCore Browser Tool + Claude 3.5 Sonnet

### FR-2: Vernacular Voice Command Processing

**User Story**: As a VLE, I want to issue commands in my regional dialect, so that I can work naturally without language translation overhead.

**Acceptance Criteria:**
1. THE System SHALL support voice input in Hindi, English, Tamil, Telugu, Marathi, Bengali, Gujarati, Kannada, Malayalam, Punjabi, and Odia
2. WHEN a VLE speaks in Bhojpuri dialect, THE System SHALL map it to standard Hindi for processing
3. WHEN speech recognition confidence < 0.7, THE System SHALL request repetition
4. THE System SHALL provide real-time voice transcription display for VLE verification
5. WHEN Bhashini API is unavailable, THE System SHALL fall back to text input mode
6. THE System SHALL process voice-to-intent within 3 seconds under normal conditions

**Technology**: Bhashini ASR/NMT/TTS + Llama-3-8B for intent extraction

### FR-3: Privacy-Preserving Aadhaar Handling

**User Story**: As a citizen, I want my Aadhaar number masked automatically before any system processing, so that my privacy is protected by design.

**Acceptance Criteria:**
1. WHEN a document is captured on mobile, THE System SHALL detect Aadhaar using OpenCV at the edge
2. BEFORE any cloud upload, THE System SHALL mask digits 5-12 with 'X' (format: NNNN-XXXX-XXNN)
3. THE System SHALL NEVER display, log, or store unmasked Aadhaar numbers
4. WHEN submitting to portal, THE System SHALL use masked Aadhaar in encrypted transit
5. THE System SHALL validate detected Aadhaar using Verhoeff checksum algorithm
6. THE System SHALL achieve 100% Aadhaar masking accuracy with zero false negatives

**Technology**: OpenCV (edge) + AWS Textract (cloud) + Verhoeff validation

### FR-4: Cross-Verification Between Voice and Documents

**User Story**: As a system, I need to verify that voice-transcribed data matches OCR-extracted data, so that fraud is prevented and data integrity is maintained.

**Acceptance Criteria:**
1. WHEN voice data and document data are extracted, THE System SHALL perform fuzzy matching on key fields (name, DOB, address)
2. WHEN using Levenshtein distance + Soundex/Metaphone for name matching
3. GIVEN match score 95-100%, THE System SHALL auto-approve and proceed silently
4. GIVEN match score 80-94%, THE System SHALL proceed with flag for audit
5. GIVEN match score 70-79%, THE System SHALL alert VLE: "Name mismatch detected. Please verify manually."
6. GIVEN match score < 70%, THE System SHALL block submission and require VLE override with reason
7. THE System SHALL handle regional name variations (short names, title variations, spelling differences)

**Technology**: Levenshtein + Indic-adapted Soundex/Metaphone + weighted scoring

### FR-5: Offline-Tolerant Job Queue Architecture

**User Story**: As a VLE, I want to continue serving citizens during internet outages, so that rural connectivity issues don't halt my work.

**Acceptance Criteria:**
1. WHEN connectivity is lost, THE System SHALL notify VLE and continue accepting voice/document inputs
2. WHEN operating offline, THE System SHALL queue actions in local encrypted storage (RxDB/WatermelonDB)
3. WHEN connectivity resumes, THE System SHALL perform "burst sync" automatically
4. WHEN queueing fails, THE System SHALL display offline_job_id to VLE for tracking
5. THE System SHALL detect connectivity using health checks every 30 seconds
6. WHEN offline > 30 minutes, THE System SHALL advise VLE on which services require connectivity

**Technology**: Redis job queue + Socket.io + RxDB/WatermelonDB (mobile)

### FR-6: Mock Portal Infrastructure

**User Story**: As a developer (Member 2), I want static clones of government portals, so that I can develop and demo regardless of live site uptime or blocking.

**Acceptance Criteria:**
1. THE System SHALL maintain S3-hosted static clones of target portals (PM-KISAN, e-Shram, NREGA)
2. WHEN in development mode, THE Agent SHALL route to mock.gramsetu.in
3. WHEN in production mode, THE Agent SHALL route to live portal (e.g., pmkisan.gov.in)
4. WHEN live portal returns 5xx errors, THE Agent SHALL auto-switch to mock portal
5. THE Mock Portal SHALL respond with realistic success/failure messages
6. THE Mock Portal SHALL maintain identical UI layout and form fields as live portal

**Technology**: S3 static hosting + CloudFront + portal switcher logic

### FR-7: Session Recovery and State Persistence

**User Story**: As a VLE, I want to resume interrupted sessions from exactly where I left off, so that connectivity issues or crashes don't force me to restart applications.

**Acceptance Criteria:**
1. WHEN any action occurs, THE System SHALL persist session state to Redis within 30 seconds
2. WHEN a session is interrupted, THE System SHALL save state with status: PROCESSING_FAILED
3. WHEN VLE relogs, THE System SHALL offer: "Resume incomplete session for Ramesh Kumar?"
4. WHEN resuming, THE Agent SHALL navigate to exact failure point using saved state
5. THE Session state SHALL include: current intent, portal position, filled fields, uploaded documents, error history
6. THE System SHALL retain session state for 24 hours with auto-delete thereafter

**Technology**: Redis with TTL policies + cryptographic session keys

### FR-8: WhatsApp Citizen Notifications

**User Story**: As a citizen, I want to receive application status updates on WhatsApp, so that I don't need to visit the CSC repeatedly for updates.

**Acceptance Criteria:**
1. WHEN application is submitted successfully, THE System SHALL send WhatsApp message to citizen within 60 seconds
2. THE Message SHALL include: citizen name, scheme name, application ID, acknowledgment screenshot
3. THE Message SHALL be in citizen's preferred language (as specified by VLE)
4. WHEN WhatsApp delivery fails, THE System SHALL retry 3 times with exponential backoff
5. WHEN citizen opts out, THE System SHALL respect opt-out preferences
6. THE System SHALL log all notification attempts in audit trail

**Technology**: WhatsApp Business API (Twilio) + message templates

### FR-9: Output Verification Against Original Documents

**User Story**: As a system, I need to verify that agent-submitted data matches original documents, so that submission errors are caught before finalization.

**Acceptance Criteria:**
1. WHEN agent completes submission, THE System SHALL capture final acknowledgment screenshot
2. THE System SHALL perform OCR on screenshot to extract application details
3. THE System SHALL compare extracted details against original documents using template matching
4. WHEN screenshot matches expected template with confidence > 0.9, THE System SHALL mark PASS
5. WHEN screenshot contains error messages, THE System SHALL mark FAIL and alert VLE
6. THE System SHALL check for unmasked PII exposure in screenshot and flag if detected

**Technology**: AWS Textract + OpenCV template matching + anomaly detection

### FR-10: Consent Capture with Voice Recording

**User Story**: As a compliance officer, I need cryptographic proof of citizen consent, so that DPDP Act requirements are met.

**Acceptance Criteria:**
1. WHEN starting a citizen session, THE System SHALL prompt VLE: "Please obtain citizen consent"
2. THE System SHALL record verbal consent: "Do you consent to GramSetu using your Aadhaar for PM-Kisan application?"
3. WHEN citizen says "Yes" (recognized in any supported language), THE System SHALL record audio
4. THE System SHALL create SHA-256 hash of consent audio and store as consent artifact
5. THE Consent record SHALL include: citizen name (encrypted), purpose, data categories, timestamp, VLE ID, audio hash
6. THE System SHALL provide consent records in human-readable format upon request
7. THE System SHALL retain consent records for 3 years per DPDP Act

**Technology**: Audio recording + SHA-256 hashing + encrypted PostgreSQL storage

### FR-11: Intelligent Error Classification and Recovery

**User Story**: As an agent, I need to classify errors intelligently, so that I can auto-recover from transient issues while escalating critical failures.

**Acceptance Criteria:**
1. THE Agent SHALL classify errors into three categories:
   - RECOVERABLE: session timeout, network blip, server busy → Auto-retry up to 2 times
   - FATAL: form validation failed, authentication error → Escalate to VLE immediately
   - MOCKABLE: live portal down (5xx errors) → Switch to mock portal
2. WHEN encountering session timeout, THE Agent SHALL detect visual markers (e.g., "Session Expired" popup)
3. WHEN auto-recovering, THE Agent SHALL use cached session state to re-login and navigate to failure point
4. WHEN escalating to VLE, THE Agent SHALL display: error type, suggested resolution, option for manual control
5. THE Agent SHALL log all errors with full context (screenshot, action attempted, portal state)

**Technology**: Visual error detection + state caching + retry logic with exponential backoff

### FR-12: Scheme Knowledge Base with Auto-Update

**User Story**: As a VLE, I want the system to guide me on scheme eligibility and portal navigation, so that I can serve citizens accurately without memorizing rules.

**Acceptance Criteria:**
1. THE System SHALL maintain a knowledge base of 20+ government schemes with:
   - Eligibility criteria (multilingual)
   - Required documents list
   - Portal navigation steps (versioned)
   - Common errors and solutions
2. WHEN VLE asks: "Is this farmer eligible for PM-Kisan?", THE System SHALL match citizen data against criteria
3. WHEN scheme rules change, THE System SHALL update knowledge base within 48 hours of official notification
4. THE System SHALL track portal element selectors with versioning
5. WHEN navigation fails repeatedly, THE System SHALL flag for knowledge base review
6. THE System SHALL cache frequently accessed schemes for offline reference

**Technology**: PostgreSQL with full-text search + automated web scraping + admin interface

## 8. Non-Functional Requirements

### NFR-1: Performance

| Metric | Target | Measurement |
|--------|--------|-------------|
| Voice-to-intent latency | < 3 seconds | 95th percentile under normal network |
| Agent navigation action identification | < 2 seconds | Per action decision time |
| Document Aadhaar masking | < 5 seconds | For files up to 10MB |
| Application completion time | 2 minutes | End-to-end (vs. 20 min manual) |
| Concurrent VLE sessions | 100,000 | Nationwide deployment capacity |
| Peak voice interactions | 50,000 | Simultaneous processing |
| Document uploads per day | 1,000,000 | Processing capacity |

### NFR-2: Scalability

1. THE System SHALL scale horizontally to support 500,000 VLEs within 2 years
2. THE System SHALL use serverless architecture (AWS Lambda, ECS Fargate) for elastic scaling
3. THE System SHALL implement auto-scaling based on queue depth and CPU utilization
4. THE System SHALL distribute load across multiple availability zones

### NFR-3: Reliability and Availability

1. THE System SHALL maintain 99.5% uptime (excluding planned maintenance)
2. WHEN a component fails, THE System SHALL gracefully degrade rather than complete failure
3. THE System SHALL implement circuit breakers for external API calls (Bhashini, WhatsApp)
4. THE System SHALL recover from crashes without data loss using persistent state
5. THE System SHALL perform automated health checks every 30 seconds with heartbeat monitoring

### NFR-4: Security

1. THE System SHALL encrypt all data in transit using TLS 1.3
2. THE System SHALL encrypt all data at rest using AES-256
3. THE System SHALL authenticate VLEs using multi-factor authentication (OTP + biometric)
4. THE System SHALL implement role-based access control (RBAC) for admin functions
5. THE System SHALL isolate browser sessions per VLE with automatic cookie clearing
6. THE System SHALL undergo annual security audits by CERT-In certified auditors
7. THE System SHALL implement rate limiting (100 requests/minute per VLE) to prevent abuse
8. THE System SHALL prevent unmasked Aadhaar from ever reaching cloud infrastructure

### NFR-5: Privacy and Compliance

1. THE System SHALL comply with Digital Personal Data Protection Act, 2023
2. THE System SHALL comply with Aadhaar Act, 2016 and UIDAI regulations
3. THE System SHALL implement data minimization (collect only necessary fields)
4. THE System SHALL delete citizen data within 90 days post-application unless legally required
5. THE System SHALL provide data portability (export in JSON/CSV format)
6. THE System SHALL implement purpose limitation (data used only for stated purpose)
7. THE System SHALL store all data within India (data localization requirement)
8. THE System SHALL maintain audit logs for 7 years for compliance

### NFR-6: Accessibility

1. THE System SHALL support voice interaction for visually impaired VLEs
2. THE System SHALL provide high-contrast visual modes for low vision users
3. THE System SHALL support keyboard navigation for all functions
4. THE System SHALL provide text alternatives for all audio content

### NFR-7: Maintainability

1. THE System SHALL use standardized API contracts (OpenAPI 3.0 specification)
2. THE System SHALL implement comprehensive logging with structured JSON logs
3. THE System SHALL provide admin dashboard for monitoring and configuration
4. THE System SHALL support A/B testing for UI/UX improvements
5. THE System SHALL maintain versioned API endpoints for backward compatibility

## 9. Success Metrics and KPIs

### 9.1 VLE Productivity Metrics

| Metric | Baseline | Target | Impact |
|--------|----------|--------|--------|
| Time per application | 20 minutes | 2 minutes | 10x faster |
| Applications per hour | 3 | 30 | 10x throughput |
| VLE hourly revenue | ₹60 | ₹600 | 10x income |
| VLE monthly revenue | ₹12,000 | ₹1,20,000 | Life-changing |
| Application error rate | 15% | < 5% | 3x quality improvement |

### 9.2 System Performance Metrics

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| Intent recognition accuracy | > 90% | Correct intent on first attempt |
| Document OCR accuracy | > 95% | Field extraction correctness |
| Aadhaar masking accuracy | 100% | Zero unmasked exposures |
| Portal navigation success | > 85% | Tasks completed without manual intervention |
| Voice response time | < 3 sec | 95th percentile latency |
| System uptime | 99.5% | Monthly availability |
| Offline sync success | > 90% | Queued actions successfully synced |

### 9.3 User Adoption Metrics

| Metric | Target | Timeline |
|--------|--------|----------|
| VLE adoption rate | 70% | Within 3 months of training |
| Daily active VLEs | 60% | Of registered VLEs |
| Session completion rate | 85% | Started sessions completed successfully |
| Citizen satisfaction score | 4.0+/5.0 | Post-service surveys |
| Repeat visit rate | 70% | Citizens returning to same VLE |

### 9.4 Compliance Metrics

| Metric | Target |
|--------|--------|
| Aadhaar masking rate | 100% (zero tolerance) |
| Consent capture rate | 100% (mandatory) |
| Audit log completeness | 100% (no gaps) |
| Data deletion compliance | 100% (within 90 days) |
| Security audit pass rate | 100% (annual CERT-In audits) |

## 10. Constraints and Assumptions

### 10.1 Constraints

**Technical Constraints:**
- GramSetu must operate within existing CSC infrastructure (no specialized hardware)
- The system cannot modify government portal code or bypass security (CAPTCHA/OTP)
- Bhashini API availability and performance limits multilingual capabilities
- Rural internet connectivity: intermittent 2G/3G with bandwidth < 1 Mbps
- Mobile devices: entry-level Android (4GB RAM, limited storage)

**Regulatory Constraints:**
- DPDP Act 2023 compliance mandatory (consent, minimization, localization)
- UIDAI regulations prohibit permanent Aadhaar storage
- CERT-In guidelines require incident reporting within 6 hours
- IT Act 2000 liability for data breaches

**Operational Constraints:**
- VLEs have varying technical literacy (interface must be intuitive)
- Budget limits initial scheme coverage to 20 high-priority schemes
- CSCs have basic IT support (system must be self-healing)
- Government portals change without notice (visual navigation mitigates)

### 10.2 Assumptions

**Infrastructure Assumptions:**
- VLEs have access to smartphones with camera and microphone
- CSCs have basic internet connectivity (even if intermittent)
- AWS infrastructure remains available and performant
- Bhashini services continue to improve and remain free/affordable

**User Assumptions:**
- Citizens provide informed consent for data processing
- VLEs receive 2-day training on GramSetu before deployment
- CSCs have basic troubleshooting capabilities (restart app, check network)
- VLEs are motivated by 10x income increase to adopt new system

**Regulatory Assumptions:**
- Government portals remain accessible (not blocked for automation)
- DPDP Act enforcement allows legitimate service delivery use cases
- Scheme eligibility rules are publicly documented and accessible
- Portal authentication mechanisms (OTP) remain human-verifiable

## 11. Out of Scope (Explicitly Excluded)

1. **Direct citizen self-service app**: GramSetu serves VLEs, not citizens directly
2. **CAPTCHA/OTP bypass**: These require human intervention by design
3. **Payment processing**: Integration with payment gateways deferred to Phase 2
4. **Biometric authentication**: Aadhaar e-KYC integration deferred to Phase 2
5. **Voice biometrics**: "Voice as password" deferred to Q3 2024
6. **Offline voice recognition**: Requires cloud Bhashini APIs
7. **Support for all 700+ government schemes**: Phased rollout starting with top 20
8. **Multi-tenancy for non-CSC operators**: Initial focus on CSC ecosystem only
9. **Mobile app for tier-1 city citizens**: Product market fit is rural India

## 12. Appendix: API Contract Summary

### Complete API Specification

| Endpoint | Owner | Method | Purpose |
|----------|-------|--------|---------|
| `/api/v1/ingress/voice` | Member 1 | POST | Convert audio to structured intent |
| `/api/v1/ingress/document` | Member 3 | POST | Accept and process scanned documents |
| `/api/v1/identity/verify` | Member 3 | POST | OCR + Aadhaar masking |
| `/api/v1/identity/cross-verify` | Member 3 | POST | Fuzzy match voice vs. document |
| `/api/v1/agent/execute` | Member 2 | POST | Trigger browser automation |
| `/api/v1/agent/mock` | Member 2 | GET | Serve mock portal |
| `/api/v1/jobs/create` | Member 4 | POST | Create new job ticket |
| `/api/v1/jobs/status` | Member 4 | GET | Query job status |
| `/api/v1/jobs/history` | Member 4 | GET | Retrieve past applications |
| `/api/v1/sync/offline` | Member 4 | POST | Handle burst sync |
| `/api/v1/consent/record` | Member 3 | POST | Store consent artifacts |
| `/api/v1/verify/output` | Member 3 | POST | Validate agent output |

### Event Bus Schema (Redis Pub/Sub)

**Channel**: `job:updates`
```json
{
  "job_id": "pmk_2024_02_13_001",
  "status": "agent_executing",
  "progress": 45,
  "current_step": "filling_form_page_2",
  "estimated_completion_sec": 12
}
```

### Session State Schema (Redis)

```json
{
  "job_id": "pmk_2024_02_13_001",
  "status": "agent_executing",
  "current_step": "form_page_2",
  "collected_data": {
    "name": "Ramesh Kumar",
    "aadhaar_masked": "xxxx-xxxx-1234"
  },
  "error_history": [
    {"timestamp": "...", "error": "session_timeout", "recovered": true}
  ],
  "consent_record": "s3://consent-artifacts/audio_hash_001.wav",
  "ttl": 86400
}
```

---

**Document Version**: 1.0  
**Last Updated**: 2024-02-15  
**Status**: Hackathon-Ready  
**Approval**: Awaiting technical review
>>>>>>> e388735cf847c66c003c27f67c0eb6f6988da49e
