import React from 'react';
import { motion } from 'framer-motion';
import { Bot, Sparkles, UploadCloud, CheckCircle2, FileSpreadsheet } from 'lucide-react';
import { RecommendedDocumentItem, NemotronRecommendationResponse } from '../../services/nemotronService';
import { Button } from '../ui/Button';

interface AIAssistantPanelProps {
  submissionId: string;
  recommendationsData: NemotronRecommendationResponse | null;
  totalRequiredCount: number;
  completedCount: number;
  onSelectRecommendationToUpload: (rec: RecommendedDocumentItem) => void;
}

export const AIAssistantPanel: React.FC<AIAssistantPanelProps> = ({
  recommendationsData,
  totalRequiredCount,
  completedCount,
  onSelectRecommendationToUpload,
}) => {
  const completionPercentage =
    recommendationsData?.completion_percentage ?? Math.round((completedCount / totalRequiredCount) * 100);
  const recommendations = recommendationsData?.recommendations || [];

  if (completionPercentage === 100 || recommendations.length === 0 || completedCount === totalRequiredCount) {
    return (
      <div className="p-6 rounded-3xl bg-gradient-to-r from-emerald-950 via-slate-900 to-teal-950 text-white border border-emerald-800 shadow-md flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-400/30">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <div>
            <h4 className="text-base font-extrabold text-emerald-300">✅ Form Completed Successfully</h4>
            <p className="text-xs text-slate-300 mt-0.5">
              All {totalRequiredCount} required government form fields are verified and ready for PDF generation.
            </p>
          </div>
        </div>
        <span className="px-4 py-1.5 bg-emerald-500 text-slate-950 font-extrabold rounded-full text-xs shadow-glow">
          18 / 18 Complete
        </span>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-6">
      {/* Panel Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-teal-500 text-white flex items-center justify-center shadow-glow">
            <Bot className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-extrabold text-slate-900">🤖 AI Assistant (NVIDIA Nemotron)</h3>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-100 text-blue-800 border border-blue-200">
                Reasoning Active
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Upload recommended documents to complete remaining missing fields automatically.
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1 min-w-[200px]">
          <div className="flex justify-between text-xs font-bold">
            <span className="text-slate-600">Current Completion</span>
            <span className="text-blue-600 font-mono">
              {completedCount} / {totalRequiredCount} Fields ({completionPercentage}%)
            </span>
          </div>
          <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200">
            <div
              className="h-full bg-gradient-to-r from-blue-600 to-teal-400 rounded-full transition-all duration-500"
              style={{ width: `${completionPercentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* Recommendations Cards List */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-blue-600" /> Recommended Supporting Documents ({recommendations.length})
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {recommendations.map((rec, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between space-y-4 hover:border-blue-300 transition-colors"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-slate-900 flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4 text-blue-600" /> {rec.document}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">
                    Fills {rec.fills.length} field{rec.fills.length > 1 ? 's' : ''}
                  </span>
                </div>

                <div className="text-xs space-y-1.5">
                  <p className="font-semibold text-slate-700">
                    Can fill:{' '}
                    <span className="font-mono text-blue-700">
                      {rec.fills.map((f) => `✓ ${f.replace(/_/g, ' ')}`).join(' ')}
                    </span>
                  </p>
                  <p className="text-[11px] text-slate-500 leading-relaxed italic">{rec.reason}</p>
                </div>
              </div>

              <Button
                onClick={() => onSelectRecommendationToUpload(rec)}
                variant="teal"
                size="sm"
                leftIcon={<UploadCloud className="w-4 h-4" />}
              >
                Upload {rec.document}
              </Button>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};
