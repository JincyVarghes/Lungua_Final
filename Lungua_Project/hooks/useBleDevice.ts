export {};

import { useState, useRef, useCallback, useEffect } from "react";
import type { ConnectionStatus, BleServiceInfo } from "../types";

/**
 * ✅ Safe Web Bluetooth declaration for Vercel / SSR
 */
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
  deviceName,
  serviceUUID,
  characteristicUUID,
  parseValue,
  onDataReceived,
}: UseBleDeviceOptions) => {
  const [status, setStatus] = useState<ConnectionStatus>("Disconnected");
  const [connectedName, setConnectedName] = useState<string | null>(null);
  const [services, setServices] = useState<BleServiceInfo[]>([]);

  const deviceRef = useRef<any>(null);
  const serverRef = useRef<any>(null);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      if (deviceRef.current?.gatt?.connected) {
        deviceRef.current.gatt.disconnect();
      }
    };
  }, []);

  const handleDisconnected = useCallback(() => {
    if (!isMounted.current) return;
    setStatus("Disconnected");
    setConnectedName(null);
    setServices([]);
    deviceRef.current = null;
    serverRef.current = null;
  }, []);

  const disconnect = useCallback(() => {
    if (deviceRef.current?.gatt?.connected) {
      deviceRef.current.gatt.disconnect();
    } else {
      handleDisconnected();
    }
  }, [handleDisconnected]);

  const connect = useCallback(async () => {
    // 🚫 Prevent execution during Vercel build
    if (typeof window === "undefined" || !navigator.bluetooth) {
      console.warn("Web Bluetooth not available");
      setStatus("Error");
      return;
    }

    try {
      setStatus("Connecting");

      const primaryService = Array.isArray(serviceUUID)
        ? serviceUUID[0]
        : serviceUUID;

      const device = await navigator.bluetooth.requestDevice({
        filters: [{ services: [primaryService] }],
        optionalServices: ["battery_service", "device_information"],
      });

      deviceRef.current = device;
      device.addEventListener("gattserverdisconnected", handleDisconnected);

      const server = await device.gatt.connect();
      serverRef.current = server;

      setStatus("Connected");
      setConnectedName(device.name || "Unknown Device");

      const discoveredServices = await server.getPrimaryServices();

      // ✅ FIXED: explicit typing to satisfy TypeScript
      const servicesInfo: BleServiceInfo[] = discoveredServices.map((s: any) => ({
        uuid: s.uuid,
        characteristics: [],
      }));

      setServices(servicesInfo);

      for (const service of discoveredServices) {
        const isTarget =
          Array.isArray(serviceUUID)
            ? serviceUUID.includes(service.uuid)
            : service.uuid === serviceUUID;

        if (!isTarget) continue;

        let characteristic = null;

        if (characteristicUUID) {
          characteristic = await service.getCharacteristic(characteristicUUID);
        } else if (
          service.uuid === "0000180d-0000-1000-8000-00805f9b34fb"
        ) {
          characteristic = await service.getCharacteristic(
            "heart_rate_measurement"
          );
        }

        if (characteristic && parseValue && onDataReceived) {
          await characteristic.startNotifications();
          characteristic.addEventListener(
            "characteristicvaluechanged",
            (event: any) => {
              const value = parseValue(event.target.value);
              if (isMounted.current) {
                onDataReceived(value);
              }
            }
          );
        }
      }
    } catch (err) {
      console.error("Bluetooth error:", err);
      setStatus("Error");
      setTimeout(() => setStatus("Disconnected"), 3000);
    }
  }, [
    serviceUUID,
    characteristicUUID,
    parseValue,
    onDataReceived,
    handleDisconnected,
  ]);

  return {
    status,
    connectedName,
    services,
    connect,
    disconnect,
    device: deviceRef.current,
  };
};
