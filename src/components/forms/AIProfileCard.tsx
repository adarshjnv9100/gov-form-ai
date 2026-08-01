import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ShieldCheck, User, Calendar, MapPin, Phone, CreditCard, FileCheck, CheckCircle2, Edit3, Save } from 'lucide-react';
import { Button } from '../ui/Button';
import { useToast } from '../../context/ToastContext';

export const AIProfileCard: React.FC = () => {
  const { profile, updateProfile } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState(profile);
  const { addToast } = useToast();

  const handleSave = () => {
    updateProfile(formData);
    setIsEditing(false);
    addToast('Vault Profile Updated', 'Your encrypted credentials have been saved to Supabase.', 'success');
  };

  const fields = [
    { key: 'fullName', label: 'Full Legal Name', icon: User, value: formData.fullName },
    { key: 'dob', label: 'Date of Birth', icon: Calendar, value: formData.dob },
    { key: 'phone', label: 'Verified Phone Number', icon: Phone, value: formData.phone },
    { key: 'aadhaarNumber', label: 'Aadhaar Card Number', icon: CreditCard, value: formData.aadhaarNumber },
    { key: 'panNumber', label: 'PAN Card Identifier', icon: FileCheck, value: formData.panNumber },
    { key: 'passportNumber', label: 'Passport Number', icon: FileCheck, value: formData.passportNumber },
  ];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-100/80 text-blue-600 flex items-center justify-center border border-blue-200">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-slate-900">Verified Citizen AI Profile</h3>
              <span className="inline-flex items-center gap-1 text-xs font-semibold bg-emerald-100 text-emerald-700 px-2.5 py-0.5 rounded-full border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5" /> 100% Encrypted
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Auto-fills government forms using 256-bit AES encrypted vault data.
            </p>
          </div>
        </div>

        <div>
          {isEditing ? (
            <Button onClick={handleSave} variant="teal" leftIcon={<Save className="w-4 h-4" />}>
              Save Profile
            </Button>
          ) : (
            <Button onClick={() => setIsEditing(true)} variant="outline" leftIcon={<Edit3 className="w-4 h-4" />}>
              Edit Vault
            </Button>
          )}
        </div>
      </div>

      {/* Grid of Profile Fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {fields.map((f) => {
          const Icon = f.icon;
          return (
            <div key={f.key} className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
              <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold">
                <Icon className="w-4 h-4 text-blue-600" />
                <span>{f.label}</span>
              </div>
              {isEditing ? (
                <input
                  type="text"
                  value={(formData as any)[f.key]}
                  onChange={(e) => setFormData({ ...formData, [f.key]: e.target.value })}
                  className="w-full mt-1 px-3 py-1.5 bg-white border border-blue-400 rounded-lg text-xs font-semibold focus:outline-none ring-2 ring-blue-100"
                />
              ) : (
                <p className="text-sm font-bold text-slate-800 font-mono tracking-wide">{f.value}</p>
              )}
            </div>
          );
        })}
      </div>

      {/* Permanent Address Bar */}
      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
        <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold">
          <MapPin className="w-4 h-4 text-blue-600" />
          <span>Permanent Residence Address</span>
        </div>
        {isEditing ? (
          <textarea
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            className="w-full mt-1 px-3 py-1.5 bg-white border border-blue-400 rounded-lg text-xs font-semibold focus:outline-none ring-2 ring-blue-100"
            rows={2}
          />
        ) : (
          <p className="text-sm font-semibold text-slate-800">{formData.address}</p>
        )}
      </div>
    </div>
  );
};
