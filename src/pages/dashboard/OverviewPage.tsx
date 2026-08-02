import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FileText,
  CheckCircle2,
  Clock,
  UserCheck,
  FilePlus,
  ArrowRight,
  ShieldCheck,
  Eye,
  FolderOpen,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useFormWorkflow } from '../../context/FormWorkflowContext';
import { GlassCard } from '../../components/ui/GlassCard';
import { Button } from '../../components/ui/Button';
import { PDFViewerModal } from '../../components/document/PDFViewerModal';
import { supabase } from '../../lib/supabase';
import { FormSubmission } from '../../types';
import { VoiceEvents } from '../../services/VoiceEvents';

export const OverviewPage: React.FC = () => {
  const { profile, user } = useAuth();
  const { startNewSubmission } = useFormWorkflow();
  const navigate = useNavigate();

  const [selectedSubmissionPdf, setSelectedSubmissionPdf] = useState<{ title: string; pdfUrl?: string } | null>(null);
  const [userSubmissions, setUserSubmissions] = useState<FormSubmission[]>([]);
  const [dbDocCount, setDbDocCount] = useState<number>(0);
  const [completedCount, setCompletedCount] = useState<number>(0);
  const [processingCount, setProcessingCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Strictly query Supabase for logged-in user's records (user_id = authenticated user ID)
  useEffect(() => {
    VoiceEvents.announceDashboard();
    let isSubscribed = true;

    const fetchUserData = async () => {
      setIsLoading(true);
      if (!user?.id) {
        if (isSubscribed) {
          setDbDocCount(0);
          setCompletedCount(0);
          setProcessingCount(0);
          setUserSubmissions([]);
          setIsLoading(false);
        }
        return;
      }

      try {
        // 1. Uploaded Documents count for logged-in user only
        const { count: docCount } = await supabase
          .from('documents')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id);

        // 2. Form Submissions for logged-in user only (ordered by created_at DESC)
        const { data: subData } = await supabase
          .from('submissions')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (isSubscribed) {
          setDbDocCount(docCount || 0);

          if (subData && subData.length > 0) {
            const completed = subData.filter((s) => s.status === 'COMPLETED').length;
            const processing = subData.filter((s) => s.status === 'PROCESSING' || s.status === 'DRAFT').length;

            setCompletedCount(completed);
            setProcessingCount(processing);

            const mapped: FormSubmission[] = subData.map((s) => ({
              id: s.id,
              submissionId: s.id,
              formTitle: s.form_title,
              formCode: s.form_code || 'GOV-2026',
              createdAt: s.created_at,
              status: s.status as any,
              extractedFields: s.extracted_fields || [],
              pdfUrl: s.pdf_url,
              supportingFilesCount: s.supporting_files_count || 0,
              confidenceScore: s.confidence_score || 0,
            }));
            setUserSubmissions(mapped);
          } else {
            setCompletedCount(0);
            setProcessingCount(0);
            setUserSubmissions([]);
          }
        }
      } catch (err) {
        console.warn('Dashboard fetch error:', err);
      } finally {
        if (isSubscribed) setIsLoading(false);
      }
    };

    fetchUserData();

    return () => {
      isSubscribed = false;
    };
  }, [user]);

  const handleStartNew = () => {
    startNewSubmission();
    navigate('/dashboard/new');
  };

  const displayName = profile.fullName ? profile.fullName.split(' ')[0] : user?.email?.split('@')[0] || 'Citizen';

  const stats = [
    {
      title: 'Uploaded Documents',
      count: `${dbDocCount}`,
      change: 'Logged-in User',
      icon: FolderOpen,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      title: 'Completed Forms',
      count: `${completedCount}`,
      change: '100% Verified',
      icon: CheckCircle2,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
    {
      title: 'Processing Forms',
      count: `${processingCount}`,
      change: 'Active Submissions',
      icon: Clock,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
    },
    {
      title: 'AI Profile Completion',
      count: `${profile.completionScore}%`,
      change: 'Master Profile',
      icon: UserCheck,
      color: 'text-teal-600',
      bg: 'bg-teal-50',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-blue-950 text-white rounded-3xl p-8 border border-slate-800 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="space-y-2 max-w-xl z-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-500/20 text-blue-300 rounded-full text-xs font-semibold border border-blue-400/30">
            <ShieldCheck className="w-3.5 h-3.5 text-teal-400" /> Multi-Tenant Row Level Security Active
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Welcome back, {displayName} 👋
          </h1>
          <p className="text-xs text-slate-300 leading-relaxed">
            Your dashboard statistics, uploaded documents, and form submissions are isolated strictly to your account.
          </p>
        </div>

        <div className="z-10 flex gap-3">
          <Button
            onClick={handleStartNew}
            variant="primary"
            size="lg"
            leftIcon={<FilePlus className="w-5 h-5" />}
          >
            Create New Form
          </Button>
        </div>
      </div>

      {/* Stats Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <GlassCard key={s.title} className="p-5 flex items-center gap-4">
              <div className={`w-12 h-12 rounded-2xl ${s.bg} ${s.color} flex items-center justify-center shrink-0`}>
                <Icon className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500">{s.title}</p>
                <h3 className="text-2xl font-extrabold text-slate-900">{s.count}</h3>
                <span className="text-[10px] font-semibold text-slate-400">{s.change}</span>
              </div>
            </GlassCard>
          );
        })}
      </div>

      {/* Recent Forms Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-4">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">Recent Form Submissions</h3>
            <p className="text-xs text-slate-500">Actual submissions belonging to user {user?.email || ''} (ordered by created_at DESC)</p>
          </div>
          <Link to="/dashboard/history" className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1">
            View All History <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase">
                <th className="py-3 px-5">Form Name</th>
                <th className="py-3 px-5">Submission UUID</th>
                <th className="py-3 px-5">Created Date</th>
                <th className="py-3 px-5 text-center">Status</th>
                <th className="py-3 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs font-medium">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-xs font-semibold text-slate-400">
                    Loading your submissions...
                  </td>
                </tr>
              ) : userSubmissions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-xs font-bold text-slate-500">
                    No submissions yet. Click 'Create New Form' to get started.
                  </td>
                </tr>
              ) : (
                userSubmissions.map((sub) => (
                  <tr key={sub.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-4 px-5 font-bold text-slate-900 flex items-center gap-3">
                      <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                        <FileText className="w-4 h-4" />
                      </div>
                      <span>{sub.formTitle}</span>
                    </td>
                    <td className="py-4 px-5 font-mono text-slate-600">{sub.submissionId ? sub.submissionId.slice(0, 8) : sub.id.slice(0, 8)}...</td>
                    <td className="py-4 px-5 text-slate-500">{new Date(sub.createdAt).toLocaleDateString()}</td>
                    <td className="py-4 px-5 text-center">
                      {sub.status === 'COMPLETED' ? (
                        <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-full font-bold text-[10px]">
                          Completed
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 bg-amber-100 text-amber-800 rounded-full font-bold text-[10px]">
                          Processing
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-5 text-right">
                      <button
                        onClick={() => setSelectedSubmissionPdf({ title: sub.formTitle, pdfUrl: sub.pdfUrl })}
                        className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 font-bold px-2.5 py-1 rounded-lg hover:bg-blue-50"
                      >
                        <Eye className="w-3.5 h-3.5" /> View PDF
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <PDFViewerModal
        isOpen={!!selectedSubmissionPdf}
        onClose={() => setSelectedSubmissionPdf(null)}
        title={selectedSubmissionPdf?.title}
        pdfUrl={selectedSubmissionPdf?.pdfUrl}
      />
    </div>
  );
};
