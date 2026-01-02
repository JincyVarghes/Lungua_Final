export {};

import { useState, useRef, useCallback, useEffect } from 'react';
import type { ConnectionStatus, BleServiceInfo } from '../types';

declare global {
  interface Navigator {
    bluetooth?: any;
  }
}

interface UseBleDeviceOptions {
  deviceName: string;
  serviceUUID: string | string[];
  characteristicUUID?: string;
  parseValue?: (value: DataView) => number;
  onDataReceived?: (value: number) => void;
}

export const useBleDevice = ({
  serviceUUID,
  characteristicUUID,
  parseValue,
  onDataReceived,
}: UseBleDeviceOptions) => {
  const [status, setStatus] = useState<ConnectionStatus>('Disconnected');
  const [services, setServices] = useState<BleServiceInfo[]>([]);
  const deviceRef = useRef<any>(null);

  const disconnect = useCallback(() => {
    if (deviceRef.current?.gatt?.connected) {
      deviceRef.current.gatt.disconnect();
    }
    setStatus('Disconnected');
  }, []);

  const connect = useCallback(async () => {
    if (typeof window === 'undefined' || !navigator.bluetooth) {
      setStatus('Error');
      return;
    }

    try {
      setStatus('Connecting');

      const device = await navigator.bluetooth.requestDevice({
        filters: [{ services: [Array.isArray(serviceUUID) ? serviceUUID[0] : serviceUUID] }],
      });

      deviceRef.current = device;
      const server = await device.gatt.connect();

      setStatus('Connected');

      const discoveredServices = await server.getPrimaryServices();
      setServices(
        discoveredServices.map((s) => ({
          uuid: s.uuid,
          characteristics: [],
        }))
      );
    } catch {
      setStatus('Error');
    }
  }, [serviceUUID]);

  return { status, services, connect, disconnect };
};
