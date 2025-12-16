
import React from 'react';
import { SpinnerIcon } from './IconComponents';
import type { ConnectionStatus, BleServiceInfo } from '../types';

interface DeviceConnectionCardProps {
    deviceName: string;
    icon: React.ReactNode;
    status: ConnectionStatus;
    connectedDeviceName: string | null;
    services: BleServiceInfo[];
    onConnect: () => void;
    onDisconnect: () => void;
}

export const DeviceConnectionCard: React.FC<DeviceConnectionCardProps> = ({
    deviceName,
    icon,
    status,
    connectedDeviceName,
    services,
    onConnect,
    onDisconnect
}) => {
    const isConnected = status === 'Connected';
    const isConnecting = status === 'Connecting';

    return (
        <div className="bg-dark-surface p-6 rounded-xl border border-dark-border shadow-lg flex flex-col justify-between h-full transition-all hover:shadow-cyan-900/10">
            <div>
                <div className="flex justify-between items-start mb-4">
                    <div className="p-3 bg-dark-surface-light rounded-lg border border-dark-border">
                        {icon}
                    </div>
                    <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border ${
                        isConnected ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                        status === 'Error' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                        isConnecting ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' :
                        'bg-slate-700 text-slate-400 border-slate-600'
                    }`}>
                        {status}
                    </div>
                </div>

                <h3 className="text-xl font-bold text-dark-text-primary mb-1">{deviceName}</h3>
                
                {isConnected ? (
                    <div className="mb-4">
                        <p className="text-sm text-green-400 font-mono mb-2">✓ Paired: {connectedDeviceName}</p>
                        <div className="bg-dark-bg p-3 rounded border border-dark-border">
                             <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mb-1">Active Services</p>
                             <ul className="space-y-1">
                                {services.length > 0 ? services.map(s => (
                                    <li key={s.uuid} className="text-xs font-mono text-slate-300 truncate" title={s.uuid}>
                                        • {s.uuid.substring(0, 8)}...
                                    </li>
                                )) : <li className="text-xs text-slate-500 italic">No services enumerated</li>}
                             </ul>
                        </div>
                    </div>
                ) : (
                    <p className="text-sm text-dark-text-secondary mb-6">
                        {status === 'Error' 
                            ? "Connection failed. Please ensure the device is ON and not paired elsewhere."
                            : "Waiting for Bluetooth connection..."}
                    </p>
                )}
            </div>

            <button
                onClick={isConnected ? onDisconnect : onConnect}
                disabled={isConnecting}
                className={`w-full py-3 rounded-lg font-bold transition-all shadow-lg flex items-center justify-center ${
                    isConnected 
                        ? 'bg-dark-surface-light text-red-400 border border-red-900/30 hover:bg-red-900/20' 
                        : 'bg-brand-blue text-slate-900 hover:bg-sky-400 hover:scale-[1.02]'
                } ${isConnecting ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
                {isConnecting ? (
                    <>
                        <SpinnerIcon className="h-5 w-5 mr-2" />
                        Connecting...
                    </>
                ) : isConnected ? (
                    'Disconnect'
                ) : (
                    'Connect Device'
                )}
            </button>
        </div>
    );
};
