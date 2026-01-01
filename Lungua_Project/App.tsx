import React, { useState, useEffect } from "react";
import Header from "./components/Header";
import Dashboard from "./components/Dashboard";
import SimulationControls from "./components/SimulationControls";
import "./App.css";

function App() {
  // -----------------------------
  // REQUIRED STATE (FIXES BUILD)
  // -----------------------------
  const [currentPatient, setCurrentPatient] = useState({
    name: "Test Patient",
    age: 22,
    caregiverPhone: "9999999999",
  });

  const [alertLevel, setAlertLevel] = useState<"NORMAL" | "WARNING" | "CRITICAL">(
    "NORMAL"
  );

  const [chartDataPoints, setChartDataPoints] = useState<number[]>([]);

  const [anomalyStatus, setAnomalyStatus] = useState<string>("No anomalies");

  const [isSimulating, setIsSimulating] = useState(false);

  // -----------------------------
  // SIMULATION HANDLERS
  // -----------------------------
  const startSimulation = () => {
    setIsSimulating(true);
    setAlertLevel("WARNING");
    setAnomalyStatus("Simulation running");

    // dummy chart data
    setChartDataPoints((prev) => [...prev, Math.random() * 100]);
  };

  const stopSimulation = () => {
    setIsSimulating(false);
    setAlertLevel("NORMAL");
    setAnomalyStatus("Simulation stopped");
  };

  const handleLogout = () => {
    console.log("Logged out");
  };

  // -----------------------------
  // AUTO DATA UPDATE (OPTIONAL)
  // -----------------------------
  useEffect(() => {
    if (!isSimulating) return;

    const interval = setInterval(() => {
      setChartDataPoints((prev) => [
        ...prev.slice(-10),
        Math.random() * 120,
      ]);
    }, 2000);

    return () => clearInterval(interval);
  }, [isSimulating]);

  // -----------------------------
  // UI
  // -----------------------------
  return (
    <div className="App">
      <Header
        currentPatient={currentPatient}
        alertLevel={alertLevel}
        chartDataPoints={chartDataPoints}
        anomalyStatus={anomalyStatus}
        onLogout={handleLogout}
      />

      <Dashboard
        patient={currentPatient}
        alertLevel={alertLevel}
        anomalyStatus={anomalyStatus}
        chartData={chartDataPoints}
      />

      <SimulationControls
        isRunning={isSimulating}
        onStart={startSimulation}
        onStop={stopSimulation}
      />
    </div>
  );
}

export default App;
