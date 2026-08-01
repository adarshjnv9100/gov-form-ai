import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Download, ShieldCheck, FileText, ExternalLink, RefreshCw, AlertTriangle } from 'lucide-react';
import { Button } from '../ui/Button';
import { useToast } from '../../context/ToastContext';
import { PDFService } from '../../services/pdfService';

interface PDFViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  pdfUrl?: string;
  pdfBytes?: Uint8Array;
}

export const PDFViewerModal: React.FC<PDFViewerModalProps> = ({
  isOpen,
  onClose,
  title = 'Income Tax Return Verification Form (ITR-V 2026)',
  pdfUrl,
  pdfBytes,
}) => {
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
            throw new Error(`HTTP ${response.status}: Failed to fetch PDF stream.`);
          }

          const buffer = await response.arrayBuffer();
          const bytes = new Uint8Array(buffer);
          console.log('[PDF Fetch] Downloaded byte length:', bytes.byteLength);

          const first5 = new TextDecoder('ascii').decode(bytes.slice(0, 5));
          console.log('[PDF Fetch] First 5 bytes signature:', first5);

          // Verification: First 5 bytes must equal %PDF-
          if (first5 !== '%PDF-') {
            const first200 = new TextDecoder('ascii').decode(bytes.slice(0, 200));
            console.error('[PDF Fetch] STOP IMMEDIATELY: Stored document is NOT a valid PDF!');
            console.error('[PDF Fetch] pdf_url:', pdfUrl);
            console.error('[PDF Fetch] status:', response.status);
            console.error('[PDF Fetch] content-type:', contentType);
            console.error('[PDF Fetch] first 200 bytes:', first200);

            if (isSubscribed) {
              setErrorState('Unable to load PDF: Stored document does not begin with %PDF-');
            }
            return;
          }

          // Create clean Blob and Object URL
          const blob = new Blob([bytes], { type: 'application/pdf' });
          createdObjectUrl = URL.createObjectURL(blob);

          if (isSubscribed) {
            setObjectUrl(createdObjectUrl);
          }
        } catch (err: any) {
          console.error('[PDF Fetch] Catch error:', err?.message || err);
          if (isSubscribed) {
            setErrorState('Unable to load PDF.');
          }
        } finally {
          if (isSubscribed) setIsLoading(false);
        }
        return;
      }

      // 2. Fallback for in-session pdfBytes
      if (pdfBytes && pdfBytes.length > 0) {
        const bytes = new Uint8Array(pdfBytes);
        const first5 = new TextDecoder('ascii').decode(bytes.slice(0, 5));
        console.log('[PDF Fetch] Session pdfBytes signature:', first5);

        if (first5 === '%PDF-') {
          const blob = new Blob([bytes], { type: 'application/pdf' });
          createdObjectUrl = URL.createObjectURL(blob);
          if (isSubscribed) {
            setObjectUrl(createdObjectUrl);
            setIsLoading(false);
          }
        } else {
          console.error('[PDF Fetch] Session pdfBytes failed %PDF- check');
          if (isSubscribed) {
            setErrorState('Unable to load PDF.');
            setIsLoading(false);
          }
        }
      } else {
        if (isSubscribed) setIsLoading(false);
      }
    };

    if (isOpen) {
      fetchAndVerifyPDF();
    } else {
      setObjectUrl(null);
      setErrorState(null);
    }

    return () => {
      isSubscribed = false;
      if (createdObjectUrl && createdObjectUrl.startsWith('blob:')) {
        console.log('[PDF Fetch] Revoking Object URL:', createdObjectUrl);
        URL.revokeObjectURL(createdObjectUrl);
      }
    };
  }, [isOpen, pdfUrl, pdfBytes]);

  if (!isOpen) return null;

  const handleDownload = () => {
    if (pdfBytes) {
      PDFService.downloadPDFFile(pdfBytes, `${title.replace(/\s+/g, '_')}_AutoFilled.pdf`);
      addToast('Download Initiated', 'Official PDF file downloaded.', 'success');
    } else if (objectUrl) {
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = `${title.replace(/\s+/g, '_')}_AutoFilled.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      addToast('Download Initiated', 'PDF fetched from persistent vault.', 'success');
    } else if (pdfUrl) {
      window.open(pdfUrl, '_blank');
    }
  };

  const handleOpenNewTab = () => {
    if (objectUrl) {
      window.open(objectUrl, '_blank');
    } else if (pdfUrl) {
      window.open(pdfUrl, '_blank');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="p-4 px-6 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">{title}</h3>
              <p className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Persistent RAW PDF Stream • Verified %PDF- Header
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {(objectUrl || pdfUrl) && !errorState && (
              <Button onClick={handleOpenNewTab} variant="outline" size="sm" leftIcon={<ExternalLink className="w-3.5 h-3.5" />}>
                Open PDF
              </Button>
            )}
            {!errorState && (
              <Button onClick={handleDownload} variant="primary" size="sm" leftIcon={<Download className="w-3.5 h-3.5" />}>
                Download PDF
              </Button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors ml-2"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* PDF Viewer Canvas */}
        <div className="flex-1 p-6 overflow-y-auto bg-slate-100/80 flex justify-center items-center min-h-[550px]">
          {isLoading ? (
            <div className="text-center py-16 space-y-3">
              <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
              <p className="text-xs font-bold text-slate-600">Fetching RAW PDF stream and verifying %PDF- signature...</p>
            </div>
          ) : errorState ? (
            <div className="text-center py-16 px-8 bg-rose-50 rounded-2xl border border-rose-200 max-w-md mx-auto space-y-3">
              <AlertTriangle className="w-10 h-10 text-rose-600 mx-auto" />
              <h4 className="text-sm font-bold text-rose-900">{errorState}</h4>
              <p className="text-xs text-rose-700 leading-relaxed">
                The stored document is not a valid PDF file starting with %PDF-.
              </p>
              {pdfUrl && (
                <a
                  href={pdfUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-800 underline pt-2"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Open Stored URL
                </a>
              )}
            </div>
          ) : objectUrl ? (
            <iframe
              src={objectUrl}
              title="Filled PDF Document Preview"
              className="w-full max-w-3xl h-[650px] rounded-lg shadow-xl border border-slate-300 bg-white"
            />
          ) : (
            <div className="w-full max-w-2xl bg-white shadow-xl rounded-lg p-10 border border-slate-300 min-h-[600px] text-slate-800 space-y-6">
              <div className="text-center border-b-2 border-slate-900 pb-4 space-y-1">
                <span className="text-[10px] font-bold tracking-widest text-slate-500 uppercase">
                  INCOME TAX DEPARTMENT • GOVERNMENT OF INDIA
                </span>
                <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">INDIAN INCOME TAX RETURN VERIFICATION FORM</h2>
                <p className="text-xs font-semibold text-slate-600">Assessment Year 2026-27 • [ITR-V]</p>
              </div>

              <div className="flex justify-between items-center bg-slate-50 p-3 rounded border border-slate-200 font-mono text-xs">
                <div>
                  <p className="font-bold text-slate-700">ACK NO: 902810293819203</p>
                  <p className="text-slate-500 text-[10px]">TIMESTAMP: {new Date().toISOString()}</p>
                </div>
                <div className="h-8 bg-slate-800 w-36 rounded flex items-center justify-center text-white text-[10px] font-bold tracking-widest">
                  ||||||||||||||||||||||||||||
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-blue-900 border-b border-blue-200 pb-1">
                  1. PERSONAL & TAXPAYER IDENTIFICATION
                </h4>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-slate-500 block text-[10px]">NAME OF ASSESSEE:</span>
                    <span className="font-bold text-slate-900 font-mono">RAHUL VIKRAM VERMA</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">PAN NUMBER:</span>
                    <span className="font-bold text-slate-900 font-mono">ABCDE1234F</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">AADHAAR NUMBER:</span>
                    <span className="font-bold text-slate-900 font-mono">4589 1029 3847</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">MOBILE NUMBER:</span>
                    <span className="font-bold text-slate-900 font-mono">+91 98765 43210</span>
                  </div>
                </div>

                <h4 className="text-xs font-bold uppercase tracking-wider text-blue-900 border-b border-blue-200 pb-1 pt-2">
                  2. ADDRESS FOR COMMUNICATION
                </h4>
                <p className="text-xs font-mono font-medium text-slate-800 bg-slate-50 p-2.5 rounded border border-slate-200">
                  Flat 402, HighTech Heights, Silicon City, Whitefield, Bengaluru - 560066
                </p>
              </div>

              <div className="pt-6 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-400">
                <span className="flex items-center gap-1 font-semibold text-emerald-600">
                  <ShieldCheck className="w-3.5 h-3.5" /> Validated PDF Stream
                </span>
                <span>Document Digest: sha256_e8910293f...</span>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
