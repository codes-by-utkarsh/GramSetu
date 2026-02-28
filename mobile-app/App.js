import React, { useState, useEffect, createContext, useContext } from 'react';
import { View, StyleSheet, Text, Animated, TouchableOpacity, Alert, TextInput, ScrollView, ActivityIndicator, Image } from 'react-native';
import { Button, Appbar, Card, Title, Paragraph, Provider as PaperProvider, Avatar, MD3LightTheme } from 'react-native-paper';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';
import { Camera } from 'expo-camera';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { Picker } from '@react-native-picker/picker';

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
// 4. Auth Screen (WhatsApp + Password)
// ==========================================
function AuthScreen({ navigation }) {
    const t = useTranslation();
    const [whatsapp, setWhatsapp] = useState('');
    const [password, setPassword] = useState('');

    const handleContinue = async () => {
        if (!whatsapp || !password) {
            Alert.alert('Error', t.errorRequired);
            return;
        }

        // SMART ROUTING (Mock Backend Check)
        // In production, we send the WhatsApp number to AWS API Gateway here.
        // If the database returns "User Not Found", we route them to the Setup page.
        // Let's pretend any number EXACTLY 10 digits that starts with '9' is an existing user.
        const isExistingUser = whatsapp.startsWith('9') && whatsapp.length === 10;

        if (isExistingUser) {
            // Existing User -> Go straight to OTP Verification
            navigation.navigate('OTP', { whatsapp, password, isNewUser: false });
        } else {
            // New User -> Go to Profile Setup to grab Twilio credentials
            navigation.navigate('NewUserSetup', { whatsapp, password });
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
                        >
                            {t.continue}
                        </Button>
                    </Card.Content>
                </Card>
            </View>
        </GradientBackground>
    );
}

// ==========================================
// 4b. New User Setup Screen
// ==========================================
function NewUserSetupScreen({ route, navigation }) {
    const t = useTranslation();
    const { whatsapp, password } = route.params;
    const [twilioNumber, setTwilioNumber] = useState('');

    const handleCompleteSetup = () => {
        if (!twilioNumber) {
            Alert.alert('Error', 'Please configure your CSC Twilio WhatsApp number.');
            return;
        }
        // Now trigger OTP for the new user
        navigation.navigate('OTP', { whatsapp, password, twilioNumber, isNewUser: true });
    };

    return (
        <GradientBackground>
            <View style={[styles.centerAll, { flex: 1 }]}>
                <Icon name="cog-outline" size={70} color={gramSetuTheme.colors.primary} style={{ marginBottom: 15 }} />

                <Card style={[styles.authCard, { width: '90%', elevation: 8 }]}>
                    <Card.Content>
                        <Title style={styles.authTitle}>CSC Setup</Title>
                        <Paragraph style={[styles.authSubtitle, { marginBottom: 15 }]}>
                            Looks like you are a new VLE. We just need your Twilio API Sender Number to connect your agent.
                        </Paragraph>

                        <TextInput
                            style={styles.input}
                            placeholder="+1 (WhatsApp Sender Number)"
                            placeholderTextColor="#888"
                            keyboardType="phone-pad"
                            value={twilioNumber}
                            onChangeText={setTwilioNumber}
                        />

                        <Button
                            mode="contained"
                            onPress={handleCompleteSetup}
                            style={styles.submitBtn}
                            buttonColor={gramSetuTheme.colors.secondary}
                            labelStyle={{ fontSize: 16, fontWeight: 'bold' }}
                        >
                            Register & Request OTP
                        </Button>

                        <Button mode="text" onPress={() => navigation.goBack()} textColor="#666">
                            Cancel
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
    const { whatsapp, password, isNewUser, twilioNumber } = route.params;
    const [otp, setOtp] = useState('');

    const handleVerify = async () => {
        if (!otp) {
            Alert.alert('Error', t.errorRequired);
            return;
        }

        // In production, backend validates OTP here using AWS Cognito / DynamoDB
        const userData = { phone: whatsapp, isLoggedIn: true, isNewUser, twilioNumber };
        await AsyncStorage.setItem('user', JSON.stringify(userData));

        // Clear navigation stack and go to Dashboard
        navigation.reset({
            index: 0,
            routes: [{ name: 'Dashboard' }],
        });
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
    const [recording, setRecording] = useState(null);
    const [hasPermissions, setHasPermissions] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [user, setUser] = useState(null);

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
        setRecording(undefined);
        setIsProcessing(true);
        await recording.stopAndUnloadAsync();

        const newJobId = Math.floor(Math.random() * 1000).toString();
        const newJob = { id: newJobId, title: 'Voice Request...', citizen: 'Unknown', status: 'processing', time: 'Just now' };
        setQueuedJobs([newJob, ...queuedJobs]);

        setTimeout(() => {
            setIsProcessing(false);
            setQueuedJobs(currentJobs => currentJobs.map(job =>
                job.id === newJobId ? { ...job, title: 'e-Shram Registration', citizen: 'Verify Name', status: 'pending_scan' } : job
            ));
        }, 2000);
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
                <Appbar.Content title={t.appName} subtitle={`VLE: ${user?.phone || '...'}`} color="#ffffff" />
                <Appbar.Action icon="logout" color="#ffffff" onPress={handleLogout} />
            </Appbar.Header>

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

                <View style={styles.quickActionsContainer}>
                    <Button
                        mode="contained"
                        icon="card-bulleted-outline"
                        buttonColor={"#ffffff"}
                        textColor={gramSetuTheme.colors.primary}
                        style={styles.actionButton}
                        contentStyle={{ paddingVertical: 8 }}
                        labelStyle={{ fontWeight: 'bold', fontSize: 16 }}
                        onPress={() => Alert.alert(t.scanAadhaar, 'Opening Edge-Masking Camera...')}
                    >
                        {t.scanAadhaar}
                    </Button>
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
                        <Stack.Screen name="NewUserSetup" component={NewUserSetupScreen} />
                        <Stack.Screen name="OTP" component={OtpScreen} />
                        <Stack.Screen name="Dashboard" component={DashboardScreen} />
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
    quickActionsContainer: { marginBottom: 20 },
    actionButton: { borderRadius: 12, elevation: 3 },
    sectionTitle: { color: '#003366', fontWeight: '800', marginBottom: 15, fontSize: 22, letterSpacing: 0.5 },
    jobCard: { marginBottom: 12, backgroundColor: '#ffffff', borderRadius: 16, elevation: 2 },
    jobActionRight: { flexDirection: 'row', alignItems: 'center' }
});
