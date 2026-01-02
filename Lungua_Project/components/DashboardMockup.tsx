import React from 'react';
import type { ChartDataPoint, AnomalyStatus } from '../types';

interface DashboardMockupProps {
  heartRateData: ChartDataPoint[];
  airflowData: ChartDataPoint[];
  anomalyStatus: AnomalyStatus;
  anomalyMessage: string;
  sslReconstructionError: number;
}

export const DashboardMockup: React.FC<DashboardMockupProps> = ({
  anomalyStatus,
  anomalyMessage,
}) => {
  const isAnomaly = anomalyStatus === 'Anomaly Detected';

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold">Real-Time Monitoring</h2>

      <div
        className={`mt-4 p-4 rounded ${
          isAnomaly ? 'bg-red-200' : 'bg-green-200'
        }`}
      >
        {isAnomaly ? 'ANOMALY DETECTED' : 'SYSTEM NORMAL'}
      </div>

      {isAnomaly && (
        <p className="mt-2 text-red-700 font-semibold">
          {anomalyMessage}
        </p>
      )}
    </div>
  );
};
