// ============================================================
// useAI HOOK
// Manages OCR processing state for a single document.
// Calls OCRService (which proxies to /api/ocr).
// On error: preserves previous extracted data — never clears fields.
// Delegates Supabase persistence to SubmissionService.
// ============================================================

import { useState } from 'react';
import { OCRService, OCRExtractionResult, CanonicalSchema } from '../services/ocrService';
import { insertExtractedData } from '../services/submissionService';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export function useAI() {
  const [isProcessing, setIsProcessing]   = useState(false);
  const [progress,     setProgress]       = useState(0);
  const [error,        setError]          = useState<string | null>(null);
  const [lastDocInfo,  setLastDocInfo]    = useState<{ docId: string; url: string; submissionId?: string } | null>(null);

  const { user }      = useAuth();
  const { addToast }  = useToast();

  /**
   * Processes a single document via OCR.
   * Returns the extraction result or null on failure.
   * On failure: keeps previous fields intact (caller is responsible for not clearing).
   */
  const processDocument = async (
    docId: string,
    documentUrl: string,
    submissionId?: string
  ): Promise<OCRExtractionResult | null> => {
    setIsProcessing(true);
    setProgress(15);
    setError(null);
    setLastDocInfo({ docId, url: documentUrl, submissionId });

    try {
      // Simulate progress while waiting for OCR response
      const progressInterval = setInterval(() => {
        setProgress((prev) => (prev < 85 ? prev + 20 : prev));
      }, 500);

      const result = await OCRService.extractDocumentJSON(documentUrl);
      clearInterval(progressInterval);
      setProgress(100);

      // Store extraction record in Supabase (non-critical — failure does not block)
      if (user?.id && submissionId) {
        await insertExtractedData({
          submissionId,
          userId:      user.id,
          documentId:  docId,
          jsonData:    result.structured as unknown as Record<string, string>,
        }).catch((e) => console.warn('[useAI] insertExtractedData failed (non-critical):', e));
      }

      addToast('Extraction Complete', 'Document analyzed and fields extracted.', 'success');
      return result;
    } catch (err: any) {
      const errMsg = err?.message || 'OCR extraction failed. Please retry.';
      setError(errMsg);
      addToast('Extraction Failed', errMsg, 'error');
      // Return null — caller preserves existing extracted data
      return null;
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * Retries the last document that was processed.
   */
  const retryProcessing = async (): Promise<OCRExtractionResult | null> => {
    if (lastDocInfo) {
      return processDocument(lastDocInfo.docId, lastDocInfo.url, lastDocInfo.submissionId);
    }
    return null;
  };

  return {
    processDocument,
    retryProcessing,
    isProcessing,
    progress,
    error,
  };
}
