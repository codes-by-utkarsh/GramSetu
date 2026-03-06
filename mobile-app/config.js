import { Platform } from 'react-native';
import Constants from 'expo-constants';

// =========================================================================
// PRODUCTION SERVER CONFIGURATION
// To build an APK connecting to AWS:
// 1. Change IS_PRODUCTION to true
// 2. Set PRODUCTION_IP to your AWS EC2 Public IPv4 Address
// =========================================================================
export const IS_PRODUCTION = true; // <-- SET TO true BEFORE RUNNING `eas build`
export const PRODUCTION_IP = "43.205.117.14"; // <-- REPLACE WITH YOUR EC2 IP

const getBaseIp = () => {
    if (IS_PRODUCTION) return PRODUCTION_IP;

    if (typeof window !== 'undefined' && window.location?.hostname && window.location.hostname !== 'localhost') {
        return window.location.hostname;
    }
    if (Platform.OS === 'android') {
        return '10.0.2.2'; // Standard IP alias for Android Emulator looking at host
    }
    const host = Constants.expoConfig?.hostUri?.split(':')[0];
    return host || 'localhost';
};

const BASE_IP = getBaseIp();

// We are now using a secure HTTPS Nginx Reverse Proxy on AWS
// with nip.io automatically handling DNS for the IP address!
export const API_BASE = IS_PRODUCTION ? `https://${BASE_IP}.nip.io/orchestrator` : `http://${BASE_IP}:8000`;
export const VOICE_API = IS_PRODUCTION ? `https://${BASE_IP}.nip.io/voice` : `http://${BASE_IP}:8001`;
export const AGENT_API = IS_PRODUCTION ? `https://${BASE_IP}.nip.io/agent` : `http://${BASE_IP}:8002`;
export const DOC_API = IS_PRODUCTION ? `https://${BASE_IP}.nip.io/docs` : `http://${BASE_IP}:8003`;
