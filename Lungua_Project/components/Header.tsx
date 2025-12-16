import React from 'react';
import { LungsIcon, LogoutIcon } from './IconComponents';
import type { Page } from '../types';

interface HeaderProps {
    currentPage: Page;
    onNavigate: (page: Page) => void;
    onLogout: () => void;
}

const NavLink: React.FC<{
    pageName: Page;
    currentPage: Page;
    onClick: (page: Page) => void;
    children: React.ReactNode;
}> = ({ pageName, currentPage, onClick, children }) => {
    const isActive = currentPage === pageName;
    return (
        <button
            onClick={() => onClick(pageName)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive
                    ? 'bg-brand-blue text-slate-900'
                    : 'text-dark-text-secondary hover:bg-dark-surface-light hover:text-dark-text-primary'
            }`}
            aria-current={isActive ? 'page' : undefined}
        >
            {children}
        </button>
    );
};


export const Header: React.FC<HeaderProps> = ({ currentPage, onNavigate, onLogout }) => {
  return (
    <header className="bg-dark-surface/80 backdrop-blur-sm text-white shadow-lg border-b border-dark-border sticky top-0 z-40">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          <div className="flex items-center space-x-8">
             <div className="flex items-center space-x-3">
                 <LungsIcon className="h-10 w-10 text-brand-blue" />
                 <h1 className="text-2xl font-bold tracking-tight text-dark-text-primary">Lungua</h1>
             </div>
             <nav className="hidden md:flex items-center space-x-4">
                <NavLink pageName="dashboard" currentPage={currentPage} onClick={onNavigate}>Dashboard</NavLink>
                <NavLink pageName="profile" currentPage={currentPage} onClick={onNavigate}>User Profile</NavLink>
                <NavLink pageName="caregiver" currentPage={currentPage} onClick={onNavigate}>Caregiver Info</NavLink>
             </nav>
          </div>
          <div className="flex items-center">
            <button
                onClick={onLogout}
                className="flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors text-red-400 hover:bg-red-900/50"
                aria-label="Logout"
            >
                <LogoutIcon className="h-5 w-5 mr-2" />
                Logout
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
