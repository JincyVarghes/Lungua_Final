import { useState, useRef, useCallback, useEffect } from 'react';
import type { ConnectionStatus, BleServiceInfo } from '../types';

interface UseBleDeviceOptions {
  deviceName: string;
  serviceUUID: string | string[]; // Primary service to filter by
  characteristicUUID?: string; // Characteristic to listen to
  parseValue?: (value: DataView) => number; // Function to parse the incoming value
  onDataReceived?: (value: number) => void; // Callback when data is received
}

export const useBleDevice = ({ 
  deviceName, 
  serviceUUID, 
  characteristicUUID, 
  parseValue, 
  onDataReceived 
}: UseBleDeviceOptions) => {
  const [status, setStatus] = useState<ConnectionStatus>('Disconnected');
  const [connectedName, setConnectedName] = useState<string | null>(null);
  const [services, setServices] = useState<BleServiceInfo[]>([]);
  const deviceRef = useRef<any>(null);
  const serverRef = useRef<any>(null);

  // Clean up function to ensure we don't try to set state on unmounted components
  const isMounted = useRef(true);
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      if (deviceRef.current && deviceRef.current.gatt.connected) {
        deviceRef.current.gatt.disconnect();
      }
    };
  }, []);

  const handleDisconnected = useCallback(() => {
    if (isMounted.current) {
        setStatus('Disconnected');
        setConnectedName(null);
        setServices([]);
    }
    deviceRef.current = null;
    serverRef.current = null;
  }, []);

  const disconnect = useCallback(() => {
    if (deviceRef.current && deviceRef.current.gatt.connected) {
      deviceRef.current.gatt.disconnect();
    } else {
        // If already technically disconnected but state doesn't reflect it
        handleDisconnected();
    }
  }, [handleDisconnected]);

  const connect = useCallback(async () => {
    if (!navigator.bluetooth) {
      alert('Web Bluetooth API is not available in this browser!');
      if (isMounted.current) setStatus('Error');
      return;
    }

    try {
      if (isMounted.current) setStatus('Connecting');
      
      const filterService = Array.isArray(serviceUUID) ? serviceUUID[0] : serviceUUID;
      // We request battery_service and device_information as optional services commonly available
      const options = {
        filters: [{ services: [filterService] }],
        optionalServices: ['battery_service', 'device_information'], 
        acceptAllDevices: false,
      };

      const device = await navigator.bluetooth.requestDevice(options);
      deviceRef.current = device;
      
      device.addEventListener('gattserverdisconnected', handleDisconnected);

      const server = await device.gatt.connect();
      serverRef.current = server;

      if (isMounted.current) {
          setStatus('Connected');
          setConnectedName(device.name || 'Unknown Device');
      }
      
      // Discover services
      const discoveredServices = await server.getPrimaryServices();
      const servicesInfo: BleServiceInfo[] = [];
      
      for (const service of discoveredServices) {
        // Only try to get characteristics if we have access (sometimes restricted)
        try {
            const characteristics = await service.getCharacteristics();
            servicesInfo.push({
            uuid: service.uuid,
            characteristics: characteristics.map((char: any) => ({ uuid: char.uuid })),
            });

            // Setup notification if this is the target service/characteristic
            const isTargetService = Array.isArray(serviceUUID) ? serviceUUID.includes(service.uuid) : service.uuid === serviceUUID;
            
            if (isTargetService) {
                let targetChar = null;
                
                if (characteristicUUID) {
                    targetChar = await service.getCharacteristic(characteristicUUID);
                } else if (service.uuid === 'heart_rate' || service.uuid === '0000180d-0000-1000-8000-00805f9b34fb') {
                    // Standard HR UUID fallback
                    targetChar = await service.getCharacteristic('heart_rate_measurement');
                }

                if (targetChar && parseValue && onDataReceived) {
                    await targetChar.startNotifications();
                    targetChar.addEventListener('characteristicvaluechanged', (event: any) => {
                        const val = parseValue(event.target.value);
                        // Only trigger callback if we are still connected/mounted
                        if (isMounted.current) {
                            onDataReceived(val);
                        }
                    });
                }
            }
        } catch (e) {
            console.warn(`Could not access characteristics for service ${service.uuid}`, e);
            servicesInfo.push({ uuid: service.uuid, characteristics: [] });
        }
      }
      
      if (isMounted.current) setServices(servicesInfo);

    } catch (error) {
      console.error(`Bluetooth operation failed for ${deviceName}:`, error);
      if (isMounted.current) {
          setStatus('Error');
          // Reset after a delay so user can try again
          setTimeout(() => {
              if (isMounted.current && status === 'Error') setStatus('Disconnected');
          }, 3000);
      }
    }
  }, [serviceUUID, characteristicUUID, parseValue, onDataReceived, deviceName, handleDisconnected, status]);

  return {
    status,
    connectedName,
    services,
    connect,
    disconnect,
    device: deviceRef.current
  };
};
