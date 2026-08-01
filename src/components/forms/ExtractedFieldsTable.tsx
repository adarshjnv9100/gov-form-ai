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
  Sparkles,
  User,
  HelpCircle,
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
  // Requirement 9: Console log rendered form state
  console.log('[Audit Log] Rendered Form:', JSON.stringify(fields, null, 2));

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

  const totalCount = fields.length || 26;
  const autoCount = autoFilledFields.length;

  const handleStartEdit = (field: ExtractedField) => {
    setEditingId(field.id);
    setEditValue(field.value);
  };

  const handleSaveEdit = (id: string) => {
    onSaveField(id, editValue);
    setEditingId(null);
    addToast('Field Updated', 'Field value saved to form state.', 'success');
  };

  const toggleSection = (section: 'auto' | 'review' | 'missing') => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const handleValidationBeforeGenerate = () => {
    if (missingFields.length > 0) {
      addToast(
        'Incomplete Form',
        'Please complete all required fields before generating the PDF.',
        'warning'
      );
      setOpenSections({ auto: true, review: true, missing: true });
      return;
    }
    onConfirmAll();
  };

  const renderSourceBadge = (field: ExtractedField) => {
    const src = field.source || (field.value ? 'OCR' : 'DEFAULT');
    if (field.isEdited) {
      return (
        <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-md bg-blue-100 text-blue-900 border border-blue-300 flex items-center gap-1">
          <Edit3 className="w-3 h-3 text-blue-600" /> Manually Edited
        </span>
      );
    }
    switch (src) {
      case 'OCR':
        return (
          <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-900 border border-emerald-300 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-emerald-600" /> OCR ({field.confidence}%)
          </span>
        );
      case 'PROFILE':
        return (
          <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-900 border border-indigo-300 flex items-center gap-1">
            <User className="w-3 h-3 text-indigo-600" /> Master Profile
          </span>
        );
      default:
        return (
          <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-300 flex items-center gap-1">
            <HelpCircle className="w-3 h-3 text-slate-400" /> Default / Empty
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Visual Header Summary Banner */}
      <div className="p-5 bg-gradient-to-r from-slate-900 to-blue-950 text-white rounded-3xl shadow-sm border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-teal-400" />
            <h3 className="text-sm font-extrabold uppercase tracking-wide">Field Source Verification & Priority</h3>
          </div>
          <p className="text-xs text-slate-300">
            OCR Extracted: <span className="font-bold text-emerald-400">{autoCount}</span> • Profile Fallback: <span className="font-bold text-indigo-300">{fields.filter((f) => f.source === 'PROFILE').length}</span> • Missing: <span className="font-bold text-rose-400">{missingFields.length}</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <span className="text-[10px] text-slate-400 block font-mono">Completion Score</span>
            <span className="text-lg font-black text-teal-300 font-mono">
              {Math.round(((totalCount - missingFields.length) / totalCount) * 100)}%
            </span>
          </div>

          <Button
            onClick={handleValidationBeforeGenerate}
            disabled={missingFields.length > 0}
            variant={missingFields.length === 0 ? 'teal' : 'outline'}
            leftIcon={<FileCheck className="w-4 h-4" />}
          >
            Generate Filled PDF
          </Button>
        </div>
      </div>

      {/* Validation Warning Alert if Empty Fields Exist */}
      {missingFields.length > 0 && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
            <span>
              <strong className="font-bold">Attention Required:</strong> {missingFields.length} field(s) require manual input. Complete empty fields below to proceed.
            </span>
          </div>
        </div>
      )}

      {/* SECTION 1: 🟢 AUTO-FILLED / OCR FIELDS */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <button
          onClick={() => toggleSection('auto')}
          className="w-full px-5 py-3.5 bg-emerald-50/60 border-b border-emerald-100 flex items-center justify-between text-left hover:bg-emerald-50 transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <div>
              <h4 className="text-xs font-extrabold text-emerald-900 uppercase tracking-wide">
                🟢 Auto-filled Fields ({autoFilledFields.length})
              </h4>
              <p className="text-[11px] text-emerald-700 font-medium">Extracted via Gemini OCR or Master Profile (≥ 85% Confidence)</p>
            </div>
          </div>
          {openSections.auto ? <ChevronDown className="w-4 h-4 text-emerald-700" /> : <ChevronRight className="w-4 h-4 text-emerald-700" />}
        </button>

        <AnimatePresence>
          {openSections.auto && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
              {autoFilledFields.length === 0 ? (
                <p className="p-4 text-xs text-slate-400 text-center italic">No high-confidence fields extracted yet.</p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {autoFilledFields.map((field) => (
                    <div key={field.id} className="p-4 hover:bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <div className="space-y-0.5 max-w-sm">
                        <span className="font-bold text-slate-800 flex items-center gap-2 flex-wrap">
                          {field.label}
                          {renderSourceBadge(field)}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono block">Key: {field.key}</span>
                      </div>

                      {editingId === field.id ? (
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                          <input
                            type="text"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="px-3 py-1.5 bg-white border border-blue-400 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-64"
                          />
                          <Button size="sm" onClick={() => handleSaveEdit(field.id)} leftIcon={<Save className="w-3.5 h-3.5" />}>
                            Save
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          <span className="font-mono font-semibold text-slate-900 bg-slate-100 px-3 py-1 rounded-lg border border-slate-200">
                            {field.value}
                          </span>
                          <button onClick={() => handleStartEdit(field)} className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors">
                            <Edit3 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* SECTION 2: 🟡 NEEDS REVIEW FIELDS */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <button
          onClick={() => toggleSection('review')}
          className="w-full px-5 py-3.5 bg-amber-50/60 border-b border-amber-100 flex items-center justify-between text-left hover:bg-amber-50 transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <div>
              <h4 className="text-xs font-extrabold text-amber-900 uppercase tracking-wide">
                🟡 Needs Review Fields ({needsReviewFields.length})
              </h4>
              <p className="text-[11px] text-amber-700 font-medium">Value exists but confidence is low (&lt; 85%)</p>
            </div>
          </div>
          {openSections.review ? <ChevronDown className="w-4 h-4 text-amber-700" /> : <ChevronRight className="w-4 h-4 text-amber-700" />}
        </button>

        <AnimatePresence>
          {openSections.review && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
              {needsReviewFields.length === 0 ? (
                <p className="p-4 text-xs text-slate-400 text-center italic">No low-confidence fields require review.</p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {needsReviewFields.map((field) => (
                    <div key={field.id} className="p-4 hover:bg-amber-50/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs bg-amber-50/10">
                      <div className="space-y-0.5 max-w-sm">
                        <span className="font-bold text-slate-800 flex items-center gap-2 flex-wrap">
                          {field.label}
                          {renderSourceBadge(field)}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono block">Key: {field.key}</span>
                      </div>

                      {editingId === field.id ? (
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                          <input
                            type="text"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="px-3 py-1.5 bg-white border border-amber-400 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-amber-500 w-full sm:w-64"
                          />
                          <Button size="sm" onClick={() => handleSaveEdit(field.id)} leftIcon={<Save className="w-3.5 h-3.5" />}>
                            Save
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          <span className="font-mono font-semibold text-amber-900 bg-amber-50 border border-amber-200 px-3 py-1 rounded-lg">
                            {field.value}
                          </span>
                          <button onClick={() => handleStartEdit(field)} className="p-1.5 text-slate-400 hover:text-amber-600 rounded-lg hover:bg-amber-100 transition-colors">
                            <Edit3 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* SECTION 3: 🔴 MISSING / MANUAL ENTRY REQUIRED FIELDS */}
      <div className="bg-white rounded-2xl border border-rose-200 shadow-xs overflow-hidden">
        <button
          onClick={() => toggleSection('missing')}
          className="w-full px-5 py-3.5 bg-rose-50/80 border-b border-rose-200 flex items-center justify-between text-left hover:bg-rose-50 transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-5 h-5 text-rose-600" />
            <div>
              <h4 className="text-xs font-extrabold text-rose-900 uppercase tracking-wide flex items-center gap-2">
                🔴 Missing / Manual Entry Required ({missingFields.length})
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-rose-200 text-rose-900 font-bold">
                  Required
                </span>
              </h4>
              <p className="text-[11px] text-rose-700 font-medium">No value extracted from uploaded documents or profile. Please complete input below.</p>
            </div>
          </div>
          {openSections.missing ? <ChevronDown className="w-4 h-4 text-rose-700" /> : <ChevronRight className="w-4 h-4 text-rose-700" />}
        </button>

        <AnimatePresence>
          {openSections.missing && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}>
              {missingFields.length === 0 ? (
                <p className="p-4 text-xs text-emerald-600 font-bold text-center bg-emerald-50">
                  🎉 All required fields have been successfully completed!
                </p>
              ) : (
                <div className="divide-y divide-rose-100">
                  {missingFields.map((field) => (
                    <div key={field.id} className="p-4 bg-rose-50/20 hover:bg-rose-50/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <div className="space-y-0.5 max-w-sm">
                        <span className="font-bold text-slate-800 flex items-center gap-2 flex-wrap">
                          {field.label}
                          {renderSourceBadge(field)}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono block">Key: {field.key}</span>
                      </div>

                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <input
                          type="text"
                          value={editingId === field.id ? editValue : field.value}
                          onChange={(e) => {
                            setEditingId(field.id);
                            setEditValue(e.target.value);
                          }}
                          onBlur={() => {
                            if (editingId === field.id && editValue.trim() !== '') {
                              handleSaveEdit(field.id);
                            }
                          }}
                          placeholder={`Enter ${field.label}...`}
                          className="px-3 py-2 bg-white border-2 border-rose-300 focus:border-blue-500 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 w-full sm:w-72 shadow-xs"
                        />
                        {editingId === field.id && editValue.trim() !== '' && (
                          <Button size="sm" onClick={() => handleSaveEdit(field.id)} leftIcon={<Save className="w-3.5 h-3.5" />}>
                            Save
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
