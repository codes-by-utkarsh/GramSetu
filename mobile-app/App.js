import 'react-native-gesture-handler';
import React, { useState, useEffect, createContext, useContext } from 'react';
import { View, StyleSheet, Text, Animated, TouchableOpacity, Alert, TextInput, ScrollView, ActivityIndicator, Image } from 'react-native';
import { Button, Appbar, Card, Title, Paragraph, Provider as PaperProvider, Avatar, MD3LightTheme, Badge, Modal, Portal } from 'react-native-paper';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createDrawerNavigator, DrawerContentScrollView, DrawerItemList, DrawerItem } from '@react-navigation/drawer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';
import { Camera } from 'expo-camera';
import * as FileSystem from 'expo-file-system';
import Icon from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { Picker } from '@react-native-picker/picker';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import NewJobScreen from './screens/NewJobScreen';
import { API_BASE, VOICE_API, AGENT_API, DOC_API } from './config';

// ==========================================
// 1. i18n Dictionary & Context Setup
// ==========================================
const translations = {
    en: {
        appName: "GramSetu",
        tagline: "Empowering Rural India",
        chooseLang: "Select Language",
        continue: "Continue",
        authTitle: "Access Your Account",
        authSubtitle: "Welcome to GramSetu Network",
        whatsappNum: "WhatsApp Number",
        password: "Password",
        otpTitle: "Verification",
        otpSubtitle: "Enter the OTP sent to your WhatsApp",
        enterOtp: "Enter 6-digit OTP",
        verifyOtp: "Verify & Secure Login",
        autopilot: "Autopilot for CSC",
        holdSpeak: "Hold to speak your command.",
        listening: "Listening... Release to process",
        holdExample: "Hold to speak (e.g., 'PM-Kisan status')",
        scanAadhaar: "Scan Aadhaar",
        todayQueue: "Today's Queue",
        processing: "Processing...",
        logout: "Logout",
        errorRequired: "Please fill all required fields",
    },
    hi: {
        appName: "ग्रामसेतु",
        tagline: "ग्रामीण भारत का सशक्तिकरण",
        chooseLang: "भाषा चुनें",
        continue: "आगे बढ़ें",
        authTitle: "अपना अकाउंट खोलें",
        authSubtitle: "ग्रामसेतु नेटवर्क में आपका स्वागत है",
        whatsappNum: "व्हाट्सएप नंबर",
        password: "पासवर्ड",
        otpTitle: "सत्यापन",
        otpSubtitle: "अपने व्हाट्सएप पर भेजा गया ओटीपी दर्ज करें",
        enterOtp: "6-अंकीय ओटीपी दर्ज करें",
        verifyOtp: "सत्यापित करें और लॉगिन करें",
        autopilot: "सीएससी के लिए ऑटोपायलट",
        holdSpeak: "अपना कमांड बोलने के लिए दबाए रखें",
        listening: "सुन रहे हैं... प्रोसेस करने के लिए छोड़ें",
        holdExample: "बोलने के लिए दबाए रखें (जैसे, 'पीएम-किसान स्थिति')",
        scanAadhaar: "आधार स्कैन करें",
        todayQueue: "आज की कतार",
        processing: "प्रक्रिया हो रही है...",
        logout: "लॉगआउट",
        errorRequired: "कृपया सभी आवश्यक फ़ील्ड भरें",
    },
    mr: {
        appName: "ग्रामसेतू",
        tagline: "ग्रामीण भारताचे सक्षमीकरण",
        chooseLang: "तुमची भाषा निवडा",
        continue: "पुढे जा",
        authTitle: "तुमचे खाते उघडा",
        authSubtitle: "ग्रामसेतू नेटवर्कमध्ये आपले स्वागत आहे",
        whatsappNum: "व्हॉट्सअ‍ॅप नंबर",
        password: "पासवर्ड",
        otpTitle: "पडताळणी",
        otpSubtitle: "तुमच्या व्हॉट्सअ‍ॅपवर पाठवलेला OTP सबमिट करा",
        enterOtp: "6-अंकी OTP टाका",
        verifyOtp: "पडताळणी करा आणि लॉगिन करा",
        autopilot: "CSC साठी ऑटोपायलट",
        holdSpeak: "तुमची आज्ञा बोलण्यासाठी धरून ठेवा",
        listening: "ऐकत आहे... प्रक्रिया करण्यासाठी सोडा",
        holdExample: "बोलण्यासाठी धरून ठेवा (उदा. 'पीएम-किसान स्थिती')",
        scanAadhaar: "आधार स्कॅन करा",
        todayQueue: "आजची रांग",
        processing: "प्रक्रिया सुरू आहे...",
        logout: "लॉगआउट",
        errorRequired: "कृपया सर्व आवश्यक फील्ड भरा",
    },
    ta: {
        appName: "கிராமசேது",
        tagline: "கிராமப்புற இந்தியாவை மேம்படுத்துதல்",
        chooseLang: "உங்கள் மொழியைத் தேர்வுசெய்யவும்",
        continue: "தொடரவும்",
        authTitle: "உங்கள் கணக்கை அணுகவும்",
        authSubtitle: "கிராமசேது நெட்வொர்க்கிற்கு வரவேற்கிறோம்",
        whatsappNum: "வாட்ஸ்அப் எண்",
        password: "கடவுச்சொல்",
        otpTitle: "சரிபார்ப்பு",
        otpSubtitle: "உங்கள் வாட்ஸ்அப்பிற்கு அனுப்பப்பட்ட OTP ஐ உள்ளிடவும்",
        enterOtp: "6 இலக்க OTP ஐ உள்ளிடவும்",
        verifyOtp: "சரிபார்த்து உள்நுழைக",
        autopilot: "CSCக்கான ஆட்டோபைலட்",
        holdSpeak: "உங்கள் கட்டளையைப் பேச அழுத்திப் பிடிக்கவும்",
        listening: "கேட்கிறது... செயலாக்க விடுங்கள்",
        holdExample: "பேச அழுத்திப் பிடிக்கவும் (உதாரணமாக, 'பிஎம்-கிசான் நிலை')",
        scanAadhaar: "ஆதாரை ஸ்கேன் செய்",
        todayQueue: "இன்றைய வரிசை",
        processing: "செயலாக்கப்படுகிறது...",
        logout: "வெளியேறு",
        errorRequired: "அனைத்து துறைகளையும் நிரப்பவும்",
    },
    te: {
        appName: "గ్రామసేతు",
        tagline: "గ్రామీణ భారతదేశ సాధికారత",
        chooseLang: "మీ భాషను ఎంచుకోండి",
        continue: "కొనసాగించండి",
        authTitle: "మీ ఖాతాను ప్రాప్యత చేయండి",
        authSubtitle: "గ్రామసేతు నెట్‌వర్క్‌కు స్వాగతం",
        whatsappNum: "వాట్సాప్ నంబర్",
        password: "పాస్వర్డ్",
        otpTitle: "ధృవీకరణ",
        otpSubtitle: "మీ వాట్సాప్‌కు పంపిన ఓటీపీని నమోదు చేయండి",
        enterOtp: "6 అంకెల ఓటీపీని నమోదు చేయండి",
        verifyOtp: "ధృవీకరించండి & లాగిన్",
        autopilot: "CSC కోసం ఆటోపైలట్",
        holdSpeak: "మీ కమాండ్ మాట్లాడటానికి పట్టుకోండి",
        listening: "వింటున్నది... ప్రాసెస్ చేయడానికి వదిలివేయండి",
        holdExample: "మాట్లాడటానికి పట్టుకోండి (ఉదా. 'పీఎం-కిసాన్ స్థితి')",
        scanAadhaar: "ఆధార్‌ని స్కాన్ చేయండి",
        todayQueue: "నేటి క్యూ",
        processing: "ప్రాసెస్ అవుతోంది...",
        logout: "లాగ్అవుట్",
        errorRequired: "దయచేసి అన్ని వివరాలు పూరించండి",
    }
};

const LanguageContext = createContext();

export const useTranslation = () => {
    const { lang } = useContext(LanguageContext);
    return translations[lang] || translations['en'];
};

// --- Theming ---
const gramSetuTheme = {
    ...MD3LightTheme,
    colors: {
        ...MD3LightTheme.colors,
        primary: '#003366', // Deep Governance Blue
        secondary: '#FF9933', // Vibrant Saffron
        background: 'transparent',
        surface: '#ffffff',
        error: '#B00020',
    },
};

const Stack = createStackNavigator();
const Drawer = createDrawerNavigator();

// ==========================================
// Reusable Gradient
// ==========================================
const GradientBackground = ({ children }) => (
    <LinearGradient
        colors={['#E6F2FF', '#FFFFFF', '#FFEDD9']}
        locations={[0, 0.5, 1]}
        style={styles.container}
    >
        {children}
    </LinearGradient>
);

// ==========================================
// Centralized Logo Component
// ==========================================
const GramSetuLogo = ({ size = 110 }) => {
    try {
        return (
            <Image
                source={require('./assets/logo.png')}
                style={{ width: size, height: size, resizeMode: 'contain', marginBottom: 15 }}
            />
        );
    } catch (e) {
        // Fallback if logo not yet bundled correctly
        return <Icon name="bridge" size={size} color="#FF9933" style={{ marginBottom: 15 }} />;
    }
};

// ==========================================
// 2. Splash Screen
// ==========================================
function SplashScreen({ navigation }) {
    const fadeAnim = useState(new Animated.Value(0))[0];
    const { setLang } = useContext(LanguageContext);

    useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
        }).start();

        const checkLogin = async () => {
            const storedLang = await AsyncStorage.getItem('language');
            if (storedLang) setLang(storedLang);

            const user = await AsyncStorage.getItem('user');
            setTimeout(() => {
                if (user) {
                    navigation.replace('Dashboard');
                } else {
                    navigation.replace('LanguageSelection');
                }
            }, 3000);
        };
        checkLogin();
    }, []);

    return (
        <LinearGradient colors={['#ffffff', '#ffffff']} style={[styles.container, styles.centerAll]}>
            <Animated.View style={{ opacity: fadeAnim, alignItems: 'center' }}>
                <GramSetuLogo size={140} />
                <Text style={[styles.splashTitle, { color: gramSetuTheme.colors.primary }]}>GramSetu</Text>
                <Text style={[styles.splashSubtitle, { color: '#666' }]}>Empowering Rural India</Text>
                <ActivityIndicator color={gramSetuTheme.colors.primary} style={{ marginTop: 30 }} size="large" />
            </Animated.View>
        </LinearGradient>
    );
}

// ==========================================
// 3. Language Selection
// ==========================================
function LanguageSelectionScreen({ navigation }) {
    const t = useTranslation();
    const { lang, setLang } = useContext(LanguageContext);

    const confirmLanguage = async () => {
        await AsyncStorage.setItem('language', lang);
        navigation.navigate('Auth');
    };

    return (
        <GradientBackground>
            <View style={[styles.centerAll, { flex: 1, paddingHorizontal: 20 }]}>
                <Animated.View style={{ width: '100%', alignItems: 'center' }}>
                    <GramSetuLogo size={90} />

                    <Card style={[styles.authCard, { width: '100%' }]}>
                        <Title style={styles.authTitle}>{t.chooseLang}</Title>

                        <View style={styles.pickerContainer}>
                            <Picker
                                selectedValue={lang}
                                onValueChange={(itemValue) => setLang(itemValue)}
                                style={styles.picker}
                            >
                                <Picker.Item label="English (अंग्रेज़ी)" value="en" />
                                <Picker.Item label="हिंदी (Hindi)" value="hi" />
                                <Picker.Item label="मराठी (Marathi)" value="mr" />
                                <Picker.Item label="தமிழ் (Tamil)" value="ta" />
                                <Picker.Item label="తెలుగు (Telugu)" value="te" />
                            </Picker>
                        </View>

                        <Button
                            mode="contained"
                            onPress={confirmLanguage}
                            style={{ paddingVertical: 8, marginTop: 10 }}
                            buttonColor={gramSetuTheme.colors.secondary}
                            labelStyle={{ fontSize: 18, fontWeight: 'bold' }}
                        >
                            {t.continue}
                        </Button>
                    </Card>
                </Animated.View>
            </View>
        </GradientBackground>
    );
}

// ==========================================
// 4a. Sign Up Screen
// ==========================================
function SignUpScreen({ navigation }) {
    const t = useTranslation();
    const [whatsapp, setWhatsapp] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [twilioNumber, setTwilioNumber] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSignUp = async () => {
        if (!whatsapp || !password || !fullName || !twilioNumber) {
            Alert.alert('Error', t.errorRequired);
            return;
        }

        setLoading(true);
        try {
            const response = await fetch(`${API_BASE}/auth/signup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone: whatsapp, password, fullName, twilioNumber, cscId: '' })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Sign Up Failed');
            }

            setLoading(false);
            // After successful signup, they need OTP to verify
            navigation.navigate('OTP', { whatsapp, password, twilioNumber, isNewUser: true, fullName });

        } catch (err) {
            setLoading(false);
            Alert.alert('Sign Up Error', err.message);
        }
    };

    return (
        <GradientBackground>
            <View style={[styles.centerAll, { flex: 1, paddingVertical: 20 }]}>
                <GramSetuLogo size={60} />
                <Card style={[styles.authCard, { width: '90%', elevation: 8 }]}>
                    <Card.Content>
                        <Title style={styles.authTitle}>Sign Up for GramSetu</Title>
                        <Paragraph style={styles.authSubtitle}>Create your VLE Profile</Paragraph>

                        <TextInput
                            style={styles.input}
                            placeholder="Full Name"
                            placeholderTextColor="#888"
                            value={fullName}
                            onChangeText={setFullName}
                        />
                        <TextInput
                            style={styles.input}
                            placeholder={t.whatsappNum}
                            placeholderTextColor="#888"
                            keyboardType="phone-pad"
                            value={whatsapp}
                            onChangeText={setWhatsapp}
                        />
                        <TextInput
                            style={styles.input}
                            placeholder="+1 (Twilio Sender Number)"
                            placeholderTextColor="#888"
                            keyboardType="phone-pad"
                            value={twilioNumber}
                            onChangeText={setTwilioNumber}
                        />
                        <TextInput
                            style={styles.input}
                            placeholder={t.password}
                            placeholderTextColor="#888"
                            secureTextEntry
                            value={password}
                            onChangeText={setPassword}
                        />

                        <Button
                            mode="contained"
                            onPress={handleSignUp}
                            style={styles.submitBtn}
                            buttonColor={gramSetuTheme.colors.secondary}
                            labelStyle={{ fontSize: 16, fontWeight: 'bold' }}
                            loading={loading}
                            disabled={loading}
                        >
                            Sign Up & Request OTP
                        </Button>

                        <Button
                            mode="text"
                            onPress={() => navigation.navigate('Auth')}
                            style={{ marginTop: 10 }}
                            textColor={gramSetuTheme.colors.primary}
                        >
                            Already have an account? Login
                        </Button>
                    </Card.Content>
                </Card>
            </View>
        </GradientBackground>
    );
}

// ==========================================
// 4b. Auth / Login Screen
// ==========================================
function AuthScreen({ navigation }) {
    const t = useTranslation();
    const [whatsapp, setWhatsapp] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleContinue = async () => {
        if (!whatsapp || !password) {
            Alert.alert('Error', t.errorRequired);
            return;
        }

        setLoading(true);
        try {
            const response = await fetch(`${API_BASE}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone: whatsapp, password })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || 'Login Failed');
            }

            setLoading(false);
            navigation.navigate('OTP', { whatsapp, password, isNewUser: false });

        } catch (err) {
            setLoading(false);
            Alert.alert('Login Error', err.message);
        }
    };

    return (
        <GradientBackground>
            <View style={[styles.centerAll, { flex: 1 }]}>
                <GramSetuLogo size={80} />

                <Card style={[styles.authCard, { width: '90%', elevation: 8 }]}>
                    <Card.Content>
                        <Title style={styles.authTitle}>{t.authTitle}</Title>
                        <Paragraph style={styles.authSubtitle}>{t.authSubtitle}</Paragraph>

                        <TextInput
                            style={styles.input}
                            placeholder={t.whatsappNum}
                            placeholderTextColor="#888"
                            keyboardType="phone-pad"
                            value={whatsapp}
                            onChangeText={setWhatsapp}
                        />
                        <TextInput
                            style={styles.input}
                            placeholder={t.password}
                            placeholderTextColor="#888"
                            secureTextEntry
                            value={password}
                            onChangeText={setPassword}
                        />

                        <Button
                            mode="contained"
                            onPress={handleContinue}
                            style={styles.submitBtn}
                            buttonColor={gramSetuTheme.colors.primary}
                            labelStyle={{ fontSize: 16 }}
                            loading={loading}
                            disabled={loading}
                        >
                            {t.continue}
                        </Button>

                        <Button
                            mode="text"
                            onPress={() => navigation.navigate('SignUp')}
                            style={{ marginTop: 10 }}
                            textColor={gramSetuTheme.colors.secondary}
                        >
                            New VLE? Create an Account
                        </Button>
                    </Card.Content>
                </Card>
            </View>
        </GradientBackground>
    );
}

// ==========================================
// 5. OTP Screen
// ==========================================
function OtpScreen({ route, navigation }) {
    const t = useTranslation();
    const { whatsapp, password, isNewUser, twilioNumber, fullName } = route.params;
    const [otp, setOtp] = useState('');
    const [loading, setLoading] = useState(false);

    const handleVerify = async () => {
        if (!otp) {
            Alert.alert('Error', t.errorRequired);
            return;
        }

        setLoading(true);
        try {
            // Verify against Real AWS Python Backend
            const response = await fetch(`${API_BASE}/auth/verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    phone: whatsapp,
                    otp,
                    is_new_user: isNewUser || false,
                    twilio_number: twilioNumber || "",
                    fullName: fullName || ""
                })
            });

            if (!response.ok) {
                throw new Error('Invalid OTP passed');
            }

            // Authentication & DynamoDB Registration Success
            const userData = { phone: whatsapp, isLoggedIn: true, isNewUser, twilioNumber };
            await AsyncStorage.setItem('user', JSON.stringify(userData));

            // Clear navigation stack and go to Dashboard
            navigation.reset({
                index: 0,
                routes: [{ name: 'Dashboard' }],
            });

        } catch (err) {
            Alert.alert('Verification Failed', err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <GradientBackground>
            <View style={[styles.centerAll, { flex: 1 }]}>
                <Icon name="shield-check" size={80} color="#4CAF50" style={{ marginBottom: 20 }} />

                <Card style={[styles.authCard, { width: '90%', elevation: 8 }]}>
                    <Card.Content>
                        <Title style={styles.authTitle}>{t.otpTitle}</Title>
                        <Paragraph style={[styles.authSubtitle, { marginBottom: 5 }]}>{t.otpSubtitle}</Paragraph>
                        <Paragraph style={{ textAlign: 'center', color: gramSetuTheme.colors.primary, fontWeight: 'bold', marginBottom: 25 }}>
                            +91 {whatsapp}
                        </Paragraph>

                        <TextInput
                            style={[styles.input, { textAlign: 'center', fontSize: 24, letterSpacing: 5 }]}
                            placeholder="× × × × × ×"
                            placeholderTextColor="#888"
                            keyboardType="number-pad"
                            maxLength={6}
                            value={otp}
                            onChangeText={setOtp}
                        />

                        <Button
                            mode="contained"
                            onPress={handleVerify}
                            style={styles.submitBtn}
                            buttonColor={gramSetuTheme.colors.secondary}
                            labelStyle={{ fontSize: 16, fontWeight: 'bold' }}
                            loading={loading}
                            disabled={loading}
                        >
                            {t.verifyOtp}
                        </Button>
                    </Card.Content>
                </Card>
            </View>
        </GradientBackground>
    );
}

// ==========================================
// 6. Main Dashboard
// ==========================================
function DashboardScreen({ navigation }) {
    const t = useTranslation();
    const { lang } = useContext(LanguageContext); // Fix: extract lang from context
    const [recording, setRecording] = useState(null);
    const [hasPermissions, setHasPermissions] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [user, setUser] = useState(null);
    const [networkOnline, setNetworkOnline] = useState(true);
    const [transcriptModal, setTranscriptModal] = useState({ visible: false, text: '', confidence: 0, intent: '' });

    const [queuedJobs, setQueuedJobs] = useState([
        { id: '1', title: 'PM-Kisan Status', citizen: 'Ramesh Kumar', status: 'completed', time: '10:30 AM' },
        { id: '2', title: 'Awaas Yojana Apply', citizen: 'Lakshmi Devi', status: 'syncing', time: '11:15 AM' },
    ]);

    useEffect(() => {
        (async () => {
            const audioPermission = await Audio.requestPermissionsAsync();
            const cameraPermission = await Camera.requestCameraPermissionsAsync();
            setHasPermissions(audioPermission.status === 'granted' && cameraPermission.status === 'granted');

            const u = await AsyncStorage.getItem('user');
            if (u) setUser(JSON.parse(u));

            // Simulate Network Watcher
            setInterval(() => {
                setNetworkOnline(Math.random() > 0.1);
            }, 10000);
        })();
    }, []);

    const handleLogout = async () => {
        await AsyncStorage.removeItem('user');
        navigation.replace('Auth');
    }

    const startRecording = async () => {
        if (!hasPermissions) {
            Alert.alert('Permissions Required', 'Grant audio/camera permissions.'); return;
        }
        try {
            await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
            const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
            setRecording(recording);
        } catch (err) { console.error('Failed to start recording', err); }
    };

    const stopRecording = async () => {
        const currentRecording = recording;
        setRecording(undefined);
        setIsProcessing(true);

        try {
            await currentRecording.stopAndUnloadAsync();
            const uri = currentRecording.getURI();

            // Read the audio file as Base64 format
            const audioBase64 = await FileSystem.readAsStringAsync(uri, {
                encoding: FileSystem.EncodingType.Base64,
            });

            // Create a pending visual job ticket
            const newJobId = Math.floor(Math.random() * 1000).toString();
            const pendingJob = { id: newJobId, title: 'Voice Request - Analyzing...', citizen: 'Unknown', status: 'processing', time: 'Just now' };
            setQueuedJobs(currentJobs => [pendingJob, ...currentJobs]);

            // Transcribe and Understand the AI intent
            const response = await fetch(`${VOICE_API}/process-audio`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    audio_base64: audioBase64,
                    language_hint: lang === 'en' ? 'hi' : lang, // default to hindi for English fallback
                    vle_id: user?.phone || 'unknown',
                    session_id: 'voice-' + newJobId
                })
            });

            if (!response.ok) throw new Error('Failed to process voice command');

            const voiceResult = await response.json();

            // Map AI's detected intent down to a UI friendly state
            let friendlyTitle = voiceResult.scheme ? voiceResult.scheme.replace('_', ' ').toUpperCase() : 'General Support';
            friendlyTitle += ` (${voiceResult.intent})`;

            setQueuedJobs(currentJobs => currentJobs.map(job =>
                job.id === newJobId ? {
                    ...job,
                    title: friendlyTitle,
                    citizen: 'Requires Details',
                    status: voiceResult.missing_info?.length > 0 ? 'pending_scan' : 'completed'
                } : job
            ));

            // Show feedback modal
            setTranscriptModal({
                visible: true,
                text: voiceResult.transcript || 'Unknown Audio',
                confidence: Math.round((voiceResult.confidence || 0) * 100),
                intent: voiceResult.intent || 'Unknown'
            });

        } catch (err) {
            console.error(err);
            Alert.alert('Voice Processing Error', 'Make sure port 8001 Voice Service is running.');
        } finally {
            setIsProcessing(false);
        }
    };

    const executeAgentTask = async (schemeId, intentAction) => {
        Alert.alert(
            "Initializing Automation",
            `Connecting to Visual Agent for ${schemeId.toUpperCase()}...`
        );

        const newJobId = Math.floor(Math.random() * 10000).toString();
        const pendingJob = { id: newJobId, title: `Agent: ${schemeId}`, citizen: 'Executing Form...', status: 'processing', time: 'Just now' };
        setQueuedJobs(currentJobs => [pendingJob, ...currentJobs]);

        try {
            const response = await fetch(`${AGENT_API}/execute-task`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    task_id: newJobId,
                    scheme: schemeId,
                    action: intentAction,
                    form_data: {
                        "name": user?.fullName || "Demo User",
                        "citizen_phone": user?.twilioNumber || user?.phone || "+919999999999"
                    },
                    session_state: null
                })
            });

            const result = await response.json();

            setQueuedJobs(currentJobs => currentJobs.map(job =>
                job.id === newJobId ? {
                    ...job,
                    title: `Agent (${schemeId})`,
                    citizen: result.acknowledgement_number || 'Completed',
                    status: result.status === 'failed' ? 'error' : 'completed'
                } : job
            ));

            if (result.status === 'completed') {
                Alert.alert("Agent Success!", "Visual execution complete.");
            } else {
                Alert.alert("Agent Warning", result.error_message || "Task did not complete successfully.");
            }
        } catch (e) {
            console.error(e);
            Alert.alert("Agent Offline", "Check if Port 8002 AWS Bedrock Agent Service is running.");

            setQueuedJobs(currentJobs => currentJobs.map(job =>
                job.id === newJobId ? { ...job, status: 'error', citizen: 'Failed' } : job
            ));
        }
    };

    const renderJobStatusIcon = (status) => {
        switch (status) {
            case 'completed': return <Avatar.Icon size={32} icon="check" style={{ backgroundColor: '#4CAF50' }} />;
            case 'processing': return <ActivityIndicator color={gramSetuTheme.colors.primary} />;
            case 'syncing': return <Avatar.Icon size={32} icon="cloud-sync" style={{ backgroundColor: '#FF9933' }} />;
            case 'pending_scan': return <Avatar.Icon size={32} icon="camera-account" style={{ backgroundColor: '#E91E63' }} />;
            default: return <Avatar.Icon size={32} icon="clock-outline" style={{ backgroundColor: '#9E9E9E' }} />;
        }
    };

    return (
        <View style={{ flex: 1, backgroundColor: '#F5F7FA' }}>
            <Appbar.Header style={{ backgroundColor: gramSetuTheme.colors.primary, elevation: 5 }}>
                <Appbar.Action icon="menu" color="#ffffff" onPress={() => navigation.toggleDrawer()} />
                <Appbar.Content title={t.appName} subtitle={`VLE: ${user?.phone || '...'}`} color="#ffffff" />
                <Badge size={14} style={{ backgroundColor: networkOnline ? '#4CAF50' : '#F44336', marginRight: 15, marginBottom: 15 }} />
            </Appbar.Header>

            <Portal>
                <Modal visible={transcriptModal.visible} onDismiss={() => setTranscriptModal({ ...transcriptModal, visible: false })} contentContainerStyle={styles.modalContainer}>
                    <Title style={styles.modalTitle}>AI Brain Feedback</Title>
                    <Paragraph style={{ fontSize: 16, marginBottom: 10 }}>
                        <Text style={{ fontWeight: 'bold', color: '#B0BEC5' }}>Heard:</Text> "{transcriptModal.text}"
                    </Paragraph>
                    <Paragraph style={{ fontSize: 14 }}>
                        <Text style={{ fontWeight: 'bold' }}>Mapped Intent:</Text> {transcriptModal.intent.toUpperCase()}
                    </Paragraph>
                    <Paragraph style={{ fontSize: 14, color: transcriptModal.confidence > 80 ? '#4CAF50' : '#FF9800' }}>
                        <Text style={{ fontWeight: 'bold', color: '#333' }}>Confidence Match:</Text> {transcriptModal.confidence}%
                    </Paragraph>
                    <Button mode="contained" onPress={() => setTranscriptModal({ ...transcriptModal, visible: false })} style={{ marginTop: 20 }} buttonColor={gramSetuTheme.colors.primary}>Got It</Button>
                </Modal>
            </Portal>

            <ScrollView style={styles.dashboardContainer} contentContainerStyle={{ paddingBottom: 40 }}>
                {/* Hero Section */}
                <LinearGradient
                    colors={['#003366', '#004080', '#0059b3']}
                    style={styles.heroCard}
                >
                    <Card.Content style={styles.heroContent}>
                        <Title style={[styles.heroTitle, { color: '#ffffff' }]}>{t.autopilot}</Title>
                        <Paragraph style={[styles.heroSubtitle, { color: '#d9d9d9' }]}>{t.holdSpeak}</Paragraph>

                        <TouchableOpacity
                            style={[styles.micButton, recording && styles.micButtonRecording]}
                            onPressIn={startRecording}
                            onPressOut={stopRecording}
                            activeOpacity={0.8}
                        >
                            <LinearGradient
                                colors={recording ? ['#FF416C', '#FF4B2B'] : ['#FF9933', '#FF8000']}
                                style={styles.micGradient}
                            >
                                <Icon name={recording ? "microphone-outline" : "microphone"} size={65} color="#ffffff" />
                            </LinearGradient>
                        </TouchableOpacity>
                        <Text style={[styles.micHelperText, { color: recording ? '#FF416C' : '#FF9933' }]}>
                            {recording ? t.listening : t.holdExample}
                        </Text>
                    </Card.Content>
                </LinearGradient>

                {/* Stats Section */}
                <View style={styles.statsContainer}>
                    <Card style={styles.statCard}>
                        <Card.Content style={styles.statContent}>
                            <Icon name="check-decagram" size={30} color="#4CAF50" />
                            <Text style={styles.statValue}>124</Text>
                            <Text style={styles.statLabel}>Completed</Text>
                        </Card.Content>
                    </Card>
                    <Card style={styles.statCard}>
                        <Card.Content style={styles.statContent}>
                            <Icon name="clock-fast" size={30} color="#FF9800" />
                            <Text style={styles.statValue}>8</Text>
                            <Text style={styles.statLabel}>Pending</Text>
                        </Card.Content>
                    </Card>
                    <Card style={styles.statCard}>
                        <Card.Content style={styles.statContent}>
                            <Icon name="currency-inr" size={30} color="#2196F3" />
                            <Text style={styles.statValue}>4.2k</Text>
                            <Text style={styles.statLabel}>Earned</Text>
                        </Card.Content>
                    </Card>
                </View>

                {/* New Service Request — primary CTA */}
                <TouchableOpacity
                    onPress={() => navigation.navigate('NewJob')}
                    activeOpacity={0.88}
                    style={{ marginBottom: 20 }}
                >
                    <LinearGradient
                        colors={['#FF9800', '#E65100']}
                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                        style={{
                            borderRadius: 18, padding: 20, flexDirection: 'row',
                            alignItems: 'center', elevation: 8,
                            shadowColor: '#FF9800', shadowOffset: { width: 0, height: 4 },
                            shadowOpacity: 0.4, shadowRadius: 8
                        }}
                    >
                        <Icon name="plus-circle" size={42} color="#fff" />
                        <View style={{ marginLeft: 16, flex: 1 }}>
                            <Text style={{ color: '#fff', fontSize: 20, fontWeight: '900' }}>New Service Request</Text>
                            <Text style={{ color: '#FFE0B2', fontSize: 13, marginTop: 2 }}>
                                Voice → Aadhaar → AI Portal Automation
                            </Text>
                        </View>
                        <Icon name="chevron-right" size={28} color="#fff" />
                    </LinearGradient>
                </TouchableOpacity>

                {/* Scheme quick tiles */}
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 }}>
                    {[
                        { label: 'PM-Kisan', icon: 'sprout', scheme: 'pm_kisan' },
                        { label: 'e-Shram', icon: 'hammer-wrench', scheme: 'e_shram' },
                        { label: 'Ayushman', icon: 'hospital-box', scheme: 'ayushman_bharat' },
                        { label: 'EPFO', icon: 'shield-account', scheme: 'epfo' },
                        { label: 'Pension', icon: 'account-heart', scheme: 'widow_pension' },
                        { label: 'Scan Aadhaar', icon: 'card-scan', scheme: null },
                    ].map(({ label, icon, scheme }) => (
                        <TouchableOpacity
                            key={label}
                            style={{
                                width: '30%', backgroundColor: '#fff', borderRadius: 14, padding: 14,
                                alignItems: 'center', elevation: 2, borderWidth: 1, borderColor: '#C8E6C9'
                            }}
                            onPress={() => scheme ? navigation.navigate('NewJob') : navigation.navigate('Scanner')}
                        >
                            <Icon name={icon} size={28} color={gramSetuTheme.colors.primary} />
                            <Text style={{ color: '#1a1a1a', fontWeight: '700', marginTop: 6, fontSize: 12, textAlign: 'center' }}>{label}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <Title style={styles.sectionTitle}>{t.todayQueue}</Title>
                {queuedJobs.map((job) => (
                    <Card key={job.id} style={styles.jobCard} mode="elevated">
                        <Card.Title
                            title={job.title}
                            titleStyle={{ fontWeight: '600', fontSize: 16 }}
                            subtitle={`${job.citizen} • ${job.time}`}
                            left={() => renderJobStatusIcon(job.status)}
                            right={() => (
                                <View style={styles.jobActionRight}>
                                    {job.status === 'pending_scan' && (
                                        <Button mode="text" textColor={gramSetuTheme.colors.secondary} compact>Scan</Button>
                                    )}
                                    <Icon name="chevron-right" size={24} color="#757575" style={{ marginRight: 10 }} />
                                </View>
                            )}
                        />
                    </Card>
                ))}
            </ScrollView>
        </View>
    );
}

// ==========================================
// 6b. Profile Screen
// ==========================================
function ProfileScreen({ navigation }) {
    const [fullName, setFullName] = useState('');
    const [phone, setPhone] = useState('');
    const [twilioNumber, setTwilioNumber] = useState('');
    const [dob, setDob] = useState('');
    const [cscId, setCscId] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        (async () => {
            const u = await AsyncStorage.getItem('user');
            if (u) {
                const parsed = JSON.parse(u);
                setPhone(parsed.phone || '');
                setTwilioNumber(parsed.twilioNumber || '');
                // Try fetching remote profile
                try {
                    const resp = await fetch(`${API_BASE}/user/${parsed.phone}`);
                    if (resp.ok) {
                        const data = await resp.json();
                        setFullName(data.data.full_name || '');
                        setTwilioNumber(data.data.twilio_number || '');
                        setDob(data.data.dob || '');
                        setCscId(data.data.csc_id || '');
                    }
                } catch (e) { }
            }
        })();
    }, []);

    const handleSave = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${API_BASE}/user/update`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    phone: phone,
                    fullName: fullName,
                    twilioNumber: twilioNumber,
                    dob: dob,
                    cscId: cscId
                })
            });

            if (!response.ok) throw new Error('Failed to update profile on server.');

            // update local cache
            const u = await AsyncStorage.getItem('user');
            if (u) {
                const parsed = JSON.parse(u);
                parsed.twilioNumber = twilioNumber;
                await AsyncStorage.setItem('user', JSON.stringify(parsed));
            }

            Alert.alert('Success', 'Profile updated successfully!');
            navigation.goBack();
        } catch (e) {
            Alert.alert('Error', e.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={{ flex: 1, backgroundColor: '#F5F7FA' }}>
            <Appbar.Header style={{ backgroundColor: gramSetuTheme.colors.primary, elevation: 5 }}>
                <Appbar.BackAction color="#fff" onPress={() => navigation.goBack()} />
                <Appbar.Content title="VLE Profile Panel" color="#fff" titleStyle={{ fontWeight: 'bold' }} />
            </Appbar.Header>
            <ScrollView contentContainerStyle={{ padding: 25, paddingBottom: 50 }}>

                <View style={{ alignItems: 'center', marginBottom: 30 }}>
                    <View style={{
                        elevation: 8,
                        shadowColor: gramSetuTheme.colors.primary,
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.3,
                        shadowRadius: 5,
                        borderRadius: 60,
                        backgroundColor: '#fff',
                        padding: 5
                    }}>
                        <Avatar.Icon size={110} icon="card-account-details-outline" style={{ backgroundColor: gramSetuTheme.colors.secondary }} />
                    </View>
                    <Title style={{ marginTop: 15, fontWeight: '800', color: gramSetuTheme.colors.primary, fontSize: 24 }}>
                        {fullName || "VLE Profile"}
                    </Title>
                    <Text style={{ color: '#666', fontWeight: '500' }}>Manage your CSC Identity</Text>
                </View>

                <Card style={{ borderRadius: 16, elevation: 4, marginBottom: 20, backgroundColor: '#fff' }}>
                    <Card.Content>
                        <Text style={styles.inputLabel}>Full Legal Name</Text>
                        <TextInput
                            style={styles.profileInput}
                            placeholder="Enter full name"
                            value={fullName}
                            onChangeText={setFullName}
                        />

                        <Text style={styles.inputLabel}>Date of Birth</Text>
                        <TextInput
                            style={styles.profileInput}
                            placeholder="DD/MM/YYYY"
                            value={dob}
                            onChangeText={setDob}
                            keyboardType="numeric"
                        />

                        <Text style={styles.inputLabel}>CSC Gateway ID</Text>
                        <TextInput
                            style={styles.profileInput}
                            placeholder="e.g. CSC-UP-4592"
                            value={cscId}
                            onChangeText={setCscId}
                            autoCapitalize="characters"
                        />
                    </Card.Content>
                </Card>

                <Card style={{ borderRadius: 16, elevation: 4, marginBottom: 25, backgroundColor: '#fff' }}>
                    <Card.Content>
                        <Text style={styles.inputLabel}>Registered WhatsApp (Verified)</Text>
                        <TextInput
                            style={[styles.profileInput, { backgroundColor: '#f0f0f0', color: '#888' }]}
                            value={phone}
                            editable={false}
                            selectTextOnFocus={false}
                        />

                        <Text style={styles.inputLabel}>Twilio API Sender Number</Text>
                        <TextInput
                            style={styles.profileInput}
                            placeholder="+1 (555) 123-4567"
                            value={twilioNumber}
                            onChangeText={setTwilioNumber}
                            keyboardType="phone-pad"
                        />
                    </Card.Content>
                </Card>

                <Button
                    mode="contained"
                    onPress={handleSave}
                    loading={loading}
                    disabled={loading}
                    style={{ borderRadius: 12, elevation: 5 }}
                    contentStyle={{ paddingVertical: 8 }}
                    labelStyle={{ fontSize: 18, fontWeight: 'bold' }}
                    buttonColor={gramSetuTheme.colors.primary}
                    icon="content-save-check"
                >
                    Save Changes
                </Button>
            </ScrollView>
        </View>
    );
}

// ==========================================
// 7. Aadhaar Scanner Screen (Edge OCR & Masking)
// ==========================================
function ScannerScreen({ navigation }) {
    const [hasPermission, setHasPermission] = useState(null);
    const [cameraRef, setCameraRef] = useState(null);
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        (async () => {
            const { status } = await Camera.requestCameraPermissionsAsync();
            setHasPermission(status === 'granted');
        })();
    }, []);

    const takePicture = async () => {
        if (cameraRef && !processing) {
            setProcessing(true);
            try {
                const photo = await cameraRef.takePictureAsync({ base64: true, quality: 0.5 });

                // Submit to Document API on Port 8003
                const response = await fetch(`${DOC_API}/process-document`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        image_base64: photo.base64,
                        document_type: "aadhaar",
                        apply_masking: true,
                        vle_id: "demo-vle"
                    })
                });

                if (!response.ok) throw new Error("Document analysis failed");
                const data = await response.json();

                Alert.alert("OCR Success!", "Aadhaar securely masked and parsed via AWS Edge Infrastructure.");
                navigation.goBack();
            } catch (error) {
                console.error(error);
                Alert.alert("OCR Error", "Ensure the backend Document Service on port 8003 is active!");
            } finally {
                setProcessing(false);
            }
        }
    };

    if (hasPermission === null) return <View style={{ flex: 1, backgroundColor: '#000' }} />;
    if (hasPermission === false) return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><Text>No access to camera</Text></View>;

    return (
        <View style={{ flex: 1 }}>
            <Appbar.Header style={{ backgroundColor: '#000000' }}>
                <Appbar.BackAction color="#fff" onPress={() => navigation.goBack()} />
                <Appbar.Content title="Aadhaar Edge Scanner" color="#fff" />
            </Appbar.Header>
            <Camera style={{ flex: 1 }} type={Camera.Constants?.Type?.back || 0} ref={(ref) => setCameraRef(ref)}>
                <View style={{ flex: 1, backgroundColor: 'transparent', flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-end', paddingBottom: 40 }}>
                    <TouchableOpacity onPress={takePicture} disabled={processing}>
                        <View style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: processing ? '#ccc' : '#ffffff', justifyContent: 'center', alignItems: 'center', borderWidth: 5, borderColor: 'rgba(0,0,0,0.2)' }}>
                            {processing && <ActivityIndicator size="large" color="#000" />}
                        </View>
                    </TouchableOpacity>
                </View>
            </Camera>
        </View>
    );
}

// ==========================================
// 9. Offline Beneficiary Database Tracker
// ==========================================
function BeneficiariesScreen({ navigation }) {
    const defaultData = [
        { id: 1, name: 'Suresh Kumar', aadhar: 'xxxx-xxxx-8392', phone: '9882XXXX91', sync: true },
        { id: 2, name: 'Lakshmi Devi', aadhar: 'xxxx-xxxx-1102', phone: '9432XXXX88', sync: false },
        { id: 3, name: 'Rahul Singh', aadhar: 'xxxx-xxxx-4475', phone: '9123XXXX54', sync: true }
    ];

    return (
        <View style={{ flex: 1, backgroundColor: '#F5F7FA' }}>
            <Appbar.Header style={{ backgroundColor: gramSetuTheme.colors.primary }}>
                <Appbar.Action icon="menu" color="#fff" onPress={() => navigation.toggleDrawer()} />
                <Appbar.Content title="Citizen Directory" color="#fff" subtitle="Local Offline Encrypted" />
            </Appbar.Header>

            <ScrollView contentContainerStyle={{ padding: 20 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                    <Title style={{ fontSize: 20, fontWeight: '800', color: gramSetuTheme.colors.primary }}>Offline Cache</Title>
                    <Button icon="plus" mode="outlined" compact textColor={gramSetuTheme.colors.primary} style={{ borderColor: gramSetuTheme.colors.primary }}>Add New</Button>
                </View>

                {defaultData.map((citizen) => (
                    <Card key={citizen.id} style={{ marginBottom: 12, borderRadius: 12, elevation: 2, backgroundColor: '#ffffff' }}>
                        <Card.Title
                            title={citizen.name}
                            subtitle={`Phone: ${citizen.phone}`}
                            left={(props) => <Avatar.Icon {...props} icon="account" style={{ backgroundColor: gramSetuTheme.colors.secondary }} />}
                            right={(props) => (
                                <View style={{ alignItems: 'center', marginRight: 15 }}>
                                    <Icon name={citizen.sync ? 'cloud-check' : 'cloud-sync'} size={24} color={citizen.sync ? '#4CAF50' : '#FF9800'} />
                                    <Text style={{ fontSize: 10, color: '#888', marginTop: 3 }}>{citizen.sync ? 'Synced' : 'Waiting'}</Text>
                                </View>
                            )}
                        />
                        <Card.Content>
                            <Paragraph style={{ color: '#555', fontSize: 13, fontWeight: 'bold' }}>Aadhaar: {citizen.aadhar}</Paragraph>
                        </Card.Content>
                    </Card>
                ))}
            </ScrollView>
        </View>
    );
}

// ==========================================
// Custom Drawer Content (for logout & profile details)
// ==========================================
function CustomDrawerContent(props) {
    const handleLogout = async () => {
        await AsyncStorage.removeItem('user');
        props.navigation.replace('Auth');
    };

    return (
        <DrawerContentScrollView {...props} style={{ backgroundColor: '#ffffff' }}>
            <View style={{
                padding: 25,
                borderBottomWidth: 1,
                borderBottomColor: '#e0e0e0',
                marginBottom: 10,
                alignItems: 'center',
                backgroundColor: gramSetuTheme.colors.primary
            }}>
                <View style={{ backgroundColor: '#fff', padding: 5, borderRadius: 100, elevation: 5 }}>
                    <Image
                        source={require('./assets/logo.png')}
                        style={{ width: 80, height: 80, resizeMode: 'contain' }}
                        onError={() => { }}
                    />
                </View>
                <Title style={{ color: '#ffffff', marginTop: 15, fontWeight: '800', letterSpacing: 1 }}>GramSetu</Title>
                <Text style={{ color: '#80bfff', fontWeight: '500' }}>VLE Console</Text>
            </View>
            <DrawerItemList {...props} />

            <View style={{ flex: 1, marginTop: 40, borderTopWidth: 1, borderTopColor: '#f0f0f0', paddingTop: 10 }}>
                <DrawerItem
                    label="Logout Agent"
                    labelStyle={{ color: '#D32F2F', fontWeight: 'bold' }}
                    icon={({ size }) => <Icon name="logout-variant" color="#D32F2F" size={size} />}
                    onPress={handleLogout}
                />
            </View>
        </DrawerContentScrollView>
    );
}

// ==========================================
// Drawer Navigator Wrapper
// ==========================================
function DrawerNavigator() {
    return (
        <Drawer.Navigator
            drawerContent={(props) => <CustomDrawerContent {...props} />}
            screenOptions={{
                headerShown: false,
                drawerActiveTintColor: gramSetuTheme.colors.secondary,
                drawerInactiveTintColor: '#333'
            }}
        >
            <Drawer.Screen
                name="Home"
                component={DashboardScreen}
                options={{ drawerIcon: ({ color }) => <Icon name="home-outline" size={24} color={color} /> }}
            />
            <Drawer.Screen
                name="Profile"
                component={ProfileScreen}
                options={{ drawerIcon: ({ color }) => <Icon name="account-cog-outline" size={24} color={color} /> }}
            />
            <Drawer.Screen
                name="History"
                component={AnalyticsScreen}
                options={{ drawerIcon: ({ color }) => <Icon name="chart-bar" size={24} color={color} /> }}
            />
            <Drawer.Screen
                name="Beneficiaries"
                component={BeneficiariesScreen}
                options={{ drawerIcon: ({ color }) => <Icon name="account-group-outline" size={24} color={color} /> }}
            />
        </Drawer.Navigator>
    );
}

// ==========================================
// 8. Analytics & History Component
// ==========================================
function AnalyticsScreen({ navigation }) {
    return (
        <View style={{ flex: 1, backgroundColor: '#F5F7FA' }}>
            <Appbar.Header style={{ backgroundColor: gramSetuTheme.colors.primary }}>
                <Appbar.BackAction color="#fff" onPress={() => navigation.goBack()} />
                <Appbar.Content title="Activity History & Earnings" color="#fff" />
            </Appbar.Header>
            <ScrollView contentContainerStyle={{ padding: 20 }}>
                <Title style={{ fontSize: 20, fontWeight: 'bold', color: gramSetuTheme.colors.primary, marginBottom: 15 }}>Recent Transactions</Title>

                <Card style={{ marginBottom: 15, borderRadius: 12, elevation: 2, backgroundColor: '#fff' }}>
                    <Card.Title
                        title="PM-Kisan Registration"
                        subtitle="Manoj Kumar - Successful"
                        left={(props) => <Avatar.Icon {...props} icon="tractor" style={{ backgroundColor: '#e3f2fd' }} color="#1976D2" />}
                        right={(props) => <Text style={{ marginRight: 20, fontWeight: 'bold', color: '#4CAF50' }}>+₹50</Text>}
                    />
                </Card>

                <Card style={{ marginBottom: 15, borderRadius: 12, elevation: 2, backgroundColor: '#fff' }}>
                    <Card.Title
                        title="e-Shram Card Print"
                        subtitle="Geeta Devi - Successful"
                        left={(props) => <Avatar.Icon {...props} icon="card-account-details-outline" style={{ backgroundColor: '#fbe9e7' }} color="#D84315" />}
                        right={(props) => <Text style={{ marginRight: 20, fontWeight: 'bold', color: '#4CAF50' }}>+₹30</Text>}
                    />
                </Card>

                <Card style={{ marginBottom: 15, borderRadius: 12, elevation: 2, backgroundColor: '#fff' }}>
                    <Card.Title
                        title="Aadhaar Masking Edge API"
                        subtitle="System Request - Synced"
                        left={(props) => <Avatar.Icon {...props} icon="camera-document" style={{ backgroundColor: '#e0f2f1' }} color="#00796B" />}
                    />
                </Card>
            </ScrollView>
        </View>
    );
}

// ==========================================
// Root App Component
// ==========================================
export default function App() {
    const [lang, setLang] = useState('en');

    return (
        <LanguageContext.Provider value={{ lang, setLang }}>
            <PaperProvider theme={gramSetuTheme}>
                <NavigationContainer>
                    <Stack.Navigator initialRouteName="Splash" screenOptions={{ headerShown: false, cardStyle: { backgroundColor: 'transparent' } }}>
                        <Stack.Screen name="Splash" component={SplashScreen} />
                        <Stack.Screen name="LanguageSelection" component={LanguageSelectionScreen} />
                        <Stack.Screen name="Auth" component={AuthScreen} />
                        <Stack.Screen name="SignUp" component={SignUpScreen} />
                        <Stack.Screen name="OTP" component={OtpScreen} />
                        <Stack.Screen name="Dashboard" component={DrawerNavigator} />
                        <Stack.Screen name="Scanner" component={ScannerScreen} />
                        <Stack.Screen name="NewJob" component={NewJobScreen} options={{ headerShown: false }} />
                    </Stack.Navigator>
                </NavigationContainer>
            </PaperProvider>
        </LanguageContext.Provider>
    );
}

// ==========================================
// Styles
// ==========================================
const styles = StyleSheet.create({
    container: { flex: 1 },
    dashboardContainer: { flex: 1, padding: 16 },
    centerAll: { justifyContent: 'center', alignItems: 'center' },
    modalContainer: { backgroundColor: 'white', padding: 25, margin: 20, borderRadius: 16, elevation: 5 },
    modalTitle: { color: gramSetuTheme.colors.primary, fontWeight: 'bold', borderBottomWidth: 1, borderBottomColor: '#eee', paddingBottom: 10, marginBottom: 15 },

    // Splash
    splashTitle: { fontSize: 45, fontWeight: '900', marginTop: 20, letterSpacing: 1 },
    splashSubtitle: { fontSize: 18, marginTop: 10, letterSpacing: 3, fontWeight: '600' },

    // Auth & Language
    authCard: { padding: 25, borderRadius: 20, backgroundColor: '#ffffff', shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.1, shadowRadius: 10 },
    authTitle: { textAlign: 'center', fontSize: 26, fontWeight: 'bold', color: '#003366', marginBottom: 5 },
    authSubtitle: { textAlign: 'center', color: '#666', marginBottom: 25, fontSize: 16 },
    input: { borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 12, padding: 15, marginBottom: 18, backgroundColor: '#fcfcfc', fontSize: 16, color: '#333' },
    submitBtn: { paddingVertical: 10, borderRadius: 12, marginTop: 10 },
    pickerContainer: { borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 12, marginBottom: 25, backgroundColor: '#fcfcfc', overflow: 'hidden' },
    picker: { height: 55, width: '100%' },

    // Dashboard specifics
    heroCard: { borderRadius: 20, marginBottom: 20, elevation: 8, overflow: 'hidden' },
    heroContent: { alignItems: 'center', paddingVertical: 40 },
    heroTitle: { fontSize: 26, fontWeight: '800', marginBottom: 5 },
    heroSubtitle: { textAlign: 'center', marginBottom: 40, fontSize: 16 },
    micButton: { width: 130, height: 130, borderRadius: 65, elevation: 15, shadowColor: '#FF9933', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.5, shadowRadius: 12 },
    micGradient: { flex: 1, borderRadius: 65, justifyContent: 'center', alignItems: 'center' },
    micButtonRecording: { transform: [{ scale: 1.15 }] },
    micHelperText: { marginTop: 25, fontWeight: '700', fontSize: 16 },

    // Stats specific
    statsContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
    statCard: { flex: 1, marginHorizontal: 5, borderRadius: 16, elevation: 3, backgroundColor: '#ffffff' },
    statContent: { alignItems: 'center', paddingVertical: 15 },
    statValue: { fontSize: 20, fontWeight: 'bold', color: '#333', marginTop: 5 },
    statLabel: { fontSize: 12, color: '#777', marginTop: 2 },

    quickActionsContainer: { marginBottom: 25 },
    actionButton: { borderRadius: 12, elevation: 3 },
    sectionTitle: { color: '#003366', fontWeight: '800', marginBottom: 15, fontSize: 22, letterSpacing: 0.5 },
    jobCard: { marginBottom: 12, backgroundColor: '#ffffff', borderRadius: 16, elevation: 2 },
    jobActionRight: { flexDirection: 'row', alignItems: 'center' },

    // Profile Updates
    inputLabel: {
        fontSize: 14,
        fontWeight: 'bold',
        color: gramSetuTheme.colors.primary,
        marginBottom: 5,
        marginLeft: 5,
        textTransform: 'uppercase'
    },
    profileInput: {
        borderWidth: 1,
        borderColor: '#e0e0e0',
        borderRadius: 12,
        padding: 15,
        marginBottom: 20,
        backgroundColor: '#fcfcfc',
        fontSize: 16,
        color: '#333'
    }
});
