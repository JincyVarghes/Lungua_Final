import React, { useState, useEffect } from 'react';
import { UserIcon, MailIcon, PhoneIcon, BellIcon, MapPinIcon, EditIcon } from '../components/IconComponents';
import type { CaregiverData } from '../types';

interface CaregiverPageProps {
    isLocationSharingEnabled: boolean;
    setIsLocationSharingEnabled: (enabled: boolean) => void;
    caregiverData: CaregiverData;
    setCaregiverData: (data: CaregiverData) => void;
}

const InfoCard: React.FC<{ children: React.ReactNode, title: string, action?: React.ReactNode }> = ({ children, title, action }) => (
    <div className="bg-dark-surface p-6 rounded-lg shadow-md border border-dark-border">
         <div className="flex justify-between items-center mb-4 border-b border-dark-border pb-3">
            <h3 className="text-xl font-bold text-dark-text-primary">{title}</h3>
            {action}
        </div>
        {children}
    </div>
);

const InfoRow: React.FC<{ icon: React.ReactNode, label: string, value: string | React.ReactNode }> = ({ icon, label, value }) => (
    <div className="flex items-start py-3">
        <div className="flex-shrink-0 h-6 w-6 text-brand-cyan">{icon}</div>
        <div className="ml-4 flex-1">
            <p className="text-sm font-medium text-dark-text-secondary">{label}</p>
            <div className="mt-1 text-md text-dark-text-primary">{value}</div>
        </div>
    </div>
);

const FormRow: React.FC<{ icon: React.ReactNode, label: string, name: string, value: string, onChange: (e: React.ChangeEvent<HTMLInputElement>) => void, type?: string, required?: boolean }> = 
    ({ icon, label, name, value, onChange, type = 'text', required = false }) => (
    <div className="flex items-center py-2">
        <div className="flex-shrink-0 h-6 w-6 text-brand-cyan">{icon}</div>
        <div className="ml-4 flex-1">
            <label htmlFor={name} className="block text-sm font-medium text-dark-text-secondary">{label}</label>
            <input
                id={name}
                name={name}
                type={type}
                required={required}
                value={value}
                onChange={onChange}
                className="mt-1 bg-dark-surface-light focus:ring-brand-blue focus:border-brand-blue block w-full pl-3 pr-3 py-1.5 sm:text-sm border-dark-border rounded-md"
            />
        </div>
    </div>
);

const StatusPill: React.FC<{ enabled: boolean }> = ({ enabled }) => (
    <span className={`px-3 py-1 text-xs font-semibold rounded-full ${enabled ? 'bg-green-500/20 text-green-400' : 'bg-slate-600 text-slate-300'}`}>
        {enabled ? 'Enabled' : 'Disabled'}
    </span>
);

const ToggleSwitch: React.FC<{ enabled: boolean, setEnabled: (enabled: boolean) => void }> = ({ enabled, setEnabled }) => (
    <button
        type="button"
        className={`${
            enabled ? 'bg-brand-blue' : 'bg-dark-surface-light'
        } relative inline-flex items-center h-6 rounded-full w-11 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-dark-surface focus:ring-brand-blue`}
        role="switch"
        aria-checked={enabled}
        onClick={() => setEnabled(!enabled)}
    >
        <span className={`${
            enabled ? 'translate-x-6' : 'translate-x-1'
        } inline-block w-4 h-4 transform bg-white rounded-full transition-transform`} />
    </button>
);


export const CaregiverPage: React.FC<CaregiverPageProps> = ({ isLocationSharingEnabled, setIsLocationSharingEnabled, caregiverData, setCaregiverData }) => {
    
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState<CaregiverData>(caregiverData);

    useEffect(() => {
        setFormData(caregiverData);
    }, [caregiverData]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        setCaregiverData(formData);
        setIsEditing(false);
    };

    const handleCancel = () => {
        setFormData(caregiverData);
        setIsEditing(false);
    };

    const renderContactDetails = () => {
        if (isEditing) {
            return (
                <form onSubmit={handleSave}>
                    <div className="space-y-2 divide-y divide-dark-border">
                        <FormRow icon={<UserIcon />} label="Name" name="name" value={formData.name} onChange={handleInputChange} required />
                        <FormRow icon={<UserIcon />} label="Relationship to User" name="relationship" value={formData.relationship} onChange={handleInputChange} required />
                        <FormRow icon={<MailIcon />} label="Email Address" name="email" value={formData.email} onChange={handleInputChange} type="email" required />
                        <FormRow icon={<PhoneIcon />} label="Contact Phone" name="phone" value={formData.phone} onChange={handleInputChange} type="tel" required />
                    </div>
                    <div className="mt-6 flex justify-end space-x-4">
                        <button type="button" onClick={handleCancel} className="px-4 py-2 rounded-md text-sm font-medium transition-colors text-dark-text-secondary hover:bg-dark-surface-light">Cancel</button>
                        <button type="submit" className="px-4 py-2 rounded-md text-sm font-medium transition-colors bg-brand-blue text-slate-900 hover:bg-sky-400">Save Changes</button>
                    </div>
                </form>
            );
        }

        return (
            <div className="divide-y divide-dark-border">
                <InfoRow icon={<UserIcon />} label="Name" value={caregiverData.name} />
                <InfoRow icon={<UserIcon />} label="Relationship to User" value={caregiverData.relationship} />
                <InfoRow icon={<MailIcon />} label="Email Address" value={caregiverData.email} />
                <InfoRow icon={<PhoneIcon />} label="Contact Phone" value={caregiverData.phone} />
            </div>
        );
    };

    return (
        <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-center text-dark-text-primary mb-12">Caregiver Information</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-1 gap-8">
                {/* Contact Information Card */}
                <InfoCard 
                    title="Contact Details"
                    action={!isEditing ? (
                        <button onClick={() => setIsEditing(true)} className="flex items-center text-sm font-medium text-brand-blue hover:text-sky-300">
                            <EditIcon className="h-4 w-4 mr-2" />
                            Edit
                        </button>
                    ) : undefined}
                >
                    {renderContactDetails()}
                </InfoCard>

                {/* Notification Preferences Card */}
                <InfoCard title="Alert Preferences">
                     <div className="divide-y divide-dark-border">
                        <InfoRow icon={<BellIcon />} label="Push Notifications (Mobile App)" value={<StatusPill enabled={caregiverData.notifications.push} />} />
                        <InfoRow icon={<PhoneIcon />} label="SMS Alerts" value={<StatusPill enabled={caregiverData.notifications.sms} />} />
                        <InfoRow icon={<MailIcon />} label="Email Summaries" value={<StatusPill enabled={caregiverData.notifications.email} />} />
                    </div>
                </InfoCard>

                 {/* Emergency Protocols Card */}
                <InfoCard title="Emergency Protocols">
                     <div className="divide-y divide-dark-border">
                        <InfoRow 
                            icon={<MapPinIcon />} 
                            label="Critical Alert Location Sharing" 
                            value={<ToggleSwitch enabled={isLocationSharingEnabled} setEnabled={setIsLocationSharingEnabled} />} 
                        />
                        <div className="pt-2 pl-10">
                            <p className="text-xs text-dark-text-secondary">
                                If enabled, automatically sends the user's location via SMS to the caregiver 5 minutes after a critical heart rate alert is triggered, but only if the inhaler is not used during that time. Requires browser location permissions.
                            </p>
                        </div>
                    </div>
                </InfoCard>
            </div>
        </div>
    );
};