import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Edit3,
  Save,
  FileCheck,
  ChevronDown,
  ChevronRight,
  ShieldCheck,
  Info,
} from 'lucide-react';
import { ExtractedField } from '../../types';
import { Button } from '../ui/Button';
import { useToast } from '../../context/ToastContext';

interface ExtractedFieldsTableProps {
  fields: ExtractedField[];
  onSaveField: (id: string, newValue: string) => void;
  onConfirmAll: () => void;
}

export const ExtractedFieldsTable: React.FC<ExtractedFieldsTableProps> = ({
  fields,
  onSaveField,
  onConfirmAll,
}) => {
  const { addToast } = useToast();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [openSections, setOpenSections] = useState<{ auto: boolean; review: boolean; missing: boolean }>({
    auto: true,
    review: true,
    missing: true,
  });

  // Calculate Field States & Completion Metrics
  const autoFilledFields = fields.filter((f) => f.value && f.value.trim() !== '' && f.confidence >= 85);
  const needsReviewFields = fields.filter((f) => f.value && f.value.trim() !== '' && f.confidence < 85);
  const missingFields = fields.filter((f) => !f.value || f.value.trim() === '');

  const totalCount = fields.length || 18;
  const autoCount = autoFilledFields.length;
  const manualInputCount = needsReviewFields.length + missingFields.length;

  const handleStartEdit = (field: ExtractedField) => {
    setEditingId(field.id);
    setEditValue(field.value);
  };

  const handleSaveEdit = (id: string) => {
    onSaveField(id, editValue);
    setEditingId(null);
    addToast('Field Updated', 'Extracted value updated.', 'success');
  };

  const handleValidateAndGenerate = () => {
    const uncompleted = fields.filter((f) => !f.value || f.value.trim() === '');

    if (uncompleted.length > 0) {
      addToast(
        'Required Fields Missing',
        'Please complete all required fields before generating the PDF.',
        'error'
      );
      setOpenSections({ auto: true, review: true, missing: true });
      return;
    }

    onConfirmAll();
  };

  const renderFieldRow = (field: ExtractedField, state: 'AUTO' | 'REVIEW' | 'MISSING') => {
    const isEditing = editingId === field.id;

    return (
      <motion.div
        key={field.id}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        className={`p-4 rounded-2xl border transition-all ${
          state === 'MISSING'
            ? 'bg-rose-50/60 border-rose-300 ring-1 ring-rose-400/50'
            : state === 'REVIEW'
            ? 'bg-amber-50/60 border-amber-300'
            : 'bg-slate-50/80 border-slate-200 hover:border-slate-300'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Label & Status Badge */}
          <div className="space-y-1 max-w-sm">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-800">{field.label}</span>
              {state === 'MISSING' && (
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-600 text-white uppercase tracking-wider">
                  Required
                </span>
              )}
              {state === 'REVIEW' && (
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500 text-white uppercase tracking-wider">
                  Needs Review
                </span>
              )}
              {state === 'AUTO' && (
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  {field.confidence}% Confidence
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 font-mono">Field Key: {field.key}</p>
          </div>

          {/* Value Box / Editable Input */}
          <div className="flex items-center gap-3 flex-1 sm:justify-end">
            {isEditing || state === 'MISSING' ? (
              <div className="flex items-center gap-2 w-full sm:max-w-md">
                <input
                  type="text"
                  value={isEditing ? editValue : field.value}
                  onChange={(e) => {
                    if (isEditing) setEditValue(e.target.value);
                    else onSaveField(field.id, e.target.value);
                  }}
                  placeholder={`Enter ${field.label}...`}
                  className={`w-full px-3 py-2 bg-white border rounded-xl text-xs font-mono font-semibold focus:outline-none focus:ring-2 ${
                    state === 'MISSING'
                      ? 'border-rose-400 focus:ring-rose-500 text-rose-900 placeholder:text-rose-400'
                      : 'border-slate-300 focus:ring-blue-500 text-slate-900'
                  }`}
                />
                {isEditing && (
                  <Button onClick={() => handleSaveEdit(field.id)} size="sm" variant="primary">
                    <Save className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-slate-900 bg-white px-3 py-2 rounded-xl border border-slate-200 min-w-[180px] text-right truncate">
                  {field.value}
                </span>
                <button
                  onClick={() => handleStartEdit(field)}
                  className="p-2 text-slate-400 hover:text-blue-600 hover:bg-slate-200 rounded-lg transition-colors"
                  title="Edit Field"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="space-y-6">
      {/* 10. Completion Indicator Banner */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-blue-950 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border border-slate-800 shadow-md">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-teal-400" />
            <h3 className="text-base font-extrabold">Form Auto-Fill Readiness Matrix</h3>
          </div>
          <p className="text-xs text-slate-300 font-mono">
            {autoCount} / {totalCount} fields auto-filled • {manualInputCount} fields require manual input
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-bold font-mono">
          <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 rounded-full border border-emerald-500/30">
            🟢 {autoCount} Auto
          </span>
          <span className="px-3 py-1 bg-amber-500/20 text-amber-300 rounded-full border border-amber-500/30">
            🟡 {needsReviewFields.length} Review
          </span>
          <span className="px-3 py-1 bg-rose-500/20 text-rose-300 rounded-full border border-rose-500/30">
            🔴 {missingFields.length} Missing
          </span>
        </div>
      </div>

      {/* 11. Visually Grouped Sections */}
      <div className="space-y-4">
        {/* Section 1: 🔴 Manual Entry Required (Missing Fields) */}
        {missingFields.length > 0 && (
          <div className="space-y-3">
            <button
              onClick={() => setOpenSections((prev) => ({ ...prev, missing: !prev.missing }))}
              className="w-full flex items-center justify-between p-3 bg-rose-100/80 rounded-xl border border-rose-300 text-rose-900 text-xs font-extrabold uppercase tracking-wider hover:bg-rose-100"
            >
              <span className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600" /> ✎ Manual Entry Required ({missingFields.length})
              </span>
              {openSections.missing ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>

            {openSections.missing && (
              <div className="space-y-2 pl-2 border-l-2 border-rose-300">
                {missingFields.map((field) => renderFieldRow(field, 'MISSING'))}
              </div>
            )}
          </div>
        )}

        {/* Section 2: 🟡 Needs Review (Low Confidence Fields) */}
        {needsReviewFields.length > 0 && (
          <div className="space-y-3">
            <button
              onClick={() => setOpenSections((prev) => ({ ...prev, review: !prev.review }))}
              className="w-full flex items-center justify-between p-3 bg-amber-100/80 rounded-xl border border-amber-300 text-amber-900 text-xs font-extrabold uppercase tracking-wider hover:bg-amber-100"
            >
              <span className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" /> ⚠ Needs Review ({needsReviewFields.length})
              </span>
              {openSections.review ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>

            {openSections.review && (
              <div className="space-y-2 pl-2 border-l-2 border-amber-300">
                {needsReviewFields.map((field) => renderFieldRow(field, 'REVIEW'))}
              </div>
            )}
          </div>
        )}

        {/* Section 3: 🟢 Auto-filled (High Confidence Fields) */}
        {autoFilledFields.length > 0 && (
          <div className="space-y-3">
            <button
              onClick={() => setOpenSections((prev) => ({ ...prev, auto: !prev.auto }))}
              className="w-full flex items-center justify-between p-3 bg-emerald-100/80 rounded-xl border border-emerald-300 text-emerald-900 text-xs font-extrabold uppercase tracking-wider hover:bg-emerald-100"
            >
              <span className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" /> ✓ Auto-filled ({autoFilledFields.length})
              </span>
              {openSections.auto ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>

            {openSections.auto && (
              <div className="space-y-2 pl-2 border-l-2 border-emerald-300">
                {autoFilledFields.map((field) => renderFieldRow(field, 'AUTO'))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Action Footer */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-200">
        <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
          <Info className="w-4 h-4 text-blue-600" /> All 18 required fields will be compiled into the official government PDF form.
        </div>

        <Button
          onClick={handleValidateAndGenerate}
          variant="teal"
          size="lg"
          rightIcon={<FileCheck className="w-5 h-5" />}
        >
          Confirm & Generate PDF
        </Button>
      </div>
    </div>
  );
};
