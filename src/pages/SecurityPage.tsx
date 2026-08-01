import React from 'react';
import { Navbar } from '../components/layout/Navbar';
import { Footer } from '../components/layout/Footer';
import { ShieldCheck, Lock, Key, Server, EyeOff, FileText } from 'lucide-react';
import { GlassCard } from '../components/ui/GlassCard';

export const SecurityPage: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-[#faf8ff]">
      <Navbar />

      <main className="flex-1 py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-2 border border-emerald-200">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h1 className="text-4xl font-extrabold text-slate-900">Security & Enterprise Privacy Architecture</h1>
          <p className="text-base text-slate-600">
            We employ bank-grade 256-bit AES encryption, zero AI data retention, and isolated Supabase PostgreSQL schemas.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          <GlassCard className="space-y-3">
            <div className="flex items-center gap-3 text-blue-600">
              <Lock className="w-6 h-6" />
              <h3 className="text-lg font-bold text-slate-900">256-Bit AES Encryption at Rest</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              All uploaded government files and supporting citizen documents stored in Cloudinary and Supabase Storage are encrypted at rest with hardware security modules (HSM).
            </p>
          </GlassCard>

          <GlassCard className="space-y-3">
            <div className="flex items-center gap-3 text-teal-600">
              <EyeOff className="w-6 h-6" />
              <h3 className="text-lg font-bold text-slate-900">Zero AI Training & Data Retention</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Your sensitive personal identification data (PAN, Aadhaar, Passport) is processed in RAM during OCR extraction and never used to train third-party foundation models.
            </p>
          </GlassCard>

          <GlassCard className="space-y-3">
            <div className="flex items-center gap-3 text-indigo-600">
              <Server className="w-6 h-6" />
              <h3 className="text-lg font-bold text-slate-900">Supabase Row-Level Security (RLS)</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Database access is strictly controlled via Supabase Auth JWT tokens. No user can view or alter form submissions outside their authenticated session.
            </p>
          </GlassCard>

          <GlassCard className="space-y-3">
            <div className="flex items-center gap-3 text-emerald-600">
              <Key className="w-6 h-6" />
              <h3 className="text-lg font-bold text-slate-900">ISO 27001 & SOC 2 Compliance</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Our cloud infrastructure running on Vercel and Supabase complies with strict international data governance standards.
            </p>
          </GlassCard>
        </div>
      </main>

      <Footer />
    </div>
  );
};
