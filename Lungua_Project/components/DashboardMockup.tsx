import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { BrainIcon, CloudIcon } from './IconComponents';
import type { ChartDataPoint, AnomalyStatus } from '../types';

interface DashboardMockupProps {
  heartRateData: ChartDataPoint[];
  airflowData: ChartDataPoint[];
  anomalyStatus: AnomalyStatus;
  anomalyMessage: string;
  sslReconstructionError: number;

  // ✅ ADDED (safe, UI-neutral)
  onStartSimulation?: () => void;
  onStopSimulation?: () => void;
  onToggleSimulation?: () => void;
  isSimulating?: boolean;
}
