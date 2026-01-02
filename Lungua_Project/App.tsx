import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { DashboardMockup } from './components/DashboardMockup';
import { useBleDevice } from './hooks/useBleDevice';
import type { ChartDataPoint, AnomalyStatus, Page } from './types';

const BASE_URL = 'https://lungua-final-3.onrender.com';

interface AnomalyExtraInfo {
  reason: string;
}

interface AnomalyLog {
  name: string;
  age: number;
  caregiverPhone: string;
  extraInfo: AnomalyExtraInfo;
}

export const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<Page>('dashboard');
  const [anomalyDetected, setAnomalyDetected] = useState(false);
  const [latestAnomalyLog, setLatestAnomalyLog] =
    useState<AnomalyLog | null>(null);

  const handleNavigate = (page: Page) => setCurrentPage(page);
  const handleLogout = () => console.log('Logout');

  const { status: bleStatus, disconnect } = useBleDevice({
    deviceName: 'SmartInhaler',
    serviceUUID: '0000180d-0000-1000-8000-00805f9b34fb',
    parseValue: (dataView: DataView) => dataView.getUint8(0),
    onDataReceived: (value: number) => {
      if (value > 120) {
        const log: AnomalyLog = {
          name: 'Patient 1',
          age: 25,
          caregiverPhone: '0000000000',
          extraInfo: {
            reason: `High heart rate detected: ${value}`,
          },
        };
        setLatestAnomalyLog(log);
        setAnomalyDetected(true);
      }
    },
  });

  const sendAnomalyToBackend = useCallback(async (log: AnomalyLog) => {
    try {
      await fetch(`${BASE_URL}/api/patients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(log),
      });
    } catch (err) {
      console.error('Failed to send anomaly', err);
    }
  }, []);

  useEffect(() => {
    if (anomalyDetected && latestAnomalyLog) {
      sendAnomalyToBackend(latestAnomalyLog);
    }
  }, [anomalyDetected, latestAnomalyLog, sendAnomalyToBackend]);

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return (
    <div className="App">
      <Header
        currentPage={currentPage}
        onNavigate={handleNavigate}
        onLogout={handleLogout}
      />

      <DashboardMockup
        heartRateData={[]}
        airflowData={[]}
        anomalyStatus={anomalyDetected ? 'Anomaly Detected' : 'Normal'}
        anomalyMessage={latestAnomalyLog?.extraInfo.reason || ''}
        sslReconstructionError={0}
      />
    </div>
  );
};

export default App;
