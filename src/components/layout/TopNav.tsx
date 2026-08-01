import React, { useState } from 'react';
import { Search, Bell, Shield, ChevronDown, CheckCircle, Clock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Link } from 'react-router-dom';

export const TopNav: React.FC = () => {
  const { user, profile } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const notifications = [
    { id: 1, title: 'Form ITR-V 2026 Processed', time: '10 mins ago', type: 'success' },
    { id: 2, title: 'Aadhaar Verified in Vault', time: '2 hours ago', type: 'info' },
    { id: 3, title: 'Supabase Realtime Sync Active', time: '1 day ago', type: 'info' },
  ];

  return (
    <header className="h-16 bg-white/80 backdrop-blur-md border-b border-slate-200/80 px-6 flex items-center justify-between sticky top-0 z-20">
      {/* Search Input */}
      <div className="relative w-72 md:w-96">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search forms, documents, Aadhaar, PAN..."
          className="w-full pl-10 pr-4 py-2 bg-slate-100/80 border border-slate-200/80 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
        />
      </div>

      {/* Action Icons & Profile */}
      <div className="flex items-center gap-4">
        {/* Security Shield Tag */}
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full border border-emerald-200 text-xs font-medium">
          <Shield className="w-3.5 h-3.5 text-emerald-600" />
          <span>Kimi K2.6 OCR Connected</span>
        </div>

        {/* Notifications Button */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors relative"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-blue-600 rounded-full ring-2 ring-white" />
          </button>

          {/* Notifications Dropdown */}
          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-200 p-4 z-50 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Notifications</h4>
                <span className="text-[10px] bg-blue-100 text-blue-700 font-semibold px-2 py-0.5 rounded-full">
                  3 New
                </span>
              </div>
              <div className="space-y-2.5">
                {notifications.map((n) => (
                  <div key={n.id} className="flex items-start gap-3 p-2.5 hover:bg-slate-50 rounded-xl transition-colors">
                    <CheckCircle className="w-4 h-4 text-emerald-500 mt-0.5" />
                    <div>
                      <p className="text-xs font-semibold text-slate-800">{n.title}</p>
                      <span className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3" /> {n.time}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* User Badge */}
        <Link to="/dashboard/profile" className="flex items-center gap-2.5 pl-2 border-l border-slate-200 hover:opacity-90">
          <img
            src={user?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=256'}
            alt="User avatar"
            className="w-8 h-8 rounded-full object-cover border border-slate-300"
          />
          <div className="hidden md:block text-left">
            <p className="text-xs font-bold text-slate-800 leading-tight">{profile.fullName}</p>
            <p className="text-[10px] text-slate-500">Verified Citizen</p>
          </div>
          <ChevronDown className="w-4 h-4 text-slate-400 hidden md:block" />
        </Link>
      </div>
    </header>
  );
};
