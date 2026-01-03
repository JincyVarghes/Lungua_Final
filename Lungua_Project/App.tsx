import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { DashboardMockup } from './components/DashboardMockup';
import { LoginPage } from './pages/LoginPage';
import type {
  ChartDataPoint,
  AnomalyStatus,
  Page,
  CaregiverData
} from './types';

/* ================= BACKEND URL ================= */
const BACKEND_URL = 'https://lungua-final-3.onrender.com';
/* =============================================== */

declare global {
  interface Navigator {
    bluetooth: any;
  }
}

const SIMULATION_INTERVAL_MS = 50;

const App: React.FC = () => {
  /* ================= AUTH & NAV ================= */
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');

  /* ================= SENSOR DATA ================= */
  const [heartRateHistory, setHeartRateHistory] = useState<ChartDataPoint[]>([]);
  const [airflowHistory, setAirflowHistory] = useState<ChartDataPoint[]>([]);
  const [anomalyStatus, setAnomalyStatus] = useState<AnomalyStatus>('Normal');
  const [anomalyMessage, setAnomalyMessage] = useState('');
  const [sslReconstructionError, setSslReconstructionError] = useState(12);

  /* ================= SIMULATION ================= */
  const [isSimulating, setIsSimulating] = useState(false);
  const simulationIntervalRef = useRef<number | null>(null);
  const simulationConditionRef = useRef<'normal' | 'attack'>('normal');

  /* ================= CAREGIVER ================= */
  const caregiverData: CaregiverData = {
    name: 'Dr. Evelyn Reed',
    relationship: 'Primary Pulmonologist',
    email: 'e.reed@clinic.com',
    phone: '+1 (555) 987-6543',
    notifications: { push: true, sms: true, email: false }
  };

  /* ================= BACKEND LOG ================= */
  const sendLogToBackend = async (
    type: string,
    message: string,
    hr: number,
    flow: number
  ) => {
    const payload = {
      name: type,
      age: hr,
      caregiverPhone: caregiverData.phone,
      extraInfo: {
        message,
        airflow: flow,
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

  /* ================= INFERENCE ================= */
  const runInference = useCallback((hr: number, flow: number) => {
    if (hr > 100 && flow < 12) {
      setAnomalyStatus('Anomaly Detected');
      setAnomalyMessage('Airway constriction detected');
      setSslReconstructionError(82);
      sendLogToBackend('Narrow Airway', 'Airway constriction detected', hr, flow);
    } else {
      setAnomalyStatus('Normal');
      setAnomalyMessage('');
      setSslReconstructionError(15);
    }
  }, []);

  /* ================= SIMULATION LOOP ================= */
  useEffect(() => {
    if (!isSimulating) return;

    simulationIntervalRef.current = window.setInterval(() => {
      const attack = simulationConditionRef.current === 'attack';
      const hr = attack ? 135 : 75;
      const flow = attack ? 8 : 20;

      runInference(hr, flow);

      setHeartRateHistory(prev =>
        [...prev, { time: Date.now().toString(), value: hr }].slice(-150)
      );

      setAirflowHistory(prev =>
        [...prev, { time: Date.now().toString(), value: flow }].slice(-150)
      );
    }, SIMULATION_INTERVAL_MS);

    return () => {
      if (simulationIntervalRef.current) {
        clearInterval(simulationIntervalRef.current);
      }
    };
  }, [isSimulating, runInference]);

  /* ================= UI ================= */
  if (!isAuthenticated) {
    return <LoginPage onLogin={() => setIsAuthenticated(true)} />;
  }

  return (
    <div className="min-h-screen bg-dark-background text-dark-text-primary">
      <Header
        currentPage={currentPage}
        onNavigate={setCurrentPage}
        onLogout={() => setIsAuthenticated(false)}
      />

      <main className="p-6">
        {currentPage === 'dashboard' && (
          <DashboardMockup
            heartRateData={heartRateHistory}
            airflowData={airflowHistory}
            anomalyStatus={anomalyStatus}
            anomalyMessage={anomalyMessage}
            sslReconstructionError={sslReconstructionError}
          />
        )}
      </main>
    </div>
  );
};

export default App;

