import React, { useState } from 'react';
import { Search, Shield, ChevronDown } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Link } from 'react-router-dom';

export const TopNav: React.FC = () => {
  const { user, profile } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');

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
          <span>Gemini OCR Connected</span>
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
