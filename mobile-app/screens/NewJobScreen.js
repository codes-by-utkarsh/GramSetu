/**
 * NewJobScreen — Full GramSetu workflow:
 * Step 1: Enter beneficiary name
 * Step 2: Voice command (what do they want?)
 * Step 3: Scan Aadhaar / documents
 * Step 4: Live agent execution with WebSocket status
 * Step 5: VLE prompted for extra info if needed
 * Step 6: Result / acknowledgement
 */
import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, TextInput, ScrollView, TouchableOpacity, StyleSheet,
    Alert, ActivityIndicator, Modal, Image, Animated, Easing,
} from 'react-native';
import { Camera } from 'expo-camera';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import Icon from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// ── API endpoints ─────────────────────────────────────────────
const getApiBase = () => {
    if (typeof window !== 'undefined' && window.location?.hostname && window.location.hostname !== 'localhost')
        return `http://${window.location.hostname}:8000`;
    if (Platform.OS === 'android') return 'http://10.0.2.2:8000';
    const host = Constants.expoConfig?.hostUri?.split(':')[0];
    return host ? `http://${host}:8000` : 'http://localhost:8000';
};
const API_BASE = getApiBase();
const VOICE_API = API_BASE.replace(':8000', ':8001');
const DOC_API = API_BASE.replace(':8000', ':8003');
const AGENT_API = API_BASE.replace(':8000', ':8002');

// ── Step constants ─────────────────────────────────────────────
const STEPS = {
    BENEFICIARY: 'beneficiary',
    VOICE: 'voice',
    DOCUMENTS: 'documents',
    EXECUTING: 'executing',
    INPUT_NEEDED: 'input_needed',
    RESULT: 'result',
};

// ── Colours ────────────────────────────────────────────────────
const C = {
    primary: '#1B5E20',
    secondary: '#FF9800',
    bg: '#F0F4F0',
    card: '#fff',
    border: '#C8E6C9',
    text: '#1a1a1a',
    sub: '#555',
    success: '#2E7D32',
    error: '#C62828',
    warn: '#E65100',
};

// ── Animated dot loader ────────────────────────────────────────
function PulsingDot({ color = C.secondary }) {
    const anim = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(anim, { toValue: 1, duration: 600, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
                Animated.timing(anim, { toValue: 0, duration: 600, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
            ])
        ).start();
    }, []);
    const scale = anim.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1.4] });
    return (
        <Animated.View style={{
            width: 14, height: 14, borderRadius: 7, backgroundColor: color,
            marginHorizontal: 4, transform: [{ scale }]
        }} />
    );
}

// ── Progress bar ───────────────────────────────────────────────
function ProgressBar({ progress }) {
    return (
        <View style={{ height: 8, borderRadius: 4, backgroundColor: '#E8F5E9', overflow: 'hidden', marginVertical: 8 }}>
            <View style={{ height: 8, borderRadius: 4, backgroundColor: C.primary, width: `${progress}%` }} />
        </View>
    );
}

// ─────────────────────────────────────────────────────────────
export default function NewJobScreen({ navigation }) {
    const [step, setStep] = useState(STEPS.BENEFICIARY);
    const [user, setUser] = useState(null);

    // Beneficiary
    const [beneficiaryName, setBeneficiaryName] = useState('');
    const [beneficiaryPhone, setBeneficiaryPhone] = useState('');
    const [beneficiaryId, setBeneficiaryId] = useState('');
    const [savedBeneficiaries, setSavedBeneficiaries] = useState([]);
    const [showBenList, setShowBenList] = useState(false);

    // Voice
    const [recording, setRecording] = useState(null);
    const [transcript, setTranscript] = useState('');
    const [typedText, setTypedText] = useState('');
    const [useTextMode, setUseTextMode] = useState(false);
    const [intent, setIntent] = useState(null);
    const [voiceProcessing, setVoiceProcessing] = useState(false);
    const [voiceError, setVoiceError] = useState('');

    // Documents
    const [cameraRef, setCameraRef] = useState(null);
    const [cameraVisible, setCameraVisible] = useState(false);
    const [scannedDocs, setScannedDocs] = useState([]);
    const [docProcessing, setDocProcessing] = useState(false);
    const [docType, setDocType] = useState('aadhaar');

    // Execution
    const [jobId, setJobId] = useState('');
    const [stepLog, setStepLog] = useState([]);
    const [progress, setProgress] = useState(0);
    const [currentStep, setCurrentStep] = useState('');
    const [jobStatus, setJobStatus] = useState('processing');
    const wsRef = useRef(null);
    const pollRef = useRef(null);

    // Input-needed
    const [inputRequest, setInputRequest] = useState(null); // { request_id, fields_needed, screenshot_url, message }
    const [inputAnswers, setInputAnswers] = useState({});
    const [inputSubmitting, setInputSubmitting] = useState(false);

    // Result
    const [result, setResult] = useState(null);

    useEffect(() => {
        (async () => {
            const u = await AsyncStorage.getItem('user');
            if (u) setUser(JSON.parse(u));
        })();
    }, []);

    // Load beneficiaries for saved list
    useEffect(() => {
        if (user?.phone) {
            fetch(`${API_BASE}/beneficiaries/${user.phone}`)
                .then(r => r.json())
                .then(d => setSavedBeneficiaries(d.data || []))
                .catch(() => { });
        }
    }, [user]);

    // WebSocket for live job updates
    const connectWs = (phone) => {
        try {
            const wsUrl = API_BASE.replace('http', 'ws') + `/ws/${phone}`;
            const ws = new WebSocket(wsUrl);
            ws.onmessage = (evt) => {
                const msg = JSON.parse(evt.data);
                if (msg.type === 'job_update') {
                    setCurrentStep(msg.step || '');
                    setProgress(msg.progress || 0);
                    setJobStatus(msg.status || 'processing');
                    setStepLog(prev => [...prev, `${new Date().toLocaleTimeString()} — ${msg.step}`]);
                    if (msg.status === 'completed' || msg.status === 'failed') {
                        fetchFinalResult(msg.job_id);
                    }
                }
                if (msg.type === 'input_required') {
                    setInputRequest(msg);
                    setStep(STEPS.INPUT_NEEDED);
                }
            };
            ws.onclose = () => console.log('WS closed');
            ws.onerror = (e) => console.warn('WS error', e);
            wsRef.current = ws;
        } catch (e) {
            console.warn('WS connection failed, using polling', e);
        }
    };

    // Polling fallback (when WS not supported)
    const startPolling = (jid) => {
        pollRef.current = setInterval(async () => {
            try {
                const r = await fetch(`${API_BASE}/jobs/${jid}/log`);
                const data = await r.json();
                setCurrentStep(data.current_step || '');
                setProgress(data.progress_percentage || 0);
                setJobStatus(data.status || 'processing');
                setStepLog(data.steps_log || []);
                if (data.status === 'completed' || data.status === 'failed') {
                    clearInterval(pollRef.current);
                    if (data.result_data) setResult(data.result_data);
                    setStep(STEPS.RESULT);
                }
                // Check for input_required via orchestrator
                if (data.status === 'waiting_for_input' && step !== STEPS.INPUT_NEEDED) {
                    // Fetch the pending input request
                    const jobRaw = await fetch(`${API_BASE}/jobs/${jid}`).then(r => r.json());
                    // For now just flag it — will be pushed via WS ideally
                }
            } catch (e) { }
        }, 3000);
    };

    const fetchFinalResult = async (jid) => {
        try {
            const r = await fetch(`${API_BASE}/jobs/${jid}/log`);
            const data = await r.json();
            if (data.result_data) setResult(data.result_data);
            setStep(STEPS.RESULT);
            if (pollRef.current) clearInterval(pollRef.current);
        } catch (e) { }
    };

    // ── Step 1: Beneficiary ──────────────────────────────────────
    const selectBeneficiary = (b) => {
        setBeneficiaryName(b.name);
        setBeneficiaryPhone(b.phone);
        setBeneficiaryId(b.beneficiary_id);
        setShowBenList(false);
    };

    const confirmBeneficiary = async () => {
        if (!beneficiaryName.trim()) {
            Alert.alert('Required', 'Please enter the beneficiary name');
            return;
        }
        // Save to DynamoDB if new
        if (!beneficiaryId && user?.phone) {
            try {
                const resp = await fetch(`${API_BASE}/beneficiaries`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        vle_phone: user.phone,
                        name: beneficiaryName,
                        phone: beneficiaryPhone,
                    }),
                });
                const d = await resp.json();
                setBeneficiaryId(d.beneficiary_id);
            } catch (e) { }
        }
        setStep(STEPS.VOICE);
    };

    // ── Step 2: Voice ────────────────────────────────────────────
    const startRecording = async () => {
        try {
            const { status } = await Audio.requestPermissionsAsync();
            if (status !== 'granted') { Alert.alert('Permission denied', 'Microphone access needed'); return; }
            await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
            const { recording: rec } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
            setRecording(rec);
        } catch (e) { Alert.alert('Error', 'Could not start recording'); }
    };

    const stopRecording = async () => {
        if (!recording) return;
        setVoiceProcessing(true);
        setVoiceError('');
        try {
            await recording.stopAndUnloadAsync();
            const uri = recording.getURI();
            setRecording(null);
            const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
            const resp = await fetch(`${VOICE_API}/process-audio`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ audio_base64: base64, vle_id: user?.phone || 'vle_demo', language_hint: 'hi' }),
            });
            if (resp.status === 503) {
                // Bhashini not configured; switch to text mode
                setVoiceError('Microphone transcription is not available. Please type your request below.');
                setUseTextMode(true);
                return;
            }
            if (!resp.ok) throw new Error('Voice service error');
            const data = await resp.json();
            setTranscript(data.transcript || '');
            setTypedText(data.transcript || '');
            setIntent({ scheme: data.scheme, action: data.intent, entities: data.entities || {} });
        } catch (e) {
            setVoiceError('Could not process audio. Please type your request below.');
            setUseTextMode(true);
        } finally {
            setVoiceProcessing(false);
        }
    };

    const classifyText = async (text) => {
        if (!text?.trim()) return;
        setVoiceProcessing(true);
        setVoiceError('');
        try {
            const resp = await fetch(`${VOICE_API}/classify-text`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: text.trim(), vle_id: user?.phone || 'vle_demo', language: 'hi' }),
            });
            if (!resp.ok) throw new Error('Classification failed');
            const data = await resp.json();
            setTranscript(text.trim());
            setIntent({ scheme: data.scheme, action: data.intent, entities: data.entities || {} });
        } catch (e) {
            setVoiceError(`Could not classify: ${e.message}`);
        } finally {
            setVoiceProcessing(false);
        }
    };

    const confirmVoiceIntent = () => {
        if (!intent?.scheme) {
            if (typedText.trim()) { classifyText(typedText); return; }
            Alert.alert('Scheme not detected', 'Please describe what you need.\n\nExamples:\n• "PM Kisan status check"\n• "e-Shram naya registration"\n• "Ayushman eligibility check"');
            return;
        }
        setStep(STEPS.DOCUMENTS);
    };

    // ── Step 3: Documents ────────────────────────────────────────
    const takePicture = async () => {
        if (!cameraRef) return;
        setDocProcessing(true);
        try {
            const photo = await cameraRef.takePictureAsync({ base64: true, quality: 0.8 });
            setCameraVisible(false);

            // Send to document service (REAL AWS Textract)
            const resp = await fetch(`${DOC_API}/process-document`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    image_base64: photo.base64,
                    document_type: docType,
                    vle_id: user?.phone || 'vle_demo',
                    apply_masking: true,
                }),
            });
            const data = await resp.json();
            const docEntry = { type: docType, extracted: data.extracted_data, uri: photo.uri };
            setScannedDocs(prev => [...prev, docEntry]);

            // Merge extracted data into beneficiary on DynamoDB
            if (beneficiaryId && user?.phone) {
                const updates = { ...data.extracted_data };
                await fetch(`${API_BASE}/beneficiaries/update`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ vle_phone: user.phone, beneficiary_id: beneficiaryId, updates }),
                });
            }

            Alert.alert('Document Scanned ✅', `Extracted: ${Object.keys(data.extracted_data || {}).join(', ')}`);
        } catch (e) {
            Alert.alert('Scan Failed', e.message);
        } finally {
            setDocProcessing(false);
        }
    };

    // ── Step 4: Execute ──────────────────────────────────────────
    const startExecution = async () => {
        try {
            // Collect all extracted doc data
            const formData = {
                ...intent?.entities,
                vle_phone: user?.phone || '',
                beneficiary_name: beneficiaryName,
                beneficiary_phone: beneficiaryPhone,
            };
            scannedDocs.forEach(d => Object.assign(formData, d.extracted));

            // Create job in orchestrator
            const jobResp = await fetch(`${API_BASE}/jobs`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    vle_id: user?.phone || 'vle_demo',
                    citizen_name: beneficiaryName,
                    citizen_phone: beneficiaryPhone,
                    consent_recorded: true,
                }),
            });
            const jobData = await jobResp.json();
            const jid = jobData.job_id;
            setJobId(jid);
            setStep(STEPS.EXECUTING);
            setStepLog([`Job ${jid.slice(0, 8)}... created`]);
            setProgress(5);

            // Connect WebSocket for live updates
            if (user?.phone) connectWs(user.phone);

            // Send task to agent service (fire-and-forget in background)
            fetch(`${AGENT_API}/execute-task`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    task_id: jid,
                    scheme: intent?.scheme || 'pm_kisan',
                    action: intent?.action || 'check_status',
                    form_data: formData,
                }),
            }).then(async (r) => {
                const res = await r.json();
                if (res.status === 'completed' || res.status === 'failed') {
                    setResult(res.result_data || { error: res.error_message });
                    setStep(STEPS.RESULT);
                }
            }).catch(() => { });

            // Start polling as fallback
            startPolling(jid);
        } catch (e) {
            Alert.alert('Failed to start', e.message);
        }
    };

    // ── Step 5: VLE Input ────────────────────────────────────────
    const submitInputAnswer = async () => {
        if (!inputRequest) return;
        setInputSubmitting(true);
        try {
            await fetch(`${API_BASE}/agent/input-answer`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ request_id: inputRequest.request_id, answer: inputAnswers }),
            });
            setInputRequest(null);
            setInputAnswers({});
            setStep(STEPS.EXECUTING);
        } catch (e) {
            Alert.alert('Submit failed', e.message);
        } finally {
            setInputSubmitting(false);
        }
    };

    // ─────────────────────────────────────────────────────────────
    // RENDER
    // ─────────────────────────────────────────────────────────────

    const renderStep = () => {
        switch (step) {
            // ── Step 1 ──
            case STEPS.BENEFICIARY:
                return (
                    <View style={s.card}>
                        <View style={s.stepHeader}>
                            <Icon name="account-plus" size={32} color={C.primary} />
                            <Text style={s.stepTitle}>Who is this for?</Text>
                            <Text style={s.stepSub}>Enter the beneficiary (citizen) details</Text>
                        </View>

                        {savedBeneficiaries.length > 0 && (
                            <TouchableOpacity style={s.secondaryBtn} onPress={() => setShowBenList(!showBenList)}>
                                <Icon name="account-multiple" size={18} color={C.primary} />
                                <Text style={s.secondaryBtnText}> Select from saved ({savedBeneficiaries.length})</Text>
                            </TouchableOpacity>
                        )}

                        {showBenList && (
                            <ScrollView style={{ maxHeight: 200, marginBottom: 12, borderWidth: 1, borderColor: C.border, borderRadius: 10 }}>
                                {savedBeneficiaries.map(b => (
                                    <TouchableOpacity key={b.beneficiary_id} style={s.benItem} onPress={() => selectBeneficiary(b)}>
                                        <Icon name="account-circle" size={22} color={C.primary} />
                                        <View style={{ marginLeft: 10 }}>
                                            <Text style={{ fontWeight: '700', color: C.text }}>{b.name}</Text>
                                            <Text style={{ color: C.sub, fontSize: 12 }}>{b.phone}</Text>
                                        </View>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        )}

                        <Text style={s.label}>Full Name *</Text>
                        <TextInput
                            style={s.input}
                            placeholder="e.g. Ramesh Kumar"
                            value={beneficiaryName}
                            onChangeText={setBeneficiaryName}
                            placeholderTextColor="#aaa"
                        />
                        <Text style={s.label}>Mobile Number</Text>
                        <TextInput
                            style={s.input}
                            placeholder="+91XXXXXXXXXX"
                            value={beneficiaryPhone}
                            onChangeText={setBeneficiaryPhone}
                            keyboardType="phone-pad"
                            placeholderTextColor="#aaa"
                        />
                        <TouchableOpacity style={s.primaryBtn} onPress={confirmBeneficiary}>
                            <LinearGradient colors={[C.primary, '#2E7D32']} style={s.btnGrad}>
                                <Text style={s.btnText}>Continue →</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                );

            // ── Step 2 ──
            case STEPS.VOICE:
                return (
                    <View style={s.card}>
                        <View style={s.stepHeader}>
                            <Icon name="account-voice" size={32} color={C.secondary} />
                            <Text style={s.stepTitle}>What does {beneficiaryName} need?</Text>
                            <Text style={s.stepSub}>Speak or type in Hindi / English / Marathi</Text>
                        </View>

                        {/* Speak / Type toggle */}
                        <View style={{ flexDirection: 'row', backgroundColor: '#F0F4F0', borderRadius: 12, padding: 4, marginBottom: 16 }}>
                            <TouchableOpacity
                                onPress={() => { setUseTextMode(false); setVoiceError(''); }}
                                style={[s.toggleBtn, !useTextMode && s.toggleBtnActive]}
                            >
                                <Icon name="microphone" size={15} color={!useTextMode ? '#fff' : C.sub} />
                                <Text style={{ color: !useTextMode ? '#fff' : C.sub, fontWeight: '700', marginLeft: 5 }}>Speak</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => { setUseTextMode(true); setVoiceError(''); }}
                                style={[s.toggleBtn, useTextMode && s.toggleBtnActive]}
                            >
                                <Icon name="keyboard" size={15} color={useTextMode ? '#fff' : C.sub} />
                                <Text style={{ color: useTextMode ? '#fff' : C.sub, fontWeight: '700', marginLeft: 5 }}>Type</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Error banner */}
                        {!!voiceError && (
                            <View style={[s.noteBox, { backgroundColor: '#FFF3E0', borderLeftColor: C.warn, marginBottom: 12 }]}>
                                <Text style={{ color: C.warn, fontSize: 13 }}>⚠️ {voiceError}</Text>
                            </View>
                        )}

                        {/* MIC MODE */}
                        {!useTextMode && (
                            <>
                                <TouchableOpacity style={s.micBtn} onPressIn={startRecording} onPressOut={stopRecording} activeOpacity={0.8}>
                                    <LinearGradient
                                        colors={recording ? ['#C62828', '#D32F2F'] : [C.secondary, '#E65100']}
                                        style={s.micGrad}
                                    >
                                        {voiceProcessing
                                            ? <ActivityIndicator size="large" color="#fff" />
                                            : <Icon name={recording ? 'microphone' : 'microphone-outline'} size={56} color="#fff" />
                                        }
                                    </LinearGradient>
                                </TouchableOpacity>
                                <Text style={{ textAlign: 'center', color: recording ? C.error : C.sub, marginBottom: 12 }}>
                                    {voiceProcessing ? 'Processing...' : recording ? '🔴 Listening... Release to process' : 'Hold the button and speak'}
                                </Text>
                            </>
                        )}

                        {/* TEXT MODE */}
                        {useTextMode && (
                            <View style={{ marginBottom: 16 }}>
                                <Text style={s.label}>Describe what you need:</Text>
                                <TextInput
                                    style={[s.input, { height: 90, textAlignVertical: 'top' }]}
                                    placeholder={'e.g. "PM Kisan status check" or "e-Shram naya registration"'}
                                    placeholderTextColor="#aaa"
                                    multiline
                                    value={typedText}
                                    onChangeText={setTypedText}
                                />
                                <TouchableOpacity
                                    style={[s.primaryBtn, { opacity: voiceProcessing ? 0.6 : 1 }]}
                                    onPress={() => classifyText(typedText)}
                                    disabled={voiceProcessing}
                                >
                                    <LinearGradient colors={[C.secondary, '#E65100']} style={s.btnGrad}>
                                        {voiceProcessing
                                            ? <ActivityIndicator color="#fff" />
                                            : <Text style={s.btnText}>🔍 Detect Scheme</Text>
                                        }
                                    </LinearGradient>
                                </TouchableOpacity>
                            </View>
                        )}

                        {/* Result */}
                        {intent?.scheme ? (
                            <View style={s.resultBox}>
                                <Text style={{ fontSize: 11, color: C.sub, fontWeight: '700', letterSpacing: 0.5 }}>SCHEME DETECTED ✅</Text>
                                <Text style={{ color: C.primary, fontWeight: '800', fontSize: 16, marginTop: 4 }}>
                                    {intent.scheme.replace(/_/g, ' ').toUpperCase()}
                                </Text>
                                <Text style={{ color: C.sub, fontSize: 13 }}>Action: {(intent.action || '').replace(/_/g, ' ')}</Text>
                                {transcript ? (
                                    <><View style={s.divider} />
                                        <Text style={{ color: C.text, fontSize: 13 }}>📝 {transcript}</Text></>
                                ) : null}
                            </View>
                        ) : null}

                        <View style={s.noteBox}>
                            <Text style={{ color: '#555', fontSize: 12 }}>
                                💡 Schemes: PM Kisan · e-Shram · Ayushman Bharat · EPFO · Widow Pension · Ration Card
                            </Text>
                        </View>

                        <View style={{ flexDirection: 'row', gap: 10, marginTop: 8 }}>
                            <TouchableOpacity style={[s.outlineBtn, { flex: 1 }]} onPress={() => setStep(STEPS.BENEFICIARY)}>
                                <Text style={s.outlineBtnText}>← Back</Text>
                            </TouchableOpacity>
                            {intent?.scheme ? (
                                <TouchableOpacity style={[s.primaryBtn, { flex: 2 }]} onPress={confirmVoiceIntent}>
                                    <LinearGradient colors={[C.primary, '#2E7D32']} style={s.btnGrad}>
                                        <Text style={s.btnText}>Confirm & Continue →</Text>
                                    </LinearGradient>
                                </TouchableOpacity>
                            ) : null}
                        </View>
                    </View>
                );

            // ── Step 3 ──
            case STEPS.DOCUMENTS:
                return (
                    <View style={s.card}>
                        <View style={s.stepHeader}>
                            <Icon name="card-account-details-outline" size={32} color={C.primary} />
                            <Text style={s.stepTitle}>Scan Documents</Text>
                            <Text style={s.stepSub}>Aadhaar, PAN, or other docs (optional but recommended)</Text>
                        </View>

                        <View style={{ flexDirection: 'row', marginBottom: 14, gap: 8, flexWrap: 'wrap' }}>
                            {['aadhaar', 'pan', 'ration_card', 'bank_passbook'].map(dt => (
                                <TouchableOpacity
                                    key={dt}
                                    style={[s.chip, docType === dt && s.chipActive]}
                                    onPress={() => setDocType(dt)}
                                >
                                    <Text style={[s.chipText, docType === dt && { color: '#fff' }]}>
                                        {dt.replace('_', ' ').toUpperCase()}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <TouchableOpacity style={s.scanBtn} onPress={() => setCameraVisible(true)}>
                            <Icon name="camera" size={28} color="#fff" />
                            <Text style={{ color: '#fff', fontWeight: '700', marginLeft: 10, fontSize: 16 }}>
                                Scan {docType.replace('_', ' ')}
                            </Text>
                        </TouchableOpacity>

                        {scannedDocs.map((doc, i) => (
                            <View key={i} style={s.docResult}>
                                <Icon name="file-check" size={22} color={C.success} />
                                <View style={{ marginLeft: 10, flex: 1 }}>
                                    <Text style={{ fontWeight: '700', color: C.text }}>{doc.type.toUpperCase()} scanned ✅</Text>
                                    <Text style={{ color: C.sub, fontSize: 12 }}>
                                        {Object.entries(doc.extracted || {}).map(([k, v]) => `${k}: ${v}`).join(' | ')}
                                    </Text>
                                </View>
                            </View>
                        ))}

                        {docProcessing && (
                            <View style={s.docResult}>
                                <ActivityIndicator size="small" color={C.primary} />
                                <Text style={{ marginLeft: 12, color: C.sub }}>Extracting data via AWS Textract...</Text>
                            </View>
                        )}

                        <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
                            <TouchableOpacity style={[s.outlineBtn, { flex: 1 }]} onPress={() => setStep(STEPS.VOICE)}>
                                <Text style={s.outlineBtnText}>← Back</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[s.primaryBtn, { flex: 2 }]} onPress={startExecution}>
                                <LinearGradient colors={[C.primary, '#2E7D32']} style={s.btnGrad}>
                                    <Text style={s.btnText}>🚀 Start Automation</Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>
                    </View>
                );

            // ── Step 4: Executing ──
            case STEPS.EXECUTING:
                return (
                    <View style={s.card}>
                        <View style={s.stepHeader}>
                            <Icon name="robot" size={36} color={C.primary} />
                            <Text style={s.stepTitle}>Agent Running</Text>
                            <Text style={s.stepSub}>{intent?.scheme?.replace('_', ' ').toUpperCase()} Portal</Text>
                        </View>

                        <ProgressBar progress={progress} />
                        <Text style={{ textAlign: 'center', color: C.sub, marginBottom: 6 }}>{progress}% complete</Text>

                        <View style={s.liveBox}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                                <PulsingDot color={C.secondary} />
                                <Text style={{ marginLeft: 8, fontWeight: '700', color: C.text }}>Live Activity</Text>
                            </View>
                            {currentStep ? (
                                <Text style={{ color: C.primary, fontWeight: '600', marginBottom: 8 }}>→ {currentStep}</Text>
                            ) : null}
                            <ScrollView style={{ maxHeight: 200 }}>
                                {stepLog.slice(-15).map((log, i) => (
                                    <Text key={i} style={{ color: C.sub, fontSize: 12, marginBottom: 3 }}>• {log}</Text>
                                ))}
                            </ScrollView>
                        </View>

                        <View style={s.noteBox}>
                            <Text style={{ color: '#555', fontSize: 13 }}>
                                🤖 Agent is navigating the live government portal using AI vision.
                                If it needs more information, you will be prompted here.
                            </Text>
                        </View>
                    </View>
                );

            // ── Step 5: Input needed ──
            case STEPS.INPUT_NEEDED:
                return (
                    <View style={s.card}>
                        <LinearGradient colors={['#E65100', '#BF360C']} style={s.inputNeededHeader}>
                            <Icon name="hand-pointing-right" size={36} color="#fff" />
                            <Text style={{ color: '#fff', fontSize: 20, fontWeight: '800', marginTop: 8 }}>Portal Needs More Info</Text>
                            <Text style={{ color: '#ffcc80', fontSize: 14, marginTop: 4 }}>{inputRequest?.message}</Text>
                        </LinearGradient>

                        {inputRequest?.screenshot_url && (
                            <View style={{ margin: 12, borderRadius: 10, overflow: 'hidden' }}>
                                <Text style={{ color: C.sub, fontSize: 12, marginBottom: 6, fontWeight: '600' }}>PORTAL SCREENSHOT</Text>
                                <Image
                                    source={{ uri: `file://${inputRequest.screenshot_url}` }}
                                    style={{ width: '100%', height: 200, borderRadius: 10 }}
                                    resizeMode="contain"
                                />
                            </View>
                        )}

                        <Text style={s.label}>Please provide the following:</Text>
                        {(inputRequest?.fields_needed || []).map(field => (
                            <View key={field} style={{ marginBottom: 12 }}>
                                <Text style={[s.label, { textTransform: 'capitalize' }]}>
                                    <Icon name="alert-circle-outline" size={14} color={C.warn} />  {field.replace(/_/g, ' ')}
                                </Text>
                                <TextInput
                                    style={s.input}
                                    placeholder={`Enter ${field.replace(/_/g, ' ')}`}
                                    placeholderTextColor="#aaa"
                                    value={inputAnswers[field] || ''}
                                    onChangeText={val => setInputAnswers(prev => ({ ...prev, [field]: val }))}
                                />
                            </View>
                        ))}

                        <TouchableOpacity
                            style={s.primaryBtn}
                            onPress={submitInputAnswer}
                            disabled={inputSubmitting}
                        >
                            <LinearGradient colors={[C.warn, C.error]} style={s.btnGrad}>
                                {inputSubmitting
                                    ? <ActivityIndicator color="#fff" />
                                    : <Text style={s.btnText}>Submit & Resume Agent →</Text>
                                }
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                );

            // ── Step 6: Result ──
            case STEPS.RESULT:
                const isSuccess = jobStatus !== 'failed';
                return (
                    <View style={s.card}>
                        <LinearGradient
                            colors={isSuccess ? ['#1B5E20', '#2E7D32'] : ['#B71C1C', '#C62828']}
                            style={s.resultHeader}
                        >
                            <Icon name={isSuccess ? 'check-circle' : 'close-circle'} size={56} color="#fff" />
                            <Text style={{ color: '#fff', fontSize: 22, fontWeight: '800', marginTop: 12 }}>
                                {isSuccess ? 'Task Completed!' : 'Task Failed'}
                            </Text>
                            <Text style={{ color: '#fff', opacity: 0.85, fontSize: 14, marginTop: 4 }}>
                                {isSuccess ? `${intent?.scheme?.replace('_', ' ')} processed successfully` : 'The agent encountered an issue'}
                            </Text>
                        </LinearGradient>

                        {result && (
                            <View style={s.resultData}>
                                <Text style={{ fontWeight: '700', color: C.primary, marginBottom: 10 }}>📋 Extracted Data</Text>
                                {Object.entries(result).map(([k, v]) => (
                                    <View key={k} style={s.dataRow}>
                                        <Text style={s.dataKey}>{k.replace(/_/g, ' ')}</Text>
                                        <Text style={s.dataVal}>{String(v)}</Text>
                                    </View>
                                ))}
                            </View>
                        )}

                        <View style={{ padding: 16, backgroundColor: '#F9FBE7', borderRadius: 12, marginBottom: 16 }}>
                            <Text style={{ fontWeight: '700', color: '#555', marginBottom: 8 }}>Steps Completed</Text>
                            {stepLog.slice(-10).map((log, i) => (
                                <Text key={i} style={{ color: C.sub, fontSize: 12, marginBottom: 3 }}>✓ {log.replace(/^\[.*?\] /, '')}</Text>
                            ))}
                        </View>

                        <TouchableOpacity style={s.primaryBtn} onPress={() => {
                            setBeneficiaryName(''); setBeneficiaryPhone(''); setBeneficiaryId('');
                            setTranscript(''); setIntent(null); setScannedDocs([]); setStepLog([]);
                            setResult(null); setJobId(''); setProgress(0);
                            setStep(STEPS.BENEFICIARY);
                        }}>
                            <LinearGradient colors={[C.primary, '#2E7D32']} style={s.btnGrad}>
                                <Text style={s.btnText}>Process Another Beneficiary</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                );

            default:
                return null;
        }
    };

    // Camera modal
    const cameraModal = (
        <Modal visible={cameraVisible} animationType="slide" onRequestClose={() => setCameraVisible(false)}>
            <View style={{ flex: 1, backgroundColor: '#000' }}>
                <Camera style={{ flex: 1 }} ref={ref => setCameraRef(ref)}>
                    <View style={s.cameraOverlay}>
                        <TouchableOpacity style={s.captureBtn} onPress={takePicture} disabled={docProcessing}>
                            {docProcessing
                                ? <ActivityIndicator size="large" color="#fff" />
                                : <Icon name="camera-iris" size={52} color="#fff" />
                            }
                        </TouchableOpacity>
                        <TouchableOpacity style={s.closeCameraBtn} onPress={() => setCameraVisible(false)}>
                            <Icon name="close" size={32} color="#fff" />
                        </TouchableOpacity>
                    </View>
                </Camera>
            </View>
        </Modal>
    );

    // Step indicator
    const STEP_ORDER = [STEPS.BENEFICIARY, STEPS.VOICE, STEPS.DOCUMENTS, STEPS.EXECUTING, STEPS.RESULT];
    const stepIdx = STEP_ORDER.indexOf(step) > -1 ? STEP_ORDER.indexOf(step) : 3;

    return (
        <View style={{ flex: 1, backgroundColor: C.bg }}>
            {/* Header */}
            <LinearGradient colors={[C.primary, '#2E7D32']} style={s.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: 12 }}>
                    <Icon name="arrow-left" size={26} color="#fff" />
                </TouchableOpacity>
                <Text style={s.headerTitle}>New Service Request</Text>
                <Icon name="hospital-building" size={22} color="#fff" />
            </LinearGradient>

            {/* Step dots */}
            <View style={s.stepDots}>
                {['Person', 'Voice', 'Docs', 'Agent', 'Done'].map((label, i) => (
                    <View key={i} style={{ alignItems: 'center', flex: 1 }}>
                        <View style={[s.dot, i <= stepIdx && s.dotActive]}>
                            <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>{i + 1}</Text>
                        </View>
                        <Text style={{ fontSize: 9, color: i <= stepIdx ? C.primary : '#bbb', marginTop: 2 }}>{label}</Text>
                    </View>
                ))}
            </View>

            <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
                {renderStep()}
            </ScrollView>

            {cameraModal}
        </View>
    );
}

// ─────────────────────────────────────────────────────────────
const s = StyleSheet.create({
    header: { flexDirection: 'row', alignItems: 'center', paddingTop: 48, paddingBottom: 16, paddingHorizontal: 18 },
    headerTitle: { flex: 1, color: '#fff', fontSize: 20, fontWeight: '800' },
    stepDots: { flexDirection: 'row', backgroundColor: '#fff', paddingVertical: 10, paddingHorizontal: 16, borderBottomWidth: 1, borderColor: C.border },
    dot: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#ccc', alignItems: 'center', justifyContent: 'center' },
    dotActive: { backgroundColor: C.primary },
    card: { backgroundColor: C.card, borderRadius: 20, padding: 20, marginBottom: 16, elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6 },
    stepHeader: { alignItems: 'center', marginBottom: 20 },
    stepTitle: { fontSize: 20, fontWeight: '800', color: C.text, marginTop: 10, textAlign: 'center' },
    stepSub: { color: C.sub, fontSize: 13, textAlign: 'center', marginTop: 4 },
    label: { fontSize: 13, fontWeight: '700', color: C.sub, marginBottom: 6, marginTop: 4 },
    input: { borderWidth: 1.5, borderColor: C.border, borderRadius: 12, padding: 14, fontSize: 16, color: C.text, backgroundColor: '#FAFFFE', marginBottom: 12 },
    primaryBtn: { borderRadius: 14, overflow: 'hidden', marginTop: 4 },
    btnGrad: { padding: 16, alignItems: 'center', justifyContent: 'center' },
    btnText: { color: '#fff', fontSize: 17, fontWeight: '800' },
    outlineBtn: { borderWidth: 2, borderColor: C.primary, borderRadius: 14, padding: 14, alignItems: 'center', justifyContent: 'center' },
    outlineBtnText: { color: C.primary, fontWeight: '700', fontSize: 15 },
    secondaryBtn: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: C.border, borderRadius: 10, padding: 10, marginBottom: 14 },
    secondaryBtnText: { color: C.primary, fontWeight: '600' },
    benItem: { flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderColor: C.border },
    micBtn: { alignSelf: 'center', marginVertical: 20 },
    micGrad: { width: 120, height: 120, borderRadius: 60, alignItems: 'center', justifyContent: 'center', elevation: 8, shadowColor: C.secondary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8 },
    resultBox: { backgroundColor: '#E8F5E9', borderRadius: 12, padding: 14, marginBottom: 12 },
    noteBox: { backgroundColor: '#FFF8E1', borderRadius: 12, padding: 12, marginBottom: 8, borderLeftWidth: 3, borderLeftColor: C.secondary },
    divider: { height: 1, backgroundColor: '#C8E6C9', marginVertical: 10 },
    chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1.5, borderColor: C.primary },
    chipActive: { backgroundColor: C.primary },
    chipText: { color: C.primary, fontSize: 12, fontWeight: '700' },
    scanBtn: { backgroundColor: C.secondary, borderRadius: 14, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
    docResult: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#F1F8E9', borderRadius: 10, padding: 12, marginBottom: 10 },
    liveBox: { backgroundColor: '#F0F4F0', borderRadius: 14, padding: 14, marginBottom: 12 },
    inputNeededHeader: { borderRadius: 14, padding: 20, alignItems: 'center', marginBottom: 16 },
    resultHeader: { borderRadius: 14, padding: 28, alignItems: 'center', marginBottom: 16 },
    resultData: { backgroundColor: '#F1F8E9', borderRadius: 12, padding: 14, marginBottom: 14 },
    dataRow: { flexDirection: 'row', borderBottomWidth: 1, borderColor: '#C8E6C9', paddingVertical: 8 },
    dataKey: { flex: 1, color: C.sub, fontSize: 13, fontWeight: '600', textTransform: 'capitalize' },
    dataVal: { flex: 1.5, color: C.text, fontSize: 13, fontWeight: '700' },
    cameraOverlay: { flex: 1, justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 40 },
    captureBtn: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#fff' },
    closeCameraBtn: { position: 'absolute', top: 50, right: 20 },
    toggleBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 10 },
    toggleBtnActive: { backgroundColor: C.primary },
});
