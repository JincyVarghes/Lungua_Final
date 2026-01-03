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

declare global {
  interface Navigator {
    bluetooth: any;
  }
}

const MAX_DATA_POINTS = 150;
const SIMULATION_INTERVAL_MS = 50;
const MAX_ANOMALY_LOGS = 5;
const LOCATION_SHARE_DELAY_MS = 300000;

const parseHeartRate = (value: DataView): number => {
  const flags = value.getUint8(0);
  const is16Bit = (flags & 0x1) !== 0;
  return is16Bit ? value.getUint16(1, true) : value.getUint8(1);
};

const parseAirflow = (value: DataView): number => {
  return value.getUint16(0, true);
};

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');

  const [heartRateHistory, setHeartRateHistory] = useState<ChartDataPoint[]>([]);
  const [airflowHistory, setAirflowHistory] = useState<ChartDataPoint[]>([]);
  const [anomalyStatus, setAnomalyStatus] = useState<AnomalyStatus>('Normal');
  const [anomalyMessage, setAnomalyMessage] = useState('');
  const [anomalyHistory, setAnomalyHistory] = useState<AnomalyLogEntry[]>([]);
  const [sslReconstructionError, setSslReconstructionError] = useState(0);

  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  const notificationTimeoutRef = useRef<number | null>(null);

  const [highHeartRateThreshold] = useState(130);
  const [elevatedHeartRateThreshold] = useState(100);
  const [highAirflowThreshold] = useState(70);

  const [isSimulating, setIsSimulating] = useState(false);
  const simulationIntervalRef = useRef<number | null>(null);
  const simTimeRef = useRef(0);
  const simulationConditionRef = useRef<'normal' | 'attack'>('normal');

  const audioContextRef = useRef<AudioContext | null>(null);
  const latestHeartRate = useRef(75);
  const latestAirflow = useRef(20);

  const [caregiverData] = useState<CaregiverData>({
    name: 'Dr. Evelyn Reed',
    relationship: 'Primary Pulmonologist',
    email: 'e.reed@clinic.com',
    phone: '+1 (555) 987-6543',
    notifications: { push: true, sms: true, email: false }
  });

  /* ============ BACKEND SYNC FUNCTION ============ */
  const sendLogToBackend = async (
    type: string,
    msg: string,
    hr: number,
    flow: number,
    ssl: number
  ) => {
    const payload = {
      name: type,
      age: hr,
      caregiverPhone: caregiverData.phone,
      extraInfo: {
        message: msg,
        airflow: flow,
        sslError: ssl,
        timestamp: new Date().toISOString()
      }
    };

    console.log('[BACKEND → POST]', `${BACKEND_URL}/api/patients`, payload);

    try {
      const res = await fetch(`${BACKEND_URL}/api/patients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      console.log('[BACKEND ← RESPONSE]', res.status, data);
    } catch (err) {
      console.error('[BACKEND ERROR]', err);
    }
  };
  /* ============================================== */

  const runEdgeInference = useCallback((hr: number, flow: number) => {
    let status: AnomalyStatus = 'Normal';
    let message = '';
    let type = '';

    const hrDev = (hr - 75) / 10;
    const flowDev = (flow - 20) / 5;
    const deviation = Math.sqrt(hrDev ** 2 + flowDev ** 2);
    const sslErr = Math.min(100, (deviation / 4) * 100);
    setSslReconstructionError(sslErr);

    if (hr > elevatedHeartRateThreshold && flow < 12) {
      status = 'Anomaly Detected';
      type = 'Narrow Airway';
      message = `Airway constriction detected (Confidence ${Math.round(sslErr)}%)`;
    }

    setAnomalyStatus(prev => {
      if (prev !== status && status === 'Anomaly Detected') {
        sendLogToBackend(type, message, hr, flow, sslErr);
        setAnomalyMessage(message);
      }
      if (status === 'Normal') setAnomalyMessage('');
      return status;
    });
  }, []);

  const updateDataHistories = useCallback((hr: number, flow: number) => {
    latestHeartRate.current = hr;
    latestAirflow.current = flow;
    runEdgeInference(hr, flow);
  }, [runEdgeInference]);

  const startSimulation = () => {
    setIsSimulating(true);
    simTimeRef.current = 0;
  };

  const stopSimulation = () => setIsSimulating(false);

  useEffect(() => {
    if (!isSimulating) return;

    simulationIntervalRef.current = window.setInterval(() => {
      const attack = simulationConditionRef.current === 'attack';
      const hr = attack ? 135 : 75;
      const flow = attack ? 8 : 20;
      updateDataHistories(hr + Math.random() * 3, flow + Math.random());
    }, SIMULATION_INTERVAL_MS);

    return () => {
      if (simulationIntervalRef.current) clearInterval(simulationIntervalRef.current);
    };
  }, [isSimulating, updateDataHistories]);

  if (!isAuthenticated) return <LoginPage onLogin={() => setIsAuthenticated(true)} />;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      <Header onLogout={() => setIsAuthenticated(false)} />
      <DashboardMockup
        heartRateData={heartRateHistory}
        airflowData={airflowHistory}
        anomalyStatus={anomalyStatus}
        anomalyMessage={anomalyMessage}
        onStartSimulation={startSimulation}
        onStopSimulation={stopSimulation}
        onToggleSimulation={() =>
          simulationConditionRef.current =
            simulationConditionRef.current === 'normal' ? 'attack' : 'normal'
        }
        isSimulating={isSimulating}
      />
    </div>
  );
};

export default App;
