
import React from 'react';
import type { View } from '../types';
import { View as ViewEnum } from '../types';
import { DashboardIcon, ModelIcon, LogsIcon, SettingsIcon, LogoIcon, BoltIcon } from './Icons';

interface SidebarProps {
  currentView: View;
  onViewChange: (view: View) => void;
}

const NavItem: React.FC<{
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  onClick: () => void;
}> = ({ icon, label, isActive, onClick }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors duration-200 ${
      isActive
        ? 'bg-sky-500/20 text-sky-400'
        : 'text-slate-400 hover:bg-slate-700/50 hover:text-slate-200'
    }`}
  >
    {icon}
    <span className="font-medium">{label}</span>
  </button>
);

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onViewChange }) => {
  const navItems = [
    { view: ViewEnum.Dashboard, label: 'Dashboard', icon: <DashboardIcon className="w-6 h-6" /> },
    { view: ViewEnum.Models, label: 'Models', icon: <ModelIcon className="w-6 h-6" /> },
    { view: ViewEnum.Inference, label: 'Inference', icon: <BoltIcon className="w-6 h-6" /> },
    { view: ViewEnum.Logs, label: 'Logs', icon: <LogsIcon className="w-6 h-6" /> },
    { view: ViewEnum.Settings, label: 'Settings', icon: <SettingsIcon className="w-6 h-6" /> },
  ];

  return (
    <div className="w-64 bg-slate-800/50 p-4 flex flex-col h-full border-r border-slate-700/50">
      <div className="flex items-center space-x-3 mb-10 px-2">
        <LogoIcon className="w-10 h-10 text-sky-400" />
        <h1 className="text-xl font-bold text-slate-100">NexusCore</h1>
      </div>
      <nav className="flex flex-col space-y-2">
        {navItems.map((item) => (
          <NavItem
            key={item.view}
            icon={item.icon}
            label={item.label}
            isActive={currentView === item.view}
            onClick={() => onViewChange(item.view)}
          />
        ))}
      </nav>
      <div className="mt-auto text-center text-xs text-slate-500">
        <p>&copy; 2024 NexusCore. All rights reserved.</p>
        <p>Local LLM Server Interface</p>
      </div>
    </div>
  );
};
