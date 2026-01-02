import React, { useState, useEffect } from "react";

// 🟢 Replace this with your Render backend
const BACKEND_BASE_URL = "https://lungua-final-3.onrender.com";

interface AnomalyLog {
  name: string;
  age: number;
  caregiverPhone: string;
  extraInfo: object;
}

function App() {
  const [anomalyDetected, setAnomalyDetected] = useState(false);

  // Example simulated anomaly data
  const exampleAnomaly: AnomalyLog = {
    name: "Test Patient",
    age: 25,
    caregiverPhone: "0000000000",
    extraInfo: { reason: "Simulated airway constriction" },
  };

  const sendAnomalyToBackend = async (log: AnomalyLog) => {
    try {
      console.log("📡 Sending anomaly to backend...");
      const response = await fetch(`${BACKEND_BASE_URL}/api/patients`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
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
  };

  // Example effect: send when anomalyDetected flips true
  useEffect(() => {
    if (anomalyDetected) {
      sendAnomalyToBackend(exampleAnomaly);
    }
  }, [anomalyDetected]);

  return (
    <div className="App">
      <h1>Lungua Smart Inhaler Dashboard</h1>

      {/* Example anomaly trigger */}
      <button
        onClick={() => {
          console.log("🔔 Anomaly triggered");
          setAnomalyDetected(true);
        }}
      >
        Simulate Anomaly
      </button>

      {/* UI stays exactly the same — no layout change */}
    </div>
  );
}

export default App;
