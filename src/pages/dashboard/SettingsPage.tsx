import React, { useState } from 'react';
import { Key, Shield, Database, Cloud, Save, CheckCircle2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../context/ToastContext';

export const SettingsPage: React.FC = () => {
  const [supabaseUrl, setSupabaseUrl] = useState('https://official-gov-ai.supabase.co');
  const [cloudinaryPreset, setCloudinaryPreset] = useState('gov_encrypted_vault');
  const [kimiApiKey, setKimiApiKey] = useState('sk-kimi-v2.6-prod-••••••••••••••••');
  const { addToast } = useToast();

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    addToast('Settings Saved', 'Supabase and Kimi K2.6 API keys updated successfully.', 'success');
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div className="border-b border-slate-200 pb-4">
        <h1 className="text-2xl font-extrabold text-slate-900">System & Integration Settings</h1>
        <p className="text-xs text-slate-500 mt-1">
          Configure Supabase PostgreSQL database connection, Cloudinary storage bucket, and NVIDIA / Kimi AI endpoints.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Supabase Settings */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-3 text-slate-900 border-b border-slate-100 pb-3">
            <Database className="w-5 h-5 text-blue-600" />
            <h3 className="text-sm font-bold">Supabase PostgreSQL & Realtime</h3>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Supabase Project URL</label>
            <input
              type="text"
              value={supabaseUrl}
              onChange={(e) => setSupabaseUrl(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Cloudinary Settings */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-3 text-slate-900 border-b border-slate-100 pb-3">
            <Cloud className="w-5 h-5 text-teal-600" />
            <h3 className="text-sm font-bold">Cloudinary Storage Preset</h3>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Upload Preset Name</label>
            <input
              type="text"
              value={cloudinaryPreset}
              onChange={(e) => setCloudinaryPreset(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Kimi K2.6 API Key Settings */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-3 text-slate-900 border-b border-slate-100 pb-3">
            <Key className="w-5 h-5 text-indigo-600" />
            <h3 className="text-sm font-bold">Moonshot AI Kimi K2.6 Vision Model API Key</h3>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Secret Key</label>
            <input
              type="password"
              value={kimiApiKey}
              onChange={(e) => setKimiApiKey(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <Button type="submit" variant="primary" leftIcon={<Save className="w-4 h-4" />}>
          Save Settings & Re-authenticate
        </Button>
      </form>
    </div>
  );
};
