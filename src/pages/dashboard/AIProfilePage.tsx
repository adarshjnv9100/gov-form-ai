import React from 'react';
import { AIProfileCard } from '../../components/forms/AIProfileCard';
import { ShieldCheck, Lock } from 'lucide-react';

export const AIProfilePage: React.FC = () => {
  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="border-b border-slate-200 pb-4">
        <h1 className="text-2xl font-extrabold text-slate-900">Encrypted Citizen AI Profile</h1>
        <p className="text-xs text-slate-500 mt-1">
          Manage your verified personal identity vault. These fields are automatically populated into government PDF forms during step 4.
        </p>
      </div>

      <AIProfileCard />
    </div>
  );
};
