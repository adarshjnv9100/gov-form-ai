import React from 'react';
import { FormSubmission } from '../../types';
import { CheckCircle2, Clock, XCircle, FileText, Eye } from 'lucide-react';
import { Button } from '../ui/Button';

interface HistoryTimelineProps {
  submissions: FormSubmission[];
  onSelectSubmission: (submission: FormSubmission) => void;
}

export const HistoryTimeline: React.FC<HistoryTimelineProps> = ({
  submissions,
  onSelectSubmission,
}) => {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5" /> Completed
          </span>
        );
      case 'PROCESSING':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-bold text-blue-700 bg-blue-100 px-2.5 py-0.5 rounded-full border border-blue-200 animate-pulse">
            <Clock className="w-3.5 h-3.5" /> AI Processing
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-700 bg-rose-100 px-2.5 py-0.5 rounded-full border border-rose-200">
            <XCircle className="w-3.5 h-3.5" /> Rejected
          </span>
        );
    }
  };

  return (
    <div className="relative border-l-2 border-slate-200 ml-4 pl-6 space-y-8 py-2">
      {submissions.map((sub) => (
        <div key={sub.id} className="relative group">
          {/* Dot marker */}
          <div className="absolute -left-[31px] top-1.5 w-4 h-4 rounded-full bg-white border-2 border-blue-600 ring-4 ring-slate-100 group-hover:scale-125 transition-transform" />

          {/* Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 font-bold shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-3 flex-wrap">
                  <h4 className="text-sm font-bold text-slate-900">{sub.formTitle}</h4>
                  {getStatusBadge(sub.status)}
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Submission ID: <span className="font-mono text-slate-700 font-bold">{sub.submissionId ? sub.submissionId.slice(0, 8) : sub.id.slice(0, 8)}...</span> • Created {new Date(sub.createdAt).toLocaleDateString()}
                </p>
                <div className="flex items-center gap-4 text-xs text-slate-500 mt-2 font-medium">
                  <span>Confidence: <strong className="text-emerald-600">{sub.confidenceScore}%</strong></span>
                  <span>Code: <strong className="font-mono">{sub.formCode}</strong></span>
                </div>
              </div>
            </div>

            <Button
              onClick={() => onSelectSubmission(sub)}
              variant="outline"
              size="sm"
              leftIcon={<Eye className="w-3.5 h-3.5" />}
            >
              View Document
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
};
