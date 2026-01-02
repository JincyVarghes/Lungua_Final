export {};

import { useState, useRef, useCallback, useEffect } from "react";
import type { ConnectionStatus, BleServiceInfo } from "../types";

/**
 * 🔐 Tell TypeScript that navigator.bluetooth CAN exist (browser-only API)
 * This fixes Vercel / server-side build errors.
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

  // Track mounted state (prevents state update on unmounted component)
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
    if (isMounted.current) {
      setStatus("Disconnected");
      setConnectedName(null);
      setServices([]);
    }
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
    /**
     * 🛑 CRITICAL: Prevent execution during Vercel/server build
     */
    if (typeof window === "undefined" || !navigator.bluetooth) {
      console.warn("Web Bluetooth not available in this environment");
      if (isMounted.current) setStatus("Error");
      return;
    }

    try {
      if (isMounted.current) setStatus("Connecting");

      const filterService = Array.isArray(serviceUUID)
        ? serviceUUID[0]
        : serviceUUID;

      const options = {
        filters: [{ services: [filterService] }],
        optionalServices: ["battery_service", "device_information"],
        acceptAllDevices: false,
      };

      const device = await navigator.bluetooth.requestDevice(options);
      deviceRef.current = device;

      device.addEventListener("gattserverdisconnected", handleDisconnected);

      const server = await device.gatt.connect();
      serverRef.current = server;

      if (isMounted.current) {
        setStatus("Connected");
        setConnectedName(device.name || "Unknown Device");
      }

      const discoveredServices = await server.getPrimaryServices();
      const servicesInfo: BleServiceInfo[] = [];

      for (const service of discoveredServices) {
        try {
          const characteristics = await service.getCharacteristics();

          servicesInfo.push({
            uuid: service.uuid,
            characteristics: characteristics.map((char: any) => ({
              uuid: char.uuid,
            })),
          });

          const isTargetService = Array.isArray(serviceUUID)
            ? serviceUUID.includes(service.uuid)
            : service.uuid === serviceUUID;

          if (isTargetService) {
            let targetChar = null;

            if (characteristicUUID) {
              targetChar = await service.getCharacteristic(characteristicUUID);
            } else if (
              service.uuid === "heart_rate" ||
              service.uuid === "0000180d-0000-1000-8000-00805f9b34fb"
            ) {
              targetChar = await service.getCharacteristic(
                "heart_rate_measurement"
              );
            }

            if (targetChar && parseValue && onDataReceived) {
              await targetChar.startNotifications();
              targetChar.addEventListener(
                "characteristicvaluechanged",
                (event: any) => {
                  const val = parseValue(event.target.value);
                  if (isMounted.current) {
                    onDataReceived(val);
                  }
                }
              );
            }
          }
        } catch (e) {
          console.warn(
            `Could not access characteristics for service ${service.uuid}`,
            e
          );
          servicesInfo.push({ uuid: service.uuid, characteristics: [] });
        }
      }

      if (isMounted.current) setServices(servicesInfo);
    } catch (error) {
      console.error(`Bluetooth operation failed for ${deviceName}:`, error);
      if (isMounted.current) {
        setStatus("Error");
        setTimeout(() => {
          if (isMounted.current) setStatus("Disconnected");
        }, 3000);
      }
    }
  }, [
    serviceUUID,
    characteristicUUID,
    parseValue,
    onDataReceived,
    deviceName,
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
