import React, { useState } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopNav } from './TopNav';
import { useAuth } from '../../context/AuthContext';
import { Menu, X, ShieldCheck, Loader2, Mic } from 'lucide-react';
import { VoiceAssistant } from '../VoiceAssistant';

export const DashboardLayout: React.FC = () => {
  const { isAuthenticated, loading } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [voiceOpen, setVoiceOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#faf8ff] flex flex-col items-center justify-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/30 animate-pulse">
          <ShieldCheck className="w-8 h-8" />
        </div>
        <div className="flex items-center gap-2 text-slate-700 text-xs font-semibold">
          <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
          <span>Verifying Supabase Vault Session...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth/signin" replace />;
  }

  return (
    <div className="min-h-screen bg-[#faf8ff] flex">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <Sidebar />
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
          <div className="relative z-10 w-64 bg-slate-900 h-full">
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
            <Sidebar />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <TopNav />
        {/* Mobile menu trigger */}
        <div className="lg:hidden p-4 bg-white border-b border-slate-200 flex items-center justify-between">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="p-2 text-slate-700 hover:bg-slate-100 rounded-lg"
          >
            <Menu className="w-6 h-6" />
          </button>
          <span className="font-bold text-sm text-slate-900">Government Form AI</span>
        </div>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto relative">
          <Outlet />

          {/* Floating Voice Assistant Trigger */}
          <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-3">
            {voiceOpen && (
              <VoiceAssistant onClose={() => setVoiceOpen(false)} className="w-[90vw] sm:w-[420px]" />
            )}

            {!voiceOpen && (
              <button
                type="button"
                onClick={() => setVoiceOpen(true)}
                className="flex items-center gap-2.5 px-4 py-3 bg-gradient-to-r from-blue-600 to-teal-600 hover:from-blue-700 hover:to-teal-700 text-white rounded-full shadow-2xl shadow-blue-600/40 hover:scale-105 active:scale-95 transition-all group font-bold text-xs border border-white/20"
              >
                <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center group-hover:rotate-12 transition-transform">
                  <Mic className="w-4 h-4 text-white" />
                </div>
                <span>AI Voice Assistant</span>
              </button>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};
