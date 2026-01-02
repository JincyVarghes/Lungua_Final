import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Header } from './components/Header';
import { DashboardMockup } from './components/DashboardMockup';
import { CaregiverPage } from './pages/CaregiverPage';
import { LoginPage } from './pages/LoginPage';
import { UserProfilePage } from './pages/UserProfilePage';
import { useBleDevice } from './hooks/useBleDevice';
import type { ChartDataPoint, AnomalyStatus, AnomalyLogEntry, Page, LocationShareState, CaregiverData } from './types';

// ---------------- BACKEND CONFIG ----------------
const BASE_URL = "https://lungua-final-3.onrender.com"; // Render backend URL

// Extend Navigator for Web Bluetooth API
declare global {
  interface Navigator {
    bluetooth: any;
  }
}

// Example Anomaly Log Type
interface AnomalyLog {
  name: string;
  age: number;
  caregiverPhone: string;
  extraInfo: object;
}

// ---------------- APP COMPONENT ----------------
export const App: React.FC = () => {
  const [anomalyDetected, setAnomalyDetected] = useState(false);
  const [latestAnomalyLog, setLatestAnomalyLog] = useState<AnomalyLog | null>(null);

  // ---------------- BLE HOOK ----------------
  const { status: bleStatus, connect, disconnect } = useBleDevice({
    deviceName: "SmartInhaler",
    serviceUUID: "0000180d-0000-1000-8000-00805f9b34fb", // Heart rate service example
    parseValue: (dataView: DataView) => dataView.getUint8(0),
    onDataReceived: (value: number) => {
      // Example: trigger anomaly if heartbeat > 120
      if (value > 120) {
        const log: AnomalyLog = {
          name: "Patient 1",
          age: 25,
          caregiverPhone: "0000000000",
          extraInfo: { reason: `High heart rate detected: ${value}` },
        };
        setLatestAnomalyLog(log);
        setAnomalyDetected(true);
      }
    },
  });

  // ---------------- SEND ANOMALY TO BACKEND ----------------
  const sendAnomalyToBackend = useCallback(async (log: AnomalyLog) => {
    try {
      console.log("📡 Sending anomaly to backend...");
      const response = await fetch(`${BASE_URL}/api/patients`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(log),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Server error: ${response.status} — ${text}`);
      }

      const data = await response.json();
      console.log("✅ Successfully saved anomaly:", data);
    } catch (error) {
      console.error("❌ Failed to send anomaly to backend:", error);
    }
  }, []);

  // ---------------- EFFECT: SEND WHEN ANOMALY DETECTED ----------------
  useEffect(() => {
    if (anomalyDetected && latestAnomalyLog) {
      sendAnomalyToBackend(latestAnomalyLog);
    }
  }, [anomalyDetected, latestAnomalyLog, sendAnomalyToBackend]);

  // ---------------- CLEANUP ----------------
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  // ---------------- RENDER ----------------
  return (
    <div className="App">
      {/* Header stays exactly as you designed */}
      <Header />

      {/* Dashboard mockup with charts, cards, and UI */}
      <DashboardMockup
        bleStatus={bleStatus}
        onSimulateAnomaly={() => {
          const log: AnomalyLog = {
            name: "Test Patient",
            age: 25,
            caregiverPhone: "0000000000",
            extraInfo: { reason: "Simulated airway constriction" },
          };
          setLatestAnomalyLog(log);
          setAnomalyDetected(true);
        }}
      />

      {/* Example Pages – these are still available */}
      {/* Add routing here if needed */}
      {/* <CaregiverPage /> */}
      {/* <LoginPage /> */}
      {/* <UserProfilePage /> */}
    </div>
  );
};

export default App;
