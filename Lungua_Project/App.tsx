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

declare global {
  interface Navigator {
    bluetooth: any;
  }
}

const MAX_DATA_POINTS = 150; 
const SIMULATION_INTERVAL_MS = 50;
const MAX_ANOMALY_LOGS = 5;
const LOCATION_SHARE_DELAY_MS = 300000; // 5 minutes

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

  const [heartRateHistory, setHeartRateHistory] = useState<ChartDataPoint[]>([]);
  const [airflowHistory, setAirflowHistory] = useState<ChartDataPoint[]>([]);
  const [anomalyStatus, setAnomalyStatus] = useState<AnomalyStatus>('Normal');
  const [anomalyMessage, setAnomalyMessage] = useState<string>('');
  const [anomalyHistory, setAnomalyHistory] = useState<AnomalyLogEntry[]>([]);
  const [sslReconstructionError, setSslReconstructionError] = useState<number>(0);

  const [showNotification, setShowNotification] = useState<boolean>(false);
  const [notificationMessage, setNotificationMessage] = useState<string>('');
  const notificationTimeoutRef = useRef<number | null>(null);

  const [highHeartRateThreshold, setHighHeartRateThreshold] = useState<number>(130);
  const [elevatedHeartRateThreshold, setElevatedHeartRateThreshold] = useState<number>(100);
  const [highAirflowThreshold, setHighAirflowThreshold] = useState<number>(70);

  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const simulationIntervalRef = useRef<number | null>(null);
  const simTimeRef = useRef<number>(0); 
  const simulationConditionRef = useRef<'normal' | 'attack'>('normal');

  const [isLocationSharingEnabled, setIsLocationSharingEnabled] = useState<boolean>(false);
  const [locationShareState, setLocationShareState] = useState<LocationShareState>('idle');
  const [locationShareCountdown, setLocationShareCountdown] = useState<number>(LOCATION_SHARE_DELAY_MS / 1000);
  const [userLocation, setUserLocation] = useState<{latitude: number, longitude: number} | null>(null);
  const locationTimerRef = useRef<number | null>(null);
  const countdownIntervalRef = useRef<number | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const latestHeartRate = useRef<number>(75);
  const latestAirflow = useRef<number>(20);

  const [caregiverData, setCaregiverData] = useState<CaregiverData>({
    name: 'Dr. Evelyn Reed',
    relationship: 'Primary Pulmonologist',
    email: 'e.reed@clinic.com',
    phone: '+1 (555) 987-6543',
    notifications: { push: true, sms: true, email: false }
  });

  const [isPairingModalOpen, setIsPairingModalOpen] = useState(false);
  const [pairingDeviceName, setPairingDeviceName] = useState('');

  // --- Notification ---
  const triggerNotification = (msg: string) => {
      setNotificationMessage(msg);
      setShowNotification(true);
      if (notificationTimeoutRef.current) clearTimeout(notificationTimeoutRef.current);
      notificationTimeoutRef.current = window.setTimeout(() => setShowNotification(false), 5000);
  };

  // --- UPDATED Backend Sync Function ---
  const sendLogToBackend = async (type: string, msg: string, hr: number, flow: number, ssl: number) => {
      try {
          const res = await fetch('https://<your-backend-url>/api/patients', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                  name: type,
                  age: hr,
                  caregiverPhone: caregiverData.phone,
                  extraInfo: { message: msg, airflow: flow, sslError: ssl }
              }),
          });
          const data = await res.json();
          console.log('[BACKEND SYNC SUCCESS]', data);
      } catch (err) {
          console.error('[BACKEND SYNC ERROR]', err);
      }
  };

  const sendAlertToBackend = async (lat: number, lng: number) => {
      console.log(`[SMS GATEWAY] Sending alert to ${caregiverData.phone}`);
      console.log(`[SMS CONTENT] EMERGENCY: Anomaly Detected. Location: https://maps.google.com/?q=${lat},${lng}`);
      triggerNotification(`SMS Sent to ${caregiverData.name}: "Emergency assistance required."`);
  };

  const playBeep = useCallback((type: 'alert' | 'critical') => {
    if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    const ctx = audioContextRef.current;
    if (ctx.state === 'suspended') ctx.resume();

    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    if (type === 'critical') {
        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(880, ctx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.1);
        gainNode.gain.setValueAtTime(0.5, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
        oscillator.start();
        oscillator.stop(ctx.currentTime + 0.1);
    } else {
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(440, ctx.currentTime);
        gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
        oscillator.start();
        oscillator.stop(ctx.currentTime + 0.5);
    }
  }, []);

  useEffect(() => {
    let beepInterval: number | null = null;
    if (locationShareState === 'countingDown') {
        playBeep('critical');
        beepInterval = window.setInterval(() => playBeep('critical'), 1000);
    }
    return () => { if (beepInterval) clearInterval(beepInterval); };
  }, [locationShareState, playBeep]);

  // --- EDGE AI INFERENCE ENGINE ---
  const runEdgeInference = useCallback((currentHeartRate: number, currentAirflow: number) => {
    let newStatus: AnomalyStatus = 'Normal';
    let newMessage = '';
    let newAnomalyType = '';

    const MODEL_WEIGHTS = { HR_MEAN: 75, HR_STD: 10, FLOW_MEAN: 20, FLOW_STD: 5 };
    const hrFeature = (currentHeartRate - MODEL_WEIGHTS.HR_MEAN) / MODEL_WEIGHTS.HR_STD;
    const flowFeature = (currentAirflow - MODEL_WEIGHTS.FLOW_MEAN) / MODEL_WEIGHTS.FLOW_STD;
    const latentDeviation = Math.sqrt(Math.pow(hrFeature, 2) + Math.pow(flowFeature, 2));
    const reconstructionErrorPercent = Math.min(100, Math.max(0, (latentDeviation / 4) * 100));
    setSslReconstructionError(reconstructionErrorPercent);

    if (currentHeartRate > elevatedHeartRateThreshold && currentAirflow < 12) {
      newStatus = 'Anomaly Detected';
      newAnomalyType = 'Narrow Airway';
      newMessage = `Airway constriction signature matched (Confidence: ${Math.round(reconstructionErrorPercent)}%). Inhaler required.`;
    } else if (currentHeartRate > highHeartRateThreshold) {
      newStatus = 'Anomaly Detected';
      newAnomalyType = 'Tachycardia';
      newMessage = `Heart Rate deviation > 2σ from baseline.`;
    } else if (currentAirflow > highAirflowThreshold) {
      newStatus = 'Anomaly Detected';
      newAnomalyType = 'Flow Anomaly';
      newMessage = `Inhaler technique outside normal distribution.`;
    }

    setAnomalyStatus(prev => {
        if (prev !== newStatus && newStatus === 'Anomaly Detected') {
             setAnomalyHistory(h => [{
                timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
                type: newAnomalyType,
                message: newMessage
             }, ...h].slice(0, MAX_ANOMALY_LOGS));

             sendLogToBackend(newAnomalyType, newMessage, currentHeartRate, currentAirflow, reconstructionErrorPercent);

             setAnomalyMessage(newMessage);
             triggerNotification(newMessage);
             playBeep('alert');
        } else if (newStatus === 'Normal') {
            setAnomalyMessage('');
        }
        return newStatus;
    });

    return { newStatus, newMessage };
  }, [highHeartRateThreshold, elevatedHeartRateThreshold, highAirflowThreshold, playBeep]);

  const updateDataHistories = useCallback((hrValue: number, afValue: number) => {
    latestHeartRate.current = hrValue;
    latestAirflow.current = afValue;
    const now = new Date();
    const timeLabel = `${now.getMinutes()}:${now.getSeconds().toString().padStart(2, '0')}.${Math.floor(now.getMilliseconds()/100)}`;
    setHeartRateHistory(prev => [...prev, { time: timeLabel, value: hrValue }].slice(-MAX_DATA_POINTS));
    setAirflowHistory(prev => [...prev, { time: timeLabel, value: afValue }].slice(-MAX_DATA_POINTS));
    runEdgeInference(hrValue, afValue);

    if (locationShareState === 'countingDown' && afValue > 25) cancelLocationShare('inhalerUsed');
  }, [runEdgeInference, locationShareState]);

  // --- BLE Hooks ---
  const smartwatch = useBleDevice({
      deviceName: 'Smartwatch',
      serviceUUID: 'heart_rate', 
      characteristicUUID: 'heart_rate_measurement', 
      parseValue: parseHeartRate,
      onDataReceived: (val) => updateDataHistories(val, latestAirflow.current)
  });

  const inhaler = useBleDevice({
      deviceName: 'Smart Inhaler',
      serviceUUID: '19b10000-e8f2-537e-4f6c-d104768a1214',
      characteristicUUID: '19b10001-e8f2-537e-4f6c-d104768a1214',
      parseValue: parseAirflow,
      onDataReceived: (val) => updateDataHistories(latestHeartRate.current, val)
  });

  // --- Location Sharing & Simulation Logic ---
  const cancelLocationShare = (reason: 'user' | 'inhalerUsed' = 'user') => {
    if (locationTimerRef.current) clearTimeout(locationTimerRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    setLocationShareState(reason === 'inhalerUsed' ? 'cancelledInhalerUse' : 'cancelled');
    setTimeout(() => setLocationShareState(prev => (prev === 'cancelled' || prev === 'cancelledInhalerUse' ? 'idle' : prev)), 5000);
  };

  const startLocationShareCountdown = useCallback(() => {
    if (locationShareState !== 'idle') return;
    const mockLocation = () => {
        setUserLocation({ latitude: 12.9716, longitude: 77.5946 });
        setLocationShareState('countingDown');
        setLocationShareCountdown(LOCATION_SHARE_DELAY_MS / 1000);

        countdownIntervalRef.current = window.setInterval(() => setLocationShareCountdown(prev => prev > 0 ? prev - 1 : 0), 1000);
        locationTimerRef.current = window.setTimeout(() => {
             setLocationShareState('sent');
             sendAlertToBackend(12.9716, 77.5946);
             if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
             setTimeout(() => setLocationShareState('idle'), 5000);
        }, LOCATION_SHARE_DELAY_MS);
    };

    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                setUserLocation({ latitude: position.coords.latitude, longitude: position.coords.longitude });
                setLocationShareState('countingDown');
                setLocationShareCountdown(LOCATION_SHARE_DELAY_MS / 1000);
                countdownIntervalRef.current = window.setInterval(() => setLocationShareCountdown(prev => prev > 0 ? prev - 1 : 0), 1000);
                locationTimerRef.current = window.setTimeout(() => {
                    setLocationShareState('sent');
                    sendAlertToBackend(position.coords.latitude, position.coords.longitude);
                    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
                    setTimeout(() => setLocationShareState('idle'), 5000);
                }, LOCATION_SHARE_DELAY_MS);
            },
            (error) => {
                console.warn("Geolocation error, using Mock:", error);
                mockLocation();
            }
        );
    } else { mockLocation(); }
  }, [locationShareState]);

  useEffect(() => {
      if (anomalyStatus === 'Anomaly Detected' && 
         (anomalyMessage.includes('Airway') || anomalyMessage.includes('Tachycardia')) && 
         isLocationSharingEnabled && locationShareState === 'idle') {
          startLocationShareCountdown();
      }
  }, [anomalyStatus, anomalyMessage, isLocationSharingEnabled, locationShareState, startLocationShareCountdown]);

  const startSimulation = () => {
    if (smartwatch.status === 'Connected' || inhaler.status === 'Connected') {
      alert('Please disconnect real devices first.');
      return;
    }
    setIsSimulating(true);
    simTimeRef.current = 0;
    simulationConditionRef.current = 'normal';
  };
  const stopSimulation = () => setIsSimulating(false);
  const toggleSimulationCondition = () => { simulationConditionRef.current = simulationConditionRef.current === 'normal' ? 'attack' : 'normal'; };

  useEffect(() => {
    if (!isSimulating) { if (simulationIntervalRef.current) clearInterval(simulationIntervalRef.current); return; }
    simulationIntervalRef.current = window.setInterval(() => {
        simTimeRef.current += SIMULATION_INTERVAL_MS / 1000;
        const time = simTimeRef.current;
        const respPhase = time * 2 * Math.PI * 0.25;
        let hrBase = simulationConditionRef.current === 'attack' ? 135 : 75;
        let afBase = simulationConditionRef.current === 'attack' ? 8 : 20;
        const afVariability = simulationConditionRef.current === 'attack' ? 2 : 15;
        const afNoise = (Math.random() - 0.5) * 2;
        const newAf = afBase + (Math.sin(respPhase) * afVariability) + afNoise;
        const clampedAf = Math.max(0, newAf);
        const hrRSAMagnitude = simulationConditionRef.current === 'attack' ? 2 : 5;
        const hrNoise = (Math.random() - 0.5) * 3;
        const newHr = hrBase + Math.sin(respPhase) * hrRSAMagnitude + hrNoise;
        updateDataHistories(newHr, clampedAf);
    }, SIMULATION_INTERVAL_MS);
    return () => { if (simulationIntervalRef.current) clearInterval(simulationIntervalRef.current); };
  }, [isSimulating, updateDataHistories]);

  const handleLogout = () => {
      smartwatch.disconnect();
      inhaler.disconnect();
      stopSimulation();
      setIsAuthenticated(false);
      setHeartRateHistory([]);
      setAirflowHistory([]);
  };

  const handleConnectClick = (type: 'smartwatch' | 'inhaler') => {
      setPairingDeviceName(type === 'smartwatch' ? 'Smartwatch' : 'Smart Inhaler');
      setIsPairingModalOpen(true);
      if (type === 'smartwatch') smartwatch.connect().finally(() => setIsPairingModalOpen(false));
      else inhaler.connect().finally(() => setIsPairingModalOpen(false));
  };

  const LocationSharerBanner = () => {
    if (locationShareState === 'idle') return null;
    const bannerContent = {
        pendingPermission: { bg: 'bg-slate-800', border: 'border-slate-600', text: 'text-slate-300', icon: <MapPinIcon className="h-6 w-6 animate-pulse" />, title: 'Checking Location...', message: 'Acquiring GPS coordinates.', cancel: false },
        countingDown: { bg: 'bg-red-900', border: 'border-red-500', text: 'text-red-200', icon: <LungsIcon className="h-6 w-6 text-red-300 animate-bounce" />, title: 'Use Inhaler!', message: `SMS will be sent in ${locationShareCountdown}s`, cancel: true },
        sent: { bg: 'bg-green-900', border: 'border-green-500', text: 'text-green-200', icon: <CloudIcon className="h-6 w-6 animate-bounce" />, title: 'Alert Sent', message: `SMS sent to ${caregiverData.name}`, cancel: false },
        cancelled: { bg: 'bg-slate-900', border: 'border-slate-600', text: 'text-slate-300', icon: <WarningIcon className="h-6 w-6 animate-pulse" />, title: 'Cancelled', message: 'Location sharing cancelled.', cancel: false },
        cancelledInhalerUse: { bg: 'bg-slate-900', border: 'border-slate-600', text: 'text-slate-300', icon: <WarningIcon className="h-6 w-6 animate-pulse" />, title: 'Cancelled', message: 'Location sharing cancelled due to inhaler use.', cancel: false }
    }[locationShareState];
    return (
        <div className={`absolute top-2 left-1/2 -translate-x-1/2 border-l-4 ${bannerContent.border} ${bannerContent.bg} p-3 rounded-md flex gap-3 items-center`}>
            {bannerContent.icon}
            <div>
                <div className={`font-semibold ${bannerContent.text}`}>{bannerContent.title}</div>
                <div className={`text-sm ${bannerContent.text}`}>{bannerContent.message}</div>
            </div>
            {bannerContent.cancel && <button onClick={() => cancelLocationShare()} className="ml-auto p-1 bg-slate-700 rounded-md text-slate-100">Cancel</button>}
        </div>
    );
  };

  if (!isAuthenticated) return <LoginPage onLogin={() => setIsAuthenticated(true)} />;

  return (
      <div className="relative min-h-screen bg-slate-900 text-slate-100">
          <Header onLogout={handleLogout} />
          <LocationSharerBanner />
          <DashboardMockup
              heartRateData={heartRateHistory}
              airflowData={airflowHistory}
              anomalyStatus={anomalyStatus}
              anomalyMessage={anomalyMessage}
              onStartSimulation={startSimulation}
              onStopSimulation={stopSimulation}
              onToggleSimulation={toggleSimulationCondition}
              isSimulating={isSimulating}
          />
          <div className="grid grid-cols-2 gap-4 p-4">
              <DeviceConnectionCard name="Smartwatch" status={smartwatch.status} onConnect={() => handleConnectClick('smartwatch')} />
              <DeviceConnectionCard name="Smart Inhaler" status={inhaler.status} onConnect={() => handleConnectClick('inhaler')} />
          </div>
          {isPairingModalOpen && <PairingGuideModal deviceName={pairingDeviceName} />}
          {showNotification && (
              <div className="fixed bottom-5 left-1/2 -translate-x-1/2 bg-indigo-700 text-white p-3 rounded shadow-lg">
                  {notificationMessage}
              </div>
          )}
      </div>
  );
};

export default App;
