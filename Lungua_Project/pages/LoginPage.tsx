
import React, { useState } from 'react';
import { LungsIcon, SpinnerIcon } from '../components/IconComponents';

interface LoginPageProps {
    onLogin: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        // Simulate Network Delay for realism
        setTimeout(() => {
            // CLIENT-SIDE AUTHENTICATION (Serverless Mode)
            if (email.toLowerCase() === 'user@lungua.com' && password === 'password123') {
                localStorage.setItem('lungua_token', 'demo_token_mobile_standalone');
                localStorage.setItem('lungua_user', JSON.stringify({ name: 'Alex Doe', email: 'user@lungua.com' }));
                onLogin();
            } else {
                setError('Invalid Credentials. Try: user@lungua.com / password123');
                setIsLoading(false);
            }
        }, 1200);
    };

    return (
        <div className="min-h-screen bg-dark-bg flex flex-col justify-center items-center p-4">
            <div className="w-full max-w-md">
                <div className="flex justify-center items-center mb-6">
                    <LungsIcon className="h-16 w-16 mr-4 text-brand-blue" />
                    <h1 className="text-5xl font-extrabold tracking-tight text-dark-text-primary">Lungua</h1>
                </div>
                <div className="bg-dark-surface border border-dark-border rounded-lg shadow-xl p-8">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-bold text-dark-text-primary">Mobile Access</h2>
                        <span className="px-2 py-1 bg-green-900/30 border border-green-500/30 text-green-400 text-[10px] font-bold uppercase rounded">
                            Serverless Mode
                        </span>
                    </div>

                    <p className="text-center text-dark-text-secondary mb-8">Sign in to access your smart inhaler dashboard.</p>
                    <form onSubmit={handleLogin} className="space-y-6">
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-dark-text-secondary">
                                Email Address
                            </label>
                            <div className="mt-1">
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    autoComplete="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="bg-dark-surface-light focus:ring-brand-blue focus:border-brand-blue block w-full pl-4 pr-4 py-2 sm:text-sm border-dark-border rounded-md text-white"
                                    placeholder="user@lungua.com"
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-dark-text-secondary">
                                Password
                            </label>
                            <div className="mt-1">
                                <input
                                    id="password"
                                    name="password"
                                    type="password"
                                    autoComplete="current-password"
                                    required
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="bg-dark-surface-light focus:ring-brand-blue focus:border-brand-blue block w-full pl-4 pr-4 py-2 sm:text-sm border-dark-border rounded-md text-white"
                                    placeholder="password123"
                                />
                            </div>
                        </div>

                        {error && (
                            <p className="text-xs text-red-400 text-center bg-red-900/50 p-3 rounded-md animate-pulse">{error}</p>
                        )}

                        <div>
                            <button
                                type="submit"
                                disabled={isLoading}
                                className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-slate-900 bg-brand-blue hover:bg-sky-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-dark-surface focus:ring-brand-blue transition-colors ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
                            >
                                {isLoading ? <SpinnerIcon className="h-5 w-5" /> : 'Sign In'}
                            </button>
                        </div>
                    </form>
                </div>
                 <p className="text-center text-xs text-dark-text-secondary mt-4">
                    <strong>Demo Credentials:</strong> user@lungua.com / password123
                </p>
            </div>
        </div>
    );
};
