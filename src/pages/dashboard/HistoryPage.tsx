import React, { useState, useEffect } from 'react';
import { HistoryTimeline } from '../../components/document/HistoryTimeline';
import { useFormWorkflow } from '../../context/FormWorkflowContext';
import { PDFViewerModal } from '../../components/document/PDFViewerModal';
import { FormSubmission } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { FileText } from 'lucide-react';

export const HistoryPage: React.FC = () => {
  const { user } = useAuth();
  const [userSubmissions, setUserSubmissions] = useState<FormSubmission[]>([]);
  const [activePdf, setActivePdf] = useState<{ title: string; url?: string; submissionId?: string } | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchHistory = async () => {
    setIsLoading(true);
    if (!user?.id) {
      setUserSubmissions([]);
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('submissions')
        .select('*')
        .eq('user_id', user.id) // Filter strictly by authenticated user ID
        .order('created_at', { ascending: false });

      if (!error && data) {
        const mapped: FormSubmission[] = data.map((s) => ({
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
        setUserSubmissions([]);
      }
    } catch {
      setUserSubmissions([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();

    window.addEventListener('submission_updated', fetchHistory);

    const channel = supabase
      .channel('public:submissions:history')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'submissions', filter: `user_id=eq.${user?.id}` },
        () => {
          fetchHistory();
        }
      )
      .subscribe();

    return () => {
      window.removeEventListener('submission_updated', fetchHistory);
      supabase.removeChannel(channel);
    };
  }, [user]);

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div className="border-b border-slate-200 pb-4">
        <h1 className="text-2xl font-extrabold text-slate-900">Submission Audit History</h1>
        <p className="text-xs text-slate-500 mt-1">
          Independent submission records queried directly from Supabase submissions table by user_id.
        </p>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-xs font-semibold text-slate-400">
          Loading audit history...
        </div>
      ) : userSubmissions.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 p-8 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
            <FileText className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-800">No Submissions Found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            You haven't completed any form submissions yet. Click 'Create New Form' to get started.
          </p>
        </div>
      ) : (
        <HistoryTimeline
          submissions={userSubmissions}
          onSelectSubmission={(sub: FormSubmission) =>
            setActivePdf({ title: sub.formTitle, url: sub.pdfUrl, submissionId: sub.submissionId || sub.id })
          }
        />
      )}

      <PDFViewerModal
        isOpen={!!activePdf}
        onClose={() => setActivePdf(null)}
        title={activePdf?.title}
        pdfUrl={activePdf?.url}
        submissionId={activePdf?.submissionId}
      />
    </div>
  );
};
