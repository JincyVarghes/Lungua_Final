import React from 'react';

export interface Feature {
  icon: React.ReactNode;
  title: string;
  description: string;
}

export interface ChartDataPoint {
  time: string;
  value: number;
}

export type ConnectionStatus =
  | 'Disconnected'
  | 'Connecting'
  | 'Connected'
  | 'Error';

export type AnomalyStatus = 'Normal' | 'Anomaly Detected';

export interface BleCharacteristicInfo {
  uuid: string;
}

export interface BleServiceInfo {
  uuid: string;
  characteristics: BleCharacteristicInfo[];
}

export interface AnomalyLogEntry {
  timestamp: string;
  type: string;
  message: string;
}

/**
 * ⚠️ IMPORTANT
 * Page values are LOWERCASE.
 * This fixes the Vercel error you were seeing.
 */
export type Page = 'dashboard' | 'profile' | 'caregiver';

export type LocationShareState =
  | 'idle'
  | 'pendingPermission'
  | 'countingDown'
  | 'permissionDenied'
  | 'sent'
  | 'cancelled'
  | 'cancelledInhalerUse';

export interface CaregiverData {
  name: string;
  relationship: string;
  email: string;
  phone: string;
  notifications: {
    push: boolean;
    sms: boolean;
    email: boolean;
  };
}
