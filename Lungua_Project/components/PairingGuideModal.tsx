import React from 'react';
import { SpinnerIcon } from './IconComponents';

interface PairingGuideModalProps {
    isOpen: boolean;
    deviceName: string;
    onClose: () => void;
}

export const PairingGuideModal: React.FC<PairingGuideModalProps> = ({ isOpen, deviceName, onClose }) => {
    if (!isOpen) {
        return null;
    }

    const isSmartwatch = deviceName === 'Smartwatch';

    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-75 z-50 flex justify-center items-center" 
            aria-modal="true"
            role="dialog"
        >
            <div className="bg-dark-surface border border-dark-border rounded-lg shadow-xl p-8 max-w-sm w-full mx-4 text-center">
                <h2 className="text-2xl font-bold text-dark-text-primary mb-4">Pairing Your {deviceName}</h2>
                <p className="text-dark-text-secondary mb-6">
                    {isSmartwatch 
                        ? "Looking for a Standard BLE Heart Rate Monitor (UUID 0x180D)." 
                        : "Looking for Lungua Smart Inhaler Module."}
                </p>

                <div className="text-left space-y-3 text-dark-text-primary mb-8 text-sm">
                    {isSmartwatch && (
                        <div className="bg-blue-900/30 p-3 rounded border border-blue-500/30 mb-4">
                            <p className="font-bold text-brand-blue mb-1">Hardware Support:</p>
                            <ul className="list-disc pl-4 space-y-1 text-xs text-slate-300">
                                <li><strong>Project ESP32:</strong> Must advertise UUID <code className="bg-slate-800 px-1 rounded">0x180D</code></li>
                                <li><strong>Commercial:</strong> Polar H10, Garmin, or Generic BLE Straps.</li>
                                <li className="text-red-300">Apple/Samsung Watches are NOT supported via Web Bluetooth.</li>
                            </ul>
                        </div>
                    )}
                    
                    <div className="flex items-center">
                        <span className="bg-brand-blue text-slate-900 rounded-full h-6 w-6 text-sm flex items-center justify-center mr-3 font-bold flex-shrink-0">1</span>
                        <span>Ensure device is ON and advertising.</span>
                    </div>
                    <div className="flex items-center">
                        <span className="bg-brand-blue text-slate-900 rounded-full h-6 w-6 text-sm flex items-center justify-center mr-3 font-bold flex-shrink-0">2</span>
                        <span>Select device from the browser popup.</span>
                    </div>
                </div>

                <div className="flex flex-col items-center justify-center">
                    <SpinnerIcon className="h-10 w-10 text-brand-blue mb-3" />
                    <p className="text-sm text-dark-text-secondary animate-pulse">Waiting for selection...</p>
                </div>
            </div>
        </div>
    );
};