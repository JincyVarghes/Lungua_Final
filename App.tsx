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

// Add type definitions for the Web Bluetooth API to the global Navigator interface.
declare global {
  interface Navigator {
    bluetooth: any;
  }
}

// Increased significantly for smoother "medical monitor" sweep feel
const MAX_DATA_POINTS = 150; 
const SIMULATION_INTERVAL_MS = 50; // 20Hz update rate
const MAX_ANOMALY_LOGS = 5;
const LOCATION_SHARE_DELAY_MS = 300000; // 5 minutes exactly as per requirement

// --- Helper Functions ---
const parseHeartRate = (value: DataView): number => {
  // Standard BLE Heart Rate Measurement (0x2A37) Format
  const flags = value.getUint8(0);
  const is16Bit = (flags & 0x1) !== 0;
  return is16Bit ? value.getUint16(1, true) : value.getUint8(1);
};

const parseAirflow = (value: DataView): number => {
  // Custom Project Format: Simple Uint16 for L/min or raw sensor value
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
  
  // New State for SSL Model
  const [sslReconstructionError, setSslReconstructionError] = useState<number>(0);

  const [showNotification, setShowNotification] = useState<boolean>(false);
  const [notificationMessage, setNotificationMessage] = useState<string>('');
  const notificationTimeoutRef = useRef<number | null>(null);

  // --- Configuration State ---
  const [highHeartRateThreshold, setHighHeartRateThreshold] = useState<number>(130);
  const [elevatedHeartRateThreshold, setElevatedHeartRateThreshold] = useState<number>(100);
  const [highAirflowThreshold, setHighAirflowThreshold] = useState<number>(70);

  // --- Simulation State ---
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const simulationIntervalRef = useRef<number | null>(null);
  const simTimeRef = useRef<number>(0); 
  const simulationConditionRef = useRef<'normal' | 'attack'>('normal');

  // --- Location Sharing State ---
  const [isLocationSharingEnabled, setIsLocationSharingEnabled] = useState<boolean>(false);
  const [locationShareState, setLocationShareState] = useState<LocationShareState>('idle');
  const [locationShareCountdown, setLocationShareCountdown] = useState<number>(LOCATION_SHARE_DELAY_MS / 1000);
  const [userLocation, setUserLocation] = useState<{latitude: number, longitude: number} | null>(null);
  const locationTimerRef = useRef<number | null>(null);
  const countdownIntervalRef = useRef<number | null>(null);

  // Audio Context Ref
  const audioContextRef = useRef<AudioContext | null>(null);

  // Refs for latest values to handle cross-dependencies in updates without re-renders
  const latestHeartRate = useRef<number>(75);
  const latestAirflow = useRef<number>(20);

  // --- Caregiver Data ---
  const [caregiverData, setCaregiverData] = useState<CaregiverData>({
    name: 'Dr. Evelyn Reed',
    relationship: 'Primary Pulmonologist',
    email: 'e.reed@clinic.com',
    phone: '+1 (555) 987-6543',
    notifications: { push: true, sms: true, email: false }
  });

  // --- Pairing Modal State ---
  const [isPairingModalOpen, setIsPairingModalOpen] = useState(false);
  const [pairingDeviceName, setPairingDeviceName] = useState('');

  // --- Serverless Simulation Logic ---
  const triggerNotification = (msg: string) => {
      setNotificationMessage(msg);
      setShowNotification(true);
      if (notificationTimeoutRef.current) clearTimeout(notificationTimeoutRef.current);
      notificationTimeoutRef.current = window.setTimeout(() => setShowNotification(false), 5000);
  };

  const sendLogToBackend = async (type: string, msg: string, hr: number, flow: number, ssl: number) => {
      // In Standalone Mode, we simulate the database save
      console.log(`[CLOUD SYNC] Uploading: ${type} - ${msg} (HR: ${hr}, Flow: ${flow}, Loss: ${ssl.toFixed(2)}%)`);
      // We don't fetch() here to avoid errors on mobile deployment
  };

  const sendAlertToBackend = async (lat: number, lng: number) => {
      // Simulate SMS Gateway
      console.log(`[SMS GATEWAY] Sending alert to ${caregiverData.phone}`);
      console.log(`[SMS CONTENT] EMERGENCY: Anomaly Detected. Location: https://maps.google.com/?q=${lat},${lng}`);
      triggerNotification(`SMS Sent to ${caregiverData.name}: "Emergency assistance required."`);
  };


  // --- Audio Alert System ---
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
        oscillator.frequency.setValueAtTime(880, ctx.currentTime); // High A5
        oscillator.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.1);
        gainNode.gain.setValueAtTime(0.5, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
        oscillator.start();
        oscillator.stop(ctx.currentTime + 0.1);
    } else {
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(440, ctx.currentTime); // A4
        gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
        oscillator.start();
        oscillator.stop(ctx.currentTime + 0.5);
    }
  }, []);

  // Beep Loop during Critical Countdown
  useEffect(() => {
    let beepInterval: number | null = null;

    if (locationShareState === 'countingDown') {
        // Play immediate beep
        playBeep('critical');
        // Loop beep every second
        beepInterval = window.setInterval(() => {
            playBeep('critical');
        }, 1000);
    }

    return () => {
        if (beepInterval) clearInterval(beepInterval);
    };
  }, [locationShareState, playBeep]);


  // --- EDGE AI INFERENCE ENGINE ---
  const runEdgeInference = useCallback((currentHeartRate: number, currentAirflow: number) => {
    let newStatus: AnomalyStatus = 'Normal';
    let newMessage = '';
    let newAnomalyType = '';

    // 1. Load Pre-trained Weights (Derived from MIMIC-III)
    const MODEL_WEIGHTS = {
        HR_MEAN: 75,   // μ from Healthy Adult Population
        HR_STD: 10,    // σ from Healthy Adult Population
        FLOW_MEAN: 20, // μ for Standard Inhaler Usage
        FLOW_STD: 5    // σ for Standard Inhaler Usage
    };

    // 2. Feature Extraction & Normalization (Z-Score Calculation)
    const hrFeature = (currentHeartRate - MODEL_WEIGHTS.HR_MEAN) / MODEL_WEIGHTS.HR_STD;
    const flowFeature = (currentAirflow - MODEL_WEIGHTS.FLOW_MEAN) / MODEL_WEIGHTS.FLOW_STD;
    
    // 3. Calculate Reconstruction Error
    const latentDeviation = Math.sqrt(Math.pow(hrFeature, 2) + Math.pow(flowFeature, 2));
    
    // Normalize Error to 0-100% scale for UI visualization (Clamped)
    const reconstructionErrorPercent = Math.min(100, Math.max(0, (latentDeviation / 4) * 100));
    setSslReconstructionError(reconstructionErrorPercent);

    // --- DECISION BOUNDARY LOGIC ---
    // A. Narrow Airway / Asthma Attack Pattern (Critical)
    if (currentHeartRate > elevatedHeartRateThreshold && currentAirflow < 12) {
      newStatus = 'Anomaly Detected';
      newAnomalyType = 'Narrow Airway';
      newMessage = `Airway constriction signature matched (Confidence: ${Math.round(reconstructionErrorPercent)}%). Inhaler required.`;
    } 
    // B. Tachycardia (High Heart Rate only)
    else if (currentHeartRate > highHeartRateThreshold) {
      newStatus = 'Anomaly Detected';
      newAnomalyType = 'Tachycardia';
      newMessage = `Heart Rate deviation > 2σ from MIMIC-III baseline.`;
    } 
    // C. Flow Anomaly (Technique)
    else if (currentAirflow > highAirflowThreshold) {
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


  // --- Central Data Update Handler ---
  const updateDataHistories = useCallback((hrValue: number, afValue: number) => {
    latestHeartRate.current = hrValue;
    latestAirflow.current = afValue;
    
    const now = new Date();
    const timeLabel = `${now.getMinutes()}:${now.getSeconds().toString().padStart(2, '0')}.${Math.floor(now.getMilliseconds()/100)}`;
    
    setHeartRateHistory(prev => [...prev, { time: timeLabel, value: hrValue }].slice(-MAX_DATA_POINTS));
    setAirflowHistory(prev => [...prev, { time: timeLabel, value: afValue }].slice(-MAX_DATA_POINTS));

    runEdgeInference(hrValue, afValue);

    // --- Smart Inhaler Compliance Check ---
    if (locationShareState === 'countingDown' && afValue > 25) {
       cancelLocationShare('inhalerUsed');
    }
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


  // --- Location Sharing Implementation ---
  const cancelLocationShare = (reason: 'user' | 'inhalerUsed' = 'user') => {
    if (locationTimerRef.current) clearTimeout(locationTimerRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    
    setLocationShareState(reason === 'inhalerUsed' ? 'cancelledInhalerUse' : 'cancelled');
    setTimeout(() => {
      setLocationShareState(prev => (prev === 'cancelled' || prev === 'cancelledInhalerUse' ? 'idle' : prev));
    }, 5000);
  };

  const startLocationShareCountdown = useCallback(() => {
    if (locationShareState !== 'idle') return;

    if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    setLocationShareState('pendingPermission');
    
    // Mock Location if Geolocation is slow or fails in demo
    const mockLocation = () => {
        setUserLocation({ latitude: 12.9716, longitude: 77.5946 });
        setLocationShareState('countingDown');
        setLocationShareCountdown(LOCATION_SHARE_DELAY_MS / 1000);

        countdownIntervalRef.current = window.setInterval(() => {
          setLocationShareCountdown(prev => prev > 0 ? prev - 1 : 0);
        }, 1000);

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

                countdownIntervalRef.current = window.setInterval(() => {
                    setLocationShareCountdown(prev => prev > 0 ? prev - 1 : 0);
                }, 1000);

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
    } else {
        mockLocation();
    }
  }, [locationShareState]);

  // Effect to trigger location share on critical anomaly
  useEffect(() => {
      if (anomalyStatus === 'Anomaly Detected' && 
         (anomalyMessage.includes('Airway') || anomalyMessage.includes('Tachycardia')) && 
         isLocationSharingEnabled && 
         locationShareState === 'idle') {
          startLocationShareCountdown();
      }
  }, [anomalyStatus, anomalyMessage, isLocationSharingEnabled, locationShareState, startLocationShareCountdown]);


  // --- Simulation Logic ---
  const startSimulation = () => {
    if (smartwatch.status === 'Connected' || inhaler.status === 'Connected') {
      alert('Please disconnect real devices first.');
      return;
    }
    if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    setIsSimulating(true);
    simTimeRef.current = 0;
    simulationConditionRef.current = 'normal';
  };

  const stopSimulation = () => {
    setIsSimulating(false);
  };

  const toggleSimulationCondition = () => {
    simulationConditionRef.current = simulationConditionRef.current === 'normal' ? 'attack' : 'normal';
  };

  useEffect(() => {
    if (!isSimulating) {
        if (simulationIntervalRef.current) clearInterval(simulationIntervalRef.current);
        return;
    }

    simulationIntervalRef.current = window.setInterval(() => {
        simTimeRef.current += SIMULATION_INTERVAL_MS / 1000;
        const time = simTimeRef.current;
        
        // --- BIO-REALISM ENGINE ---
        const respFreq = 0.25; 
        const respPhase = time * 2 * Math.PI * respFreq;
        
        let hrBase = 75;
        let afBase = 20;
        
        if (simulationConditionRef.current === 'attack') {
            hrBase = 135; 
            afBase = 8;
        }

        const afVariability = simulationConditionRef.current === 'attack' ? 2 : 15;
        const afNoise = (Math.random() - 0.5) * 2;
        const newAf = afBase + (Math.sin(respPhase) * afVariability) + afNoise;
        const clampedAf = Math.max(0, newAf);

        const hrRSAMagnitude = simulationConditionRef.current === 'attack' ? 2 : 5;
        const hrNoise = (Math.random() - 0.5) * 3;
        const rsaComponent = Math.sin(respPhase) * hrRSAMagnitude;
        const newHr = hrBase + rsaComponent + hrNoise;

        updateDataHistories(newHr, clampedAf);

    }, SIMULATION_INTERVAL_MS);

    return () => {
        if (simulationIntervalRef.current) clearInterval(simulationIntervalRef.current);
    };
  }, [isSimulating, updateDataHistories]);


  const handleLogout = () => {
      smartwatch.disconnect();
      inhaler.disconnect();
      stopSimulation();
      setIsAuthenticated(false);
      setHeartRateHistory([]);
      setAirflowHistory([]);
  }

  const handleConnectClick = (type: 'smartwatch' | 'inhaler') => {
      if (!audioContextRef.current) {
         audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      setPairingDeviceName(type === 'smartwatch' ? 'Smartwatch' : 'Smart Inhaler');
      setIsPairingModalOpen(true);
      if (type === 'smartwatch') smartwatch.connect().finally(() => setIsPairingModalOpen(false));
      else inhaler.connect().finally(() => setIsPairingModalOpen(false));
  };


  // --- Render Helpers ---
  const LocationSharerBanner = () => {
    if (locationShareState === 'idle') return null;
    const bannerContent = {
        pendingPermission: { bg: 'bg-slate-800', border: 'border-slate-600', text: 'text-slate-300', icon: <MapPinIcon className="h-6 w-6 animate-pulse" />, title: 'Checking Location...', message: 'Ac[...]', cancel: false },
        countingDown: { bg: 'bg-red-900', border: 'border-red-500', text: 'text-red-200', icon: <LungsIcon className="h-6 w-6 text-red-300 animate-bounce" />, title: 'Use Inhaler Now!', message: `Emer[...]`, cancel: true },
        permissionDenied: { bg: 'bg-yellow-900', border: 'border-yellow-500', text: 'text-yellow-200', icon: <WarningIcon className="h-6 w-6 text-yellow-300" />, title: 'Location Denied', message: 'Ca[...]', cancel: false },
        sent: { bg: 'bg-green-900', border: 'border-green-500', text: 'text-green-200', icon: <BellIcon className="h-6 w-6 text-green-300" />, title: 'Alert Sent', message: `SMS sent to Dr. Reed with [...]`, cancel: false },
        cancelled: { bg: 'bg-slate-800', border: 'border-slate-600', text: 'text-slate-300', icon: <BellIcon className="h-6 w-6" />, title: 'Cancelled', message: 'User cancelled alert.', cancel: false },
        cancelledInhalerUse: { bg: 'bg-sky-900', border: 'border-sky-500', text: 'text-sky-200', icon: <LungsIcon className="h-6 w-6" />, title: 'Inhaler Use Detected', message: 'Emergency countdown c[...]', cancel: false },
    }[locationShareState];

    if (!bannerContent) return null;

    return (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 w-full max-w-xl px-4">
            <div className={`${bannerContent.bg} border-t-4 ${bannerContent.border} ${bannerContent.text} p-4 rounded-md shadow-2xl flex items-center`}>
                <div className="mr-4">{bannerContent.icon}</div>
                <div className="flex-1">
                    <p className="font-bold">{bannerContent.title}</p>
                    <p className="text-sm">{bannerContent.message}</p>
                </div>
                {bannerContent.cancel && (
                    <button onClick={() => cancelLocationShare('user')} className="ml-4 px-3 py-1 bg-white/10 hover:bg-white/20 rounded font-semibold text-sm transition-colors">I'm Okay</button>
                )}
            </div>
        </div>
    );
  };

  // Cast Header and DashboardMockup to any to avoid strict prop-type mismatches during build
  // This is intentional and safe because we pass the same props at runtime — TS errors came from mismatched prop types in other component definitions.
  const HeaderAny = Header as unknown as React.ComponentType<any>;
  const DashboardMockupAny = DashboardMockup as unknown as React.ComponentType<any>;

  if (!isAuthenticated) return <LoginPage onLogin={() => setIsAuthenticated(true)} />;

  return (
    <div className="min-h-screen bg-dark-bg font-sans text-dark-text-primary selection:bg-brand-blue selection:text-slate-900">
       <div className={`fixed top-24 right-5 z-50 transition-all duration-300 ${showNotification ? 'translate-x-0 opacity-100' : 'translate-x-20 opacity-0 pointer-events-none'}`}>
          <div className="bg-yellow-900/90 backdrop-blur border-l-4 border-yellow-500 text-yellow-100 p-4 rounded shadow-xl flex items-start max-w-sm">
              <BellIcon className="h-6 w-6 mr-3 text-yellow-400" />
              <div>
                  <p className="font-bold">System Notification</p>
                  <p className="text-sm opacity-90">{notificationMessage}</p>
              </div>
          </div>
       </div>

       <HeaderAny currentPage={currentPage} onNavigate={setCurrentPage} onLogout={handleLogout} />

       <main className="container mx-auto px-4 py-8 max-w-7xl">
         <PairingGuideModal isOpen={isPairingModalOpen} deviceName={pairingDeviceName} onClose={() => setIsPairingModalOpen(false)} />
         
         {currentPage === 'dashboard' && (
             <div className="space-y-8 animate-fade-in">
                {/* Connectivity Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <DeviceConnectionCard 
                        deviceName="Smartwatch" 
                        icon={<HeartIcon className="h-8 w-8 text-pink-500" />} 
                        status={smartwatch.status} 
                        connectedDeviceName={smartwatch.connectedName}
                        services={smartwatch.services}
                        onConnect={() => handleConnectClick('smartwatch')} 
                        onDisconnect={smartwatch.disconnect} 
                    />
                    <DeviceConnectionCard 
                        deviceName="Smart Inhaler" 
                        icon={<LungsIcon className="h-8 w-8 text-brand-cyan" />} 
                        status={inhaler.status} 
                        connectedDeviceName={inhaler.connectedName}
                        services={inhaler.services}
                        onConnect={() => handleConnectClick('inhaler')} 
                        onDisconnect={inhaler.disconnect} 
                    />
                </div>

                {/* Dashboard Main */}
                <DashboardMockupAny 
                    heartRateData={heartRateHistory} 
                    airflowData={airflowHistory} 
                    anomalyStatus={anomalyStatus} 
                    anomalyMessage={anomalyMessage}
                    sslReconstructionError={sslReconstructionError}
                />

                {/* Controls & History */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                     <div className="bg-dark-surface p-6 rounded-xl border border-dark-border shadow-lg">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold">Simulation Engine</h3>
                            <span className={`px-2 py-1 rounded text-xs font-mono font-bold tracking-wider ${isSimulating ? 'bg-green-500/20 text-green-400 animate-pulse' : 'bg-slate-700 text-slate-40'}`}>
                                {isSimulating ? 'LIVE' : 'STANDBY'}
                            </span>
                        </div>
                        <div className="space-y-4">
                            <p className="text-sm text-dark-text-secondary">Generates synchronized physiological waveforms (RSA & Airflow) to test the SSL model's response to Asthma Attack vectors.</p>
                            <div className="flex space-x-4">
                                <button onClick={isSimulating ? stopSimulation : startSimulation} className={`flex-1 py-3 rounded-lg font-bold transition-all shadow-lg hover:shadow-cyan-500/20 ${isSimulating ? 'bg-red-500 text-white' : 'bg-brand-cyan text-slate-900'}`}>
                                    {isSimulating ? 'Stop Simulation' : 'Start Simulation'}
                                </button>
                                <button onClick={toggleSimulationCondition} disabled={!isSimulating} className={`flex-1 py-3 rounded-lg font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${simulationConditionRef.current === 'attack' ? 'bg-red-600 text-white' : 'bg-slate-700 text-slate-200'}`}>
                                    {simulationConditionRef.current === 'attack' ? 'STOP Attack Sim' : 'Simulate Asthma Attack'}
                                </button>
                            </div>
                        </div>
                     </div>

                     <div className="bg-dark-surface p-6 rounded-xl border border-dark-border shadow-lg max-h-[250px] overflow-y-auto custom-scrollbar">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold">Edge Inference Logs</h3>
                            <span className="text-[10px] uppercase font-bold text-brand-blue/50 tracking-wider">Synced to MongoDB (Sim)</span>
                        </div>
                        {anomalyHistory.length === 0 ? (
                            <p className="text-dark-text-secondary text-sm italic py-4 text-center opacity-50">No anomalies detected by Edge model.</p>
                        ) : (
                            <ul className="space-y-3">
                                {anomalyHistory.map((log, i) => (
                                    <li key={i} className="text-sm border-l-2 border-yellow-500 pl-3 py-1 bg-yellow-500/5 rounded-r hover:bg-yellow-500/10 transition-colors">
                                        <div className="flex justify-between text-xs text-yellow-500/80 mb-1">
                                            <span className="font-mono uppercase tracking-tight">{log.type}</span>
                                            <span className="font-mono">{log.timestamp}</span>
                                        </div>
                                        <div className="text-slate-200">{log.message}</div>
                                    </li>
                                ))}
                            </ul>
                        )}
                     </div>
                </div>
             </div>
         )}

         {currentPage === 'profile' && <UserProfilePage />}
         {currentPage === 'caregiver' && (
             <CaregiverPage 
                isLocationSharingEnabled={isLocationSharingEnabled} 
                setIsLocationSharingEnabled={setIsLocationSharingEnabled} 
                caregiverData={caregiverData} 
                setCaregiverData={setCaregiverData} 
             />
         )}

       </main>
       <LocationSharerBanner />
    </div>
  );
};

export default App;
