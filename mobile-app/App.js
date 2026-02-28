import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { Audio } from 'expo-av';
import { Camera } from 'expo-camera';
import { Appbar, Card, Title, Paragraph, Button, useTheme, MD3LightTheme, Provider as PaperProvider, Avatar } from 'react-native-paper';
import * as FileSystem from 'expo-file-system';
import axios from 'axios';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

// --- Configuration ---
const API_BASE_URL = 'http://localhost:8000'; // Will be replaced by AWS API Gateway/EC2 IP

// --- Theming: Government Blue & Indian Saffron ---
const gramSetuTheme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: '#003366', // Trustworthy Government Blue
    secondary: '#FF9933', // Vibrant Indian Saffron
    background: '#F5F7FA', // Clean light background
    surface: '#ffffff',
    error: '#B00020',
    text: '#333333',
    onPrimary: '#ffffff',
    onSecondary: '#ffffff',
  },
};

export default function MainApp() {
  const [recording, setRecording] = useState(null);
  const [hasPermissions, setHasPermissions] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // State for jobs/queue
  const [queuedJobs, setQueuedJobs] = useState([
    // Mock initial state to show the list concept
    { id: '1', title: 'PM-Kisan Status', citizen: 'Ramesh Kumar', status: 'completed', time: '10:30 AM' },
    { id: '2', title: 'Awaas Yojana Apply', citizen: 'Lakshmi Devi', status: 'syncing', time: '11:15 AM' },
  ]);

  useEffect(() => {
    (async () => {
      const audioPermission = await Audio.requestPermissionsAsync();
      const cameraPermission = await Camera.requestCameraPermissionsAsync();
      setHasPermissions(audioPermission.status === 'granted' && cameraPermission.status === 'granted');
    })();
  }, []);

  // --- Voice Commands ---
  const startRecording = async () => {
    if (!hasPermissions) {
      Alert.alert('Permissions Required', 'Please grant audio and camera permissions in your settings.');
      return;
    }
    try {
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      setRecording(recording);
    } catch (err) {
      console.error('Failed to start recording', err);
      Alert.alert('Error', 'Could not start recording hook.');
    }
  };

  const stopRecording = async () => {
    setRecording(undefined);
    setIsProcessing(true);
    await recording.stopAndUnloadAsync();
    const uri = recording.getURI();

    try {
      // Create a mock new job for UI purposes immediately
      const newJobId = Math.floor(Math.random() * 1000).toString();
      const newJob = { id: newJobId, title: 'Voice Request...', citizen: 'Unknown', status: 'processing', time: 'Just now' };
      setQueuedJobs([newJob, ...queuedJobs]);

      // In production: Send to AWS backend
      // const base64Audio = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
      // const res = await axios.post(`${API_BASE_URL}/jobs/voice`, { audio: base64Audio });
      
      // Simulate backend delay
      setTimeout(() => {
        setIsProcessing(false);
        setQueuedJobs(currentJobs => currentJobs.map(job => 
          job.id === newJobId ? { ...job, title: 'e-Shram Registration', citizen: 'Verify Name', status: 'pending_scan' } : job
        ));
      }, 2000);

    } catch (error) {
      setIsProcessing(false);
      Alert.alert('Processing Failed', error.message);
    }
  };

  const renderJobStatusIcon = (status) => {
    switch(status) {
      case 'completed': return <Avatar.Icon size={32} icon="check" style={{backgroundColor: '#4CAF50'}} />;
      case 'processing': return <ActivityIndicator color={gramSetuTheme.colors.primary} />;
      case 'syncing': return <Avatar.Icon size={32} icon="cloud-sync" style={{backgroundColor: '#FF9933'}} />;
      case 'pending_scan': return <Avatar.Icon size={32} icon="camera-account" style={{backgroundColor: '#E91E63'}} />;
      default: return <Avatar.Icon size={32} icon="clock-outline" style={{backgroundColor: '#9E9E9E'}} />;
    }
  };

  return (
    <PaperProvider theme={gramSetuTheme}>
      <Appbar.Header style={{ backgroundColor: gramSetuTheme.colors.primary }}>
        <Appbar.Content title="GramSetu" subtitle="VLE Dashboard" color="#ffffff" />
        <Appbar.Action icon="bell" color="#ffffff" onPress={() => {}} />
        {/* Offline Sync Indicator */}
        <Appbar.Action icon="cloud-check" color="#4CAF50" onPress={() => {}} />
      </Appbar.Header>

      <ScrollView style={styles.container}>
        {/* Hero Section */}
        <Card style={styles.heroCard}>
          <Card.Content style={styles.heroContent}>
            <Title style={styles.heroTitle}>Autopilot for CSC</Title>
            <Paragraph style={styles.heroSubtitle}>Hold to speak your command in Hindi, Tamil, or Telugu.</Paragraph>
            
            <TouchableOpacity 
              style={[styles.micButton, recording && styles.micButtonRecording]} 
              onPressIn={startRecording}
              onPressOut={stopRecording}
              activeOpacity={0.8}
            >
              <Icon name={recording ? "microphone-outline" : "microphone"} size={60} color="#ffffff" />
            </TouchableOpacity>
            <Text style={styles.micHelperText}>
              {recording ? "Listening... Release to process" : "Hold to speak (e.g., 'PM-Kisan status for Ramesh')"}
            </Text>
          </Card.Content>
        </Card>

        {/* Quick Actions */}
        <View style={styles.quickActionsContainer}>
          <Button 
            mode="contained" 
            icon="card-bulleted-outline" 
            buttonColor={gramSetuTheme.colors.secondary}
            style={styles.actionButton}
            onPress={() => Alert.alert('Camera', 'Opening Edge-Masking Camera...')}
          >
            Scan Aadhaar
          </Button>
          <Button 
            mode="outlined" 
            icon="text-box-search-outline" 
            textColor={gramSetuTheme.colors.primary}
            style={styles.actionButton}
          >
            Manual Entry
          </Button>
        </View>

        {/* Queued Jobs List */}
        <Title style={styles.sectionTitle}>Today's Queue</Title>
        {queuedJobs.map((job) => (
          <Card key={job.id} style={styles.jobCard} mode="elevated">
            <Card.Title
              title={job.title}
              subtitle={`${job.citizen} • ${job.time}`}
              left={(props) => renderJobStatusIcon(job.status)}
              right={(props) => (
                <View style={styles.jobActionRight}>
                  {job.status === 'pending_scan' && (
                    <Button mode="text" textColor={gramSetuTheme.colors.secondary} compact>Scan Docs</Button>
                  )}
                  <Icon name="chevron-right" size={24} color="#757575" style={{marginRight: 10}}/>
                </View>
              )}
            />
          </Card>
        ))}
        <View style={{height: 40}} />
      </ScrollView>
    </PaperProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: gramSetuTheme.colors.background,
    padding: 16,
  },
  heroCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    marginBottom: 20,
    elevation: 4,
  },
  heroContent: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  heroTitle: {
    color: gramSetuTheme.colors.primary,
    fontSize: 24,
    fontWeight: 'bold',
  },
  heroSubtitle: {
    color: '#666666',
    textAlign: 'center',
    marginBottom: 30,
  },
  micButton: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: gramSetuTheme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: gramSetuTheme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  micButtonRecording: {
    backgroundColor: gramSetuTheme.colors.error,
    transform: [{ scale: 1.1 }],
  },
  micHelperText: {
    marginTop: 15,
    color: gramSetuTheme.colors.primary,
    fontWeight: '500',
  },
  quickActionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 10,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 5,
    borderRadius: 10,
  },
  sectionTitle: {
    color: gramSetuTheme.colors.primary,
    fontWeight: 'bold',
    marginBottom: 10,
    fontSize: 20,
  },
  jobCard: {
    marginBottom: 10,
    backgroundColor: '#ffffff',
    borderRadius: 12,
  },
  jobActionRight: {
    flexDirection: 'row',
    alignItems: 'center',
  }
});
