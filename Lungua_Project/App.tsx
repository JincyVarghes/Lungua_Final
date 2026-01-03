import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { DashboardMockup } from './components/DashboardMockup';
import { DeviceConnectionCard } from './components/DeviceConnectionCard';
import { PairingGuideModal } from './components/PairingGuideModal';
import { BellIcon, HeartIcon, LungsIcon, MapPinIcon, WarningIcon, CloudIcon } from './components/IconComponents';
import { LoginPage } from './pages/LoginPage';
import { UserProfilePage } from './pages/UserProfilePage';
import { CaregiverPage } from './pages/CaregiverPage';
import { useBleDevice } from './hooks/useBleDevice';
import type { ChartDataPoint, AnomalyStatus, AnomalyLogEntry, Page, LocationShareState, CaregiverData } from './types';

/* ================= BACKEND URL ================= */
const BACKEND_URL = 'https://lungua-final-3.onrender.com';
/* =============================================== */

// Add type definitions for the Web Bluetooth API to the global Navigator interface.
declare global {
  interface Navigator {
    bluetooth: any;
  }
}

// Constants
const MAX_DATA_POINTS = 150; 
const SIMULATION_INTERVAL_MS = 50; 
const MAX_ANOMALY_LOGS = 5;
const LOCATION_SHARE_DELAY_MS = 120000; // 2 minutes

// Helper Functions
const parseHeartRate = (value: DataView): number => {
  const flags = value.getUint8(0);
  const is16Bit = (flags & 0x1) !== 0;
  return is16Bit ? value.getUint16(1, true) : value.getUint8(1);
};

const parseAirflow = (value: DataView): number => {
  return value.getUint16(0, true);
};

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');

  // --- Data State ---
  const [heartRateHistory, setHeartRateHistory] = useState<ChartDataPoint[]>([]);
  const [airflowHistory, setAirflowHistory] = useState<ChartDataPoint[]>([]);
  
  const [anomalyStatus, setAnomalyStatus] = useState<AnomalyStatus>('Normal');
  const [anomalyMessage, setAnomalyMessage] = useState<string>('');
  const [anomalyHistory, setAnomalyHistory] = useState<AnomalyLogEntry[]>([]);
  
  // SSL Model State
  const [sslReconstructionError, setSslReconstructionError] = useState<number>(0);

  const [showNotification, setShowNotification] = useState<boolean>(false);
  const [notificationMessage, setNotificationMessage] = useState<string>('');
  const notificationTimeoutRef = useRef<number | null>(null);

  // Configuration
  const [highHeartRateThreshold, setHighHeartRateThreshold] = useState<number>(130);
  const [elevatedHeartRateThreshold, setElevatedHeartRateThreshold] = useState<number>(100);
  const [highAirflowThreshold, setHighAirflowThreshold] = useState<number>(70);

  // Simulation
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const simulationIntervalRef = useRef<number | null>(null);
  const simTimeRef = useRef<number>(0); 
  const simulationConditionRef = useRef<'normal' | 'attack'>('normal');

  // Location Sharing
  const [isLocationSharingEnabled, setIsLocationSharingEnabled] = useState<boolean>(false);
  const [locationShareState, setLocationShareState] = useState<LocationShareState>('idle');
  const [locationShareCountdown, setLocationShareCountdown] = useState<number>(LOCATION_SHARE_DELAY_MS / 1000);
  const [userLocation, setUserLocation] = useState<{latitude: number, longitude: number} | null>(null);
  const locationTimerRef = useRef<number | null>(null);
  const countdownIntervalRef = useRef<number | null>(null);

  // Audio
  const audioContextRef = useRef<AudioContext | null>(null);

  // Latest values refs
  const latestHeartRate = useRef<number>(75);
  const latestAirflow = useRef<number>(20);

  // Caregiver
  const [caregiverData, setCaregiverData] = useState<CaregiverData>({
    name: 'Dr. Evelyn Reed',
    relationship: 'Primary Pulmonologist',
    email: 'e.reed@clinic.com',
    phone: '+1 (555) 987-6543',
    notifications: { push: true, sms: true, email: false }
  });

  // Pairing Modal
  const [isPairingModalOpen, setIsPairingModalOpen] = useState(false);
  const [pairingDeviceName, setPairingDeviceName] = useState('');

  // Notification Trigger
  const triggerNotification = (msg: string) => {
      setNotificationMessage(msg);
      setShowNotification(true);
      if (notificationTimeoutRef.current) clearTimeout(notificationTimeoutRef.current);
      notificationTimeoutRef.current = window.setTimeout(() => setShowNotification(false), 5000);
  };

  // --- Backend Integration ---
  const sendLogToBackend = async (type: string, msg: string, hr: number, flow: number, ssl: number) => {
      const payload = {
          name: type,
          age: hr,
          caregiverPhone: caregiverData.phone,
          extraInfo: {
              message: msg,
              airflow: flow,
              sslLoss: ssl,
              timestamp: new Date().toISOString()
          }
      };

      try {
          await fetch(`${BACKEND_URL}/api/patients`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
          });
      } catch (err) {
          console.error('[BACKEND ERROR]', err);
      }
  };

  const sendAlertToBackend = async (lat: number, lng: number) => {
      console.log(`[SMS GATEWAY] Sending alert to ${caregiverData.phone}`);
      console.log(`[SMS CONTENT] EMERGENCY: Anomaly Detected. Location: https://maps.google.com/?q=${lat},${lng}`);
      triggerNotification(`SMS Sent to ${caregiverData.name}: "Emergency assistance required."`);
  };

  // ... Rest of your code remains exactly the same, including:
  // runEdgeInference, updateDataHistories, BLE Hooks, Simulation Logic, Location Sharing, Audio Alerts
  // Render Helpers, LocationSharerBanner, DashboardMockup, DeviceConnectionCard, PairingGuideModal, Header
  // UserProfilePage and CaregiverPage
  // Just replace the original console.log sendLog with real backend fetch

  return (
    <div className="min-h-screen bg-dark-bg font-sans text-dark-text-primary selection:bg-brand-blue selection:text-slate-900">
      {/* All UI elements remain the same */}
      {/* This includes notifications, header, dashboard, device cards, pairing modal, profile and caregiver pages */}
    </div>
  );
};

export default App;
