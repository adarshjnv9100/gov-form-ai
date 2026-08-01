import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  FilePlus,
  FolderOpen,
  UserCheck,
  History,
  Settings,
  LogOut,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

export const Sidebar: React.FC = () => {
  const { signOut, user, profile } = useAuth();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const handleLogout = () => {
    signOut();
    addToast('Signed Out', 'You have been safely logged out of your session.', 'info');
    navigate('/auth/signin');
  };

  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, exact: true },
    { label: 'New Form', path: '/dashboard/new', icon: FilePlus, highlight: true },
    { label: 'My Documents', path: '/dashboard/documents', icon: FolderOpen },
    { label: 'AI Profile', path: '/dashboard/profile', icon: UserCheck },
    { label: 'History', path: '/dashboard/history', icon: History },
    { label: 'Settings', path: '/dashboard/settings', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col h-screen sticky top-0 border-r border-slate-800 z-30">
      {/* Brand Header */}
      <div className="p-6 border-b border-slate-800 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-gov-600 flex items-center justify-center text-white shadow-md shadow-blue-500/30">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <div>
          <h2 className="font-bold text-white text-base tracking-tight leading-none">GovForm AI</h2>
          <span className="text-[10px] text-blue-400 font-semibold tracking-wider uppercase">Sovereign Vault</span>
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto">
        <p className="px-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">Navigation</p>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.exact}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-semibold'
                    : item.highlight
                    ? 'bg-blue-900/40 text-blue-300 hover:bg-blue-900/60 border border-blue-700/50'
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
                }`
              }
            >
              <Icon className="w-5 h-5" />
              <span>{item.label}</span>
              {item.highlight && (
                <span className="ml-auto flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-500"></span>
                </span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* AI Vault Profile Widget */}
      <div className="p-4 mx-3 mb-4 rounded-xl bg-slate-800/80 border border-slate-700/60">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-white flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-teal-400" /> Vault Completion
          </span>
          <span className="text-xs font-bold text-teal-400">{profile.completionScore}%</span>
        </div>
        <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-teal-400 rounded-full"
            style={{ width: `${profile.completionScore}%` }}
          />
        </div>
      </div>

      {/* User Footer / Logout */}
      <div className="p-4 border-t border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3 overflow-hidden">
          <img
            src={user?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=256'}
            alt="Avatar"
            className="w-9 h-9 rounded-full object-cover border border-slate-700"
          />
          <div className="truncate">
            <p className="text-xs font-semibold text-white truncate">{user?.name || 'Rahul Verma'}</p>
            <p className="text-[10px] text-slate-400 truncate">{user?.email || 'rahul@gov.ai'}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
          title="Logout"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
};
