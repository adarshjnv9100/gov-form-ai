import React, { useState, useEffect } from 'react';
import { Search, Download, Trash2, Eye, FileText, CheckCircle2, RefreshCw, Filter } from 'lucide-react';
import { GlassCard } from '../../components/ui/GlassCard';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../context/ToastContext';
import { PDFViewerModal } from '../../components/document/PDFViewerModal';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

export interface DBDocumentItem {
  id: string;
  submission_id?: string;
  user_id: string;
  file_name: string;
  document_type: string;
  cloudinary_url: string;
  public_id: string;
  uploaded_at: string;
  size: number;
  status: string;
}

export const MyDocumentsPage: React.FC = () => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [documents, setDocuments] = useState<DBDocumentItem[]>([]);
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState('ALL');
  const [previewDoc, setPreviewDoc] = useState<{ title: string; url: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDocuments = async () => {
    setIsLoading(true);
    try {
      if (user?.id) {
        const { data, error } = await supabase
          .from('documents')
          .select('*')
          .eq('user_id', user.id)
          .order('uploaded_at', { ascending: false });

        if (error) throw error;
        if (data) setDocuments(data as DBDocumentItem[]);
      }
    } catch (err: any) {
      console.warn('Supabase documents fetch error:', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, [user]);

  const handleDelete = async (id: string, fileName: string) => {
    try {
      setDocuments((prev) => prev.filter((d) => d.id !== id));

      if (user?.id) {
        await supabase.from('documents').delete().eq('id', id).eq('user_id', user.id);
      }

      addToast('Document Metadata Removed', `${fileName} deleted from Supabase.`, 'info');
    } catch (err) {
      addToast('Delete Error', 'Unable to delete document from database.', 'error');
    }
  };

  const filteredDocs = documents.filter((doc) => {
    const matchesSearch = (doc.file_name || '').toLowerCase().includes(search.toLowerCase());
    const matchesType = selectedType === 'ALL' ? true : doc.document_type === selectedType;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Document Vault by Submission ID</h1>
          <p className="text-xs text-slate-500 mt-1">
            Documents tagged with unique submission_id UUIDs in Supabase PostgreSQL.
          </p>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search documents..."
              className="pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <Button onClick={fetchDocuments} variant="ghost" size="sm" leftIcon={<RefreshCw className="w-3.5 h-3.5" />}>
            Refresh
          </Button>
        </div>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="text-center py-12 text-slate-400 text-xs font-semibold animate-pulse">
          Fetching encrypted document records from Supabase...
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filteredDocs.length === 0 && (
        <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 p-8 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto">
            <FileText className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-800">No Uploaded Documents Found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Upload your government forms or citizen identity proofs (Aadhaar, Passport, PAN) via the New Form Stepper.
          </p>
        </div>
      )}

      {/* Grid */}
      {!isLoading && filteredDocs.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredDocs.map((doc) => (
            <GlassCard key={doc.id} className="space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="w-10 h-10 rounded-xl bg-blue-100/80 text-blue-600 flex items-center justify-center border border-blue-200">
                    <FileText className="w-5 h-5" />
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-100 text-blue-800 border border-blue-200">
                    ID: {doc.submission_id ? doc.submission_id.slice(0, 8) : 'Direct'}
                  </span>
                </div>

                <div>
                  <h4 className="text-sm font-bold text-slate-900 leading-snug truncate">{doc.file_name}</h4>
                  <p className="text-[11px] text-slate-500 mt-1">
                    Uploaded {new Date(doc.uploaded_at).toLocaleDateString()} • {((doc.size || 0) / (1024 * 1024)).toFixed(2)} MB
                  </p>
                </div>

                <span className="inline-block px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 uppercase">
                  {doc.document_type || 'Government Form'}
                </span>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <Button
                  onClick={() => setPreviewDoc({ title: doc.file_name, url: doc.cloudinary_url })}
                  variant="outline"
                  size="sm"
                  leftIcon={<Eye className="w-3.5 h-3.5" />}
                >
                  Preview
                </Button>
                <button
                  onClick={() => handleDelete(doc.id, doc.file_name)}
                  className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
                  title="Delete document"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </GlassCard>
          ))}
        </div>
      )}

      <PDFViewerModal
        isOpen={!!previewDoc}
        onClose={() => setPreviewDoc(null)}
        title={previewDoc?.title || undefined}
        pdfUrl={previewDoc?.url}
      />
    </div>
  );
};
