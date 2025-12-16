import React from 'react';
import { UserIcon, CalendarIcon, HeartIcon, PhoneIcon } from '../components/IconComponents';

const InfoCard: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <div className="bg-dark-surface p-6 rounded-lg shadow-md border border-dark-border">
        {children}
    </div>
);

const InfoRow: React.FC<{ icon: React.ReactNode, label: string, value: string }> = ({ icon, label, value }) => (
    <div className="flex items-start py-3">
        <div className="flex-shrink-0 h-6 w-6 text-brand-blue">{icon}</div>
        <div className="ml-4 flex-1">
            <p className="text-sm font-medium text-dark-text-secondary">{label}</p>
            <p className="mt-1 text-md text-dark-text-primary">{value}</p>
        </div>
    </div>
);

export const UserProfilePage: React.FC = () => {
    const userData = {
        name: 'Alex Doe',
        age: 34,
        gender: 'Male',
        medicalHistory: 'Diagnosed with moderate persistent asthma in 2010. No other known chronic conditions.',
        emergencyContact: {
            name: 'Jane Doe (Spouse)',
            phone: '+1 (555) 123-4567'
        }
    };

    return (
        <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-center text-dark-text-primary mb-12">User Profile</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Personal Information Card */}
                <InfoCard>
                    <h3 className="text-xl font-bold text-dark-text-primary mb-4 border-b border-dark-border pb-3">Personal Information</h3>
                    <div className="divide-y divide-dark-border">
                        <InfoRow icon={<UserIcon />} label="Full Name" value={userData.name} />
                        <InfoRow icon={<CalendarIcon />} label="Age" value={`${userData.age} years old`} />
                        <InfoRow icon={<UserIcon />} label="Gender" value={userData.gender} />
                    </div>
                </InfoCard>

                {/* Medical & Emergency Card */}
                <InfoCard>
                     <h3 className="text-xl font-bold text-dark-text-primary mb-4 border-b border-dark-border pb-3">Medical & Emergency</h3>
                     <div className="divide-y divide-dark-border">
                        <InfoRow icon={<HeartIcon />} label="Relevant Medical History" value={userData.medicalHistory} />
                        <InfoRow icon={<PhoneIcon />} label="Emergency Contact" value={`${userData.emergencyContact.name} - ${userData.emergencyContact.phone}`} />
                    </div>
                </InfoCard>
            </div>
        </div>
    );
};
