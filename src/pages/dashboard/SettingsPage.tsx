import React, { useState } from 'react';
import { Key, Shield, Database, Cloud, Save, CheckCircle2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../context/ToastContext';

export const SettingsPage: React.FC = () => {
  const [supabaseUrl, setSupabaseUrl] = useState('https://official-gov-ai.supabase.co');
  const [cloudinaryPreset, setCloudinaryPreset] = useState('gov_encrypted_vault');
  const { addToast } = useToast();

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    addToast('Settings Saved', 'Settings updated successfully.', 'success');
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

        <Button type="submit" variant="primary" leftIcon={<Save className="w-4 h-4" />}>
          Save Settings
        </Button>
      </form>
    </div>
  );
};
