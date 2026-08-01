import { useState } from 'react';
import { KimiService, KimiStructuredSchema, ExtractedFieldDetail } from '../services/kimiService';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export function useAI() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<KimiStructuredSchema | null>(null);
  const [extractedFieldsList, setExtractedFieldsList] = useState<ExtractedFieldDetail[]>([]);
  const [lastDocInfo, setLastDocInfo] = useState<{ docId: string; url: string; submissionId?: string } | null>(null);

  const { user, updateProfile } = useAuth();
  const { addToast } = useToast();

  const processDocument = async (
    docId: string,
    documentUrl: string,
    submissionId?: string
  ): Promise<{ structured: KimiStructuredSchema; fields: ExtractedFieldDetail[]; rawOcrText?: string } | null> => {
    setIsProcessing(true);
    setProgress(15);
    setError(null);
    setLastDocInfo({ docId, url: documentUrl, submissionId });

    try {
      const interval = setInterval(() => {
        setProgress((prev) => (prev < 90 ? prev + 25 : prev));
      }, 400);

      const result = await KimiService.extractDocumentJSON(documentUrl);
      clearInterval(interval);
      setProgress(100);

      setExtractedData(result.structured);
      setExtractedFieldsList(result.fields);

      // Store in Supabase `extracted_data` table linked to submission_id
      if (user?.id) {
        const extractionRecordId = `ext_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        await supabase.from('extracted_data').insert({
          id: extractionRecordId,
          submission_id: submissionId || null,
          user_id: user.id,
          document_id: docId || 'doc_current',
          json_data: result.structured,
          created_at: new Date().toISOString(),
        });
      }

      addToast('AI Semantic Extraction Complete', 'Validated canonical fields bound to submission.', 'success');
      return {
        structured: result.structured,
        fields: result.fields,
        rawOcrText: result.rawOcrText,
      };
    } catch (err: any) {
      const errMsg = err?.message || 'Kimi K2.6 Vision processing failed.';
      setError(errMsg);
      addToast('AI Extraction Failed', errMsg, 'error');
      return null;
    } finally {
      setIsProcessing(false);
    }
  };

  const retryProcessing = async () => {
    if (lastDocInfo) {
      return processDocument(lastDocInfo.docId, lastDocInfo.url, lastDocInfo.submissionId);
    }
    return null;
  };

  const saveToMasterProfile = async (fieldValues: Record<string, string>) => {
    try {
      const mappedProfileUpdates = {
        fullName: fieldValues.full_name || fieldValues.fullName,
        dob: fieldValues.date_of_birth || fieldValues.dob,
        address: fieldValues.address,
        phone: fieldValues.mobile_number || fieldValues.phone,
        panNumber: fieldValues.pan_number || fieldValues.panNumber,
        passportNumber: fieldValues.passport_number || fieldValues.passportNumber,
        aadhaarNumber: fieldValues.aadhaar_number || fieldValues.aadhaarNumber,
      };

      await updateProfile(mappedProfileUpdates);
      addToast('Saved to Master Profile', 'Updated reusable citizen credentials in master_profile.', 'success');
    } catch (err: any) {
      addToast('Save Failed', 'Unable to update master_profile in database.', 'error');
    }
  };

  return {
    processDocument,
    retryProcessing,
    saveToMasterProfile,
    isProcessing,
    progress,
    error,
    extractedData,
    extractedFieldsList,
  };
}
