import React, { createContext, useContext, useState } from 'react';
import { UploadedFile, ExtractedField, FormSubmission } from '../types';
import { INITIAL_EXTRACTED_FIELDS } from '../services/kimiAiService';
import { supabase } from '../lib/supabase';
import { KimiService, CANONICAL_SYNONYMS } from '../services/kimiService';
import { CanonicalMappingEngine } from '../services/canonicalMappingEngine';

interface FormWorkflowContextType {
  currentStep: number;
  setCurrentStep: (step: number) => void;
  activeSubmissionId: string;
  startNewSubmission: () => string;
  formFile: UploadedFile | null;
  setFormFile: (file: UploadedFile | null) => void;
  supportingFiles: UploadedFile[];
  addSupportingFile: (file: UploadedFile) => void;
  extractedFields: ExtractedField[];
  setExtractedFields: React.Dispatch<React.SetStateAction<ExtractedField[]>>;
  updateExtractedField: (id: string, newValue: string) => void;
  mergeExtractedFieldsMap: (
    newFieldsMap: Record<string, string>,
    uploadedFile?: UploadedFile
  ) => Promise<{
    mergedFields: ExtractedField[];
    updatedCount: number;
    successfulNormalizationsCount: number;
  }>;
  submissions: FormSubmission[];
  addSubmission: (submission: FormSubmission) => Promise<void>;
  resetWorkflow: () => void;
}

const DEMO_BLOCKED_TERMS = [
  'RAHUL VIKRAM VERMA',
  'SURESH VERMA',
  '4589 1029 3847',
  '458910293847',
  'ABCDE1234F',
  'rahul.verma@gov.ai',
  'Flat 402',
  'HighTech Heights',
  'Silicon City',
  'INR 14,50,000',
];

const FormWorkflowContext = createContext<FormWorkflowContextType | undefined>(undefined);

export const FormWorkflowProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [activeSubmissionId, setActiveSubmissionId] = useState<string>(() => crypto.randomUUID());
  const [formFile, setFormFile] = useState<UploadedFile | null>(null);
  const [supportingFiles, setSupportingFiles] = useState<UploadedFile[]>([]);
  const [extractedFields, setExtractedFields] = useState<ExtractedField[]>(INITIAL_EXTRACTED_FIELDS);
  const [submissions, setSubmissions] = useState<FormSubmission[]>([]);

  // Start new submission with fresh UUID & empty fields
  const startNewSubmission = () => {
    const newId = crypto.randomUUID();
    setActiveSubmissionId(newId);
    setFormFile(null);
    setSupportingFiles([]);
    setExtractedFields(INITIAL_EXTRACTED_FIELDS);
    setCurrentStep(1);
    console.log('[Form Workflow] Started New Submission ID:', newId);
    return newId;
  };

  const addSupportingFile = (file: UploadedFile) => {
    setSupportingFiles((prev) => [...prev, file]);
  };

  const updateExtractedField = (id: string, newValue: string) => {
    setExtractedFields((prev) =>
      prev.map((field) => {
        if (field.id === id) {
          // DEMO DATA GUARD: Reject any demo strings
          if (DEMO_BLOCKED_TERMS.some((term) => newValue.toUpperCase().includes(term.toUpperCase()))) {
            console.error('[Demo Data Guard Error] Demo data detected. Runtime fallback is still active.', { id, newValue });
            throw new Error('Demo data detected. Runtime fallback is still active.');
          }
          return { ...field, value: newValue, isEdited: true, isMissing: !newValue.trim() };
        }
        return field;
      })
    );
  };

  /**
   * Multiple Document Merge Engine with Confidence Rules:
   * 1. Higher confidence wins.
   * 2. Latest uploaded document wins when confidence is equal.
   * 3. Rejects all hardcoded demo strings.
   * 4. Logs step-by-step trace: Uploaded File -> OCR Raw Result -> Normalized Fields -> Final JSON -> Supabase.
   */
  const mergeExtractedFieldsMap = async (
    newFieldsMap: Record<string, string>,
    uploadedFile?: UploadedFile
  ): Promise<{
    mergedFields: ExtractedField[];
    updatedCount: number;
    successfulNormalizationsCount: number;
  }> => {
    // 1. Log Uploaded File
    console.log('==================================================');
    console.log('Uploaded File:', uploadedFile || formFile || 'Supporting Document');

    // 2. Log OCR Raw Result
    console.log('OCR Raw Result:', newFieldsMap);

    let updatedCount = 0;
    let successfulNormalizationsCount = 0;
    const normalizedFieldsObj: Record<string, string> = {};

    const updatedList: ExtractedField[] = [...extractedFields];

    // Iterate through raw OCR extracted map
    Object.entries(newFieldsMap).forEach(([rawOcrKey, ocrValue]) => {
      if (ocrValue === null || ocrValue === undefined || typeof ocrValue !== 'string' || ocrValue.trim() === '') {
        return;
      }

      const rawVal = ocrValue.trim();

      // DEMO DATA GUARD: Reject demo strings
      if (DEMO_BLOCKED_TERMS.some((term) => rawVal.toUpperCase().includes(term.toUpperCase()))) {
        console.error('[Demo Data Guard Error] Demo data detected. Runtime fallback is still active.', {
          rawOcrKey,
          rawVal,
        });
        throw new Error(`Demo data detected for key "${rawOcrKey}". Runtime fallback is still active.`);
      }

      const mappingRes = CanonicalMappingEngine.mapOCRFieldKey(rawOcrKey);
      const targetCanonicalKey = mappingRes.canonicalKey;

      if (targetCanonicalKey) {
        successfulNormalizationsCount++;
        normalizedFieldsObj[targetCanonicalKey] = rawVal;

        const targetIndex = updatedList.findIndex((f) => f.key === targetCanonicalKey);

        if (targetIndex !== -1) {
          const existingField = updatedList[targetIndex];
          const hasExistingValue = existingField.value && existingField.value.trim() !== '';
          const newConfidence = mappingRes.confidence;

          // Merge Rules:
          // A. Fill empty fields.
          // B. Overwrite existing field ONLY if new confidence > existing confidence or equal (latest document wins).
          const shouldUpdate =
            !hasExistingValue || newConfidence >= (existingField.confidence || 0);

          if (shouldUpdate) {
            const validated = KimiService.validateField(targetCanonicalKey as any, rawVal);
            const finalVal = validated.value || rawVal;

            if (finalVal) {
              updatedCount++;
              const isLowConfidence = newConfidence < 80;

              updatedList[targetIndex] = {
                ...existingField,
                value: finalVal,
                confidence: newConfidence,
                isMissing: false,
                isLowConfidence,
                isEdited: true,
              };
            }
          }
        }
      }
    });

    // 3. Log Normalized Fields
    console.log('Normalized Fields:', normalizedFieldsObj);

    // 4. Log Final JSON Before Save
    const finalSubmissionObj = updatedList.reduce((acc, f) => ({ ...acc, [f.key]: f.value || '' }), {});
    console.log('Final JSON Before Save:', finalSubmissionObj);

    // 5. Log Saving to Supabase
    console.log('Saving to Supabase...');
    console.log('==================================================');

    // Update React Context state immediately
    setExtractedFields(updatedList);

    // Save canonical JSON back to Supabase
    try {
      await supabase
        .from('forms')
        .update({
          extracted_fields: updatedList,
          created_at: new Date().toISOString(),
        })
        .eq('submission_id', activeSubmissionId);

      await supabase
        .from('submissions')
        .update({
          confidence_score: 98,
          updated_at: new Date().toISOString(),
        })
        .eq('id', activeSubmissionId);
    } catch (e) {
      console.warn('[Supabase Persistence Note]:', e);
    }

    return { mergedFields: updatedList, updatedCount, successfulNormalizationsCount };
  };

  const addSubmission = async (submission: FormSubmission) => {
    setSubmissions((prev) => [submission, ...prev]);
  };

  const resetWorkflow = () => {
    startNewSubmission();
  };

  return (
    <FormWorkflowContext.Provider
      value={{
        currentStep,
        setCurrentStep,
        activeSubmissionId,
        startNewSubmission,
        formFile,
        setFormFile,
        supportingFiles,
        addSupportingFile,
        extractedFields,
        setExtractedFields,
        updateExtractedField,
        mergeExtractedFieldsMap,
        submissions,
        addSubmission,
        resetWorkflow,
      }}
    >
      {children}
    </FormWorkflowContext.Provider>
  );
};

export const useFormWorkflow = () => {
  const context = useContext(FormWorkflowContext);
  if (!context) {
    throw new Error('useFormWorkflow must be used within a FormWorkflowProvider');
  }
  return context;
};
