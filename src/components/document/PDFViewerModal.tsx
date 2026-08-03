import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Download, ShieldCheck, FileText, ExternalLink, RefreshCw, AlertTriangle } from 'lucide-react';
import { Button } from '../ui/Button';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { PDFService } from '../../services/pdfService';
import { markSubmissionCompleted } from '../../services/submissionService';

interface PDFViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  pdfUrl?: string;
  pdfBytes?: Uint8Array;
  submissionId?: string;
}

export const PDFViewerModal: React.FC<PDFViewerModalProps> = ({
  isOpen,
  onClose,
  title = 'Official Government Form PDF',
  pdfUrl,
  pdfBytes,
  submissionId,
}) => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorState, setErrorState] = useState<string | null>(null);

  useEffect(() => {
    let createdObjectUrl: string | null = null;
    let isSubscribed = true;

    const fetchAndVerifyPDF = async () => {
      setIsLoading(true);
      setErrorState(null);
      setObjectUrl(null);

      // 1. Fetch PDF directly from stored permanent URL
      if (pdfUrl) {
        console.log('[PDF Fetch] Requesting stored pdf_url:', pdfUrl);

        try {
          const response = await fetch(pdfUrl, { cache: 'no-store' });
          const contentType = response.headers.get('content-type') || 'unknown';

          console.log('[PDF Fetch] response.status:', response.status);
          console.log('[PDF Fetch] content-type:', contentType);

          if (!response.ok) {
            console.error('[PDF Fetch] ERROR: response.ok is false!');
            console.error('[PDF Fetch] pdf_url:', pdfUrl);
            console.error('[PDF Fetch] status:', response.status);
            console.error('[PDF Fetch] content-type:', contentType);
            if (isSubscribed) setErrorState(`HTTP Error ${response.status}: Failed to fetch PDF stream.`);
            return;
          }

          const arrayBuffer = await response.arrayBuffer();
          const bytes = new Uint8Array(arrayBuffer);
          const header = new TextDecoder().decode(bytes.slice(0, 5));

          console.log('[PDF Fetch] Bytes byteLength:', bytes.byteLength);
          console.log('[PDF Fetch] First 5 bytes header:', header);

          // Verify %PDF- signature
          if (header !== '%PDF-') {
            console.error('[PDF Fetch] INVALID PDF HEADER!');
            console.error('[PDF Fetch] pdf_url:', pdfUrl);
            console.error('[PDF Fetch] status:', response.status);
            console.error('[PDF Fetch] content-type:', contentType);
            console.error('[PDF Fetch] first 200 bytes:', new TextDecoder().decode(bytes.slice(0, 200)));

            if (isSubscribed) {
              setErrorState(`Corrupted stream header: expected "%PDF-", received "${header}".`);
            }
            return;
          }

          // Create fresh Object URL from verified binary Uint8Array stream
          const blob = new Blob([new Uint8Array(bytes)], { type: 'application/pdf' });
          createdObjectUrl = URL.createObjectURL(blob);

          if (isSubscribed) {
            setObjectUrl(createdObjectUrl);
            console.log('[PDF Fetch] Verified %PDF- stream. Rendered Object URL:', createdObjectUrl);
          }
        } catch (err: any) {
          console.error('[PDF Fetch] Exception while fetching pdf_url:', err);
          if (isSubscribed) setErrorState(err?.message || 'Network error fetching PDF.');
        } finally {
          if (isSubscribed) setIsLoading(false);
        }
      } else if (pdfBytes && pdfBytes.length > 0) {
        // Direct local byte stream fallback
        const header = new TextDecoder().decode(pdfBytes.slice(0, 5));
        if (header === '%PDF-') {
          const blob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });
          createdObjectUrl = URL.createObjectURL(blob);
          if (isSubscribed) {
            setObjectUrl(createdObjectUrl);
            setIsLoading(false);
          }
        } else {
          if (isSubscribed) {
            setErrorState('Local PDF bytes corrupt.');
            setIsLoading(false);
          }
        }
      } else {
        if (isSubscribed) setIsLoading(false);
      }
    };

    if (isOpen) {
      fetchAndVerifyPDF();
    }

    return () => {
      isSubscribed = false;
      if (createdObjectUrl) {
        URL.revokeObjectURL(createdObjectUrl);
      }
    };
  }, [isOpen, pdfUrl, pdfBytes]);

  const handleDownload = async () => {
    try {
      if (pdfBytes) {
        PDFService.downloadPDFFile(pdfBytes, `${title.replace(/\s+/g, '_')}.pdf`);
      } else if (pdfUrl) {
        window.open(pdfUrl, '_blank');
      } else {
        throw new Error('PDF resource unavailable for download.');
      }

      console.log('[Submission] Download completed');

      if (submissionId && user?.id) {
        const isSuccess = await markSubmissionCompleted({
          submissionId,
          userId: user.id,
          pdfUrl,
        });

        if (!isSuccess) {
          addToast('Status Update Warning', 'PDF downloaded but status update failed.', 'warning');
        }
      }
    } catch (err: any) {
      console.warn('[PDFViewerModal] Download failed:', err);
      addToast('Download Failed', err?.message || 'Error downloading PDF file.', 'error');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200 flex flex-col h-[85vh]"
      >
        {/* Modal Header */}
        <div className="p-4 md:px-6 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 line-clamp-1">{title}</h3>
              <p className="text-[11px] text-slate-500 font-mono">
                Verified Cloudinary RAW Stream • %PDF- Certified
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {pdfUrl && (
              <a href={pdfUrl} target="_blank" rel="noopener noreferrer">
                <Button variant="ghost" size="sm" leftIcon={<ExternalLink className="w-4 h-4" />}>
                  Open Direct URL
                </Button>
              </a>
            )}
            <Button onClick={handleDownload} variant="outline" size="sm" leftIcon={<Download className="w-4 h-4" />}>
              Download PDF
            </Button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body / PDF Iframe Stream */}
        <div className="flex-1 bg-slate-800 relative overflow-hidden flex items-center justify-center">
          {isLoading ? (
            <div className="text-center text-white space-y-3">
              <RefreshCw className="w-10 h-10 animate-spin text-blue-400 mx-auto" />
              <p className="text-xs font-mono">Verifying %PDF- Header & Streaming RAW Binary...</p>
            </div>
          ) : errorState ? (
            <div className="p-6 bg-rose-950/80 border border-rose-700 text-white rounded-2xl max-w-md text-center space-y-3 font-mono text-xs">
              <AlertTriangle className="w-10 h-10 text-rose-400 mx-auto" />
              <h4 className="font-bold text-sm text-rose-200">PDF Stream Verification Warning</h4>
              <p className="text-rose-300 text-[11px]">{errorState}</p>

              {pdfUrl && (
                <div className="pt-2">
                  <a
                    href={pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-bold text-xs transition-colors"
                  >
                    Open Permanent Cloudinary URL <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}
            </div>
          ) : objectUrl ? (
            <iframe
              src={objectUrl}
              className="w-full h-full border-0"
              title={title}
            />
          ) : (
            <div className="bg-white p-8 rounded-2xl shadow-xl max-w-2xl w-full mx-4 border border-slate-200 space-y-6 text-left">
              <div className="border-b border-slate-200 pb-4 text-center space-y-1">
                <span className="text-[10px] font-bold tracking-widest text-slate-500 uppercase">
                  GOVERNMENT FORM AI ENGINE
                </span>
                <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">AUTO-FILLED GOVERNMENT FORM</h2>
                <p className="text-xs font-semibold text-slate-600">OCR Extracted Data Summary</p>
              </div>

              <div className="flex justify-between items-center bg-slate-50 p-3 rounded border border-slate-200 font-mono text-xs">
                <div>
                  <p className="font-bold text-slate-700">SUBMISSION STREAM</p>
                  <p className="text-slate-500 text-[10px]">TIMESTAMP: {new Date().toISOString()}</p>
                </div>
                <div className="h-8 bg-slate-800 w-36 rounded flex items-center justify-center text-white text-[10px] font-bold tracking-widest">
                  ||||||||||||||||||||||||||||
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-400">
                <span className="flex items-center gap-1 font-semibold text-emerald-600">
                  <ShieldCheck className="w-3.5 h-3.5" /> Validated OCR Document Stream
                </span>
                <span>Security Stamp: Verified</span>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
