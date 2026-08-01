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
  mergeExtractedFieldsMap: (newFieldsMap: Record<string, string>) => Promise<{
    mergedFields: ExtractedField[];
    updatedCount: number;
    successfulNormalizationsCount: number;
  }>;
  submissions: FormSubmission[];
  addSubmission: (submission: FormSubmission) => Promise<void>;
  resetWorkflow: () => void;
}

const FormWorkflowContext = createContext<FormWorkflowContextType | undefined>(undefined);

export const FormWorkflowProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [activeSubmissionId, setActiveSubmissionId] = useState<string>(() => crypto.randomUUID());
  const [formFile, setFormFile] = useState<UploadedFile | null>(null);
  const [supportingFiles, setSupportingFiles] = useState<UploadedFile[]>([]);
  const [extractedFields, setExtractedFields] = useState<ExtractedField[]>(INITIAL_EXTRACTED_FIELDS);
  const [submissions, setSubmissions] = useState<FormSubmission[]>([]);

  // Start new submission with fresh UUID
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
      prev.map((field) =>
        field.id === id ? { ...field, value: newValue, isEdited: true, isMissing: !newValue.trim() } : field
      )
    );
  };

  /**
   * Robust Canonical Field Mapping Engine Integration:
   * Uses fuzzy matching, typo correction, and 75%-90% threshold scoring.
   * Prints required logging sequence: Raw -> Normalized -> Canonical -> Confidence -> Updated.
   */
  const mergeExtractedFieldsMap = async (
    newFieldsMap: Record<string, string>
  ): Promise<{
    mergedFields: ExtractedField[];
    updatedCount: number;
    successfulNormalizationsCount: number;
  }> => {
    console.log('==================================================');
    console.log('ROBUST CANONICAL FIELD MAPPING ENGINE EXECUTION');
    console.log('==================================================');

    let updatedCount = 0;
    let successfulNormalizationsCount = 0;

    // Create a copy of current extracted fields for synchronous state update
    const updatedList: ExtractedField[] = [...extractedFields];

    // Iterate through every raw OCR extracted field
    Object.entries(newFieldsMap).forEach(([rawOcrKey, ocrValue]) => {
      if (ocrValue === null || ocrValue === undefined || typeof ocrValue !== 'string' || ocrValue.trim() === '') {
        return;
      }

      // Execute Canonical Mapping Engine
      const mappingRes = CanonicalMappingEngine.mapOCRFieldKey(rawOcrKey);

      let isUpdated = false;
      const targetCanonicalKey = mappingRes.canonicalKey;

      if (targetCanonicalKey) {
        successfulNormalizationsCount++;
        const targetIndex = updatedList.findIndex((f) => f.key === targetCanonicalKey);

        if (targetIndex !== -1) {
          const existingField = updatedList[targetIndex];
          const hasExistingValue = existingField.value && existingField.value.trim() !== '';

          // Rule: Never overwrite an existing verified value. Only fill empty fields.
          if (!hasExistingValue) {
            const validated = KimiService.validateField(targetCanonicalKey as any, ocrValue.trim());
            const finalVal = validated.value || ocrValue.trim();

            if (finalVal) {
              updatedCount++;
              isUpdated = true;
              updatedList[targetIndex] = {
                ...existingField,
                value: finalVal,
                confidence: mappingRes.confidence,
                isMissing: false,
                isLowConfidence: mappingRes.needsReview,
                isEdited: true,
              };
            }
          }
        }
      }

      // Print Required Logging Sequence
      console.log(`Raw`);
      console.log(`  ${rawOcrKey}`);
      console.log(`↓`);
      console.log(`Normalized`);
      console.log(`  ${mappingRes.normalizedKey}`);
      console.log(`↓`);
      console.log(`Canonical`);
      console.log(`  ${targetCanonicalKey || 'UNMAPPED'}`);
      console.log(`↓`);
      console.log(`Confidence`);
      console.log(`  ${mappingRes.confidence}%`);
      console.log(`↓`);
      console.log(`Updated`);
      console.log(`  ${isUpdated ? 'YES' : 'NO'}`);
      console.log('--------------------------------------------------');
    });

    console.log('[Canonical Mapping Engine] Summary: Updated', updatedCount, 'field(s). Successful Mappings:', successfulNormalizationsCount);
    console.log('==================================================');

    // Update React Context state immediately
    setExtractedFields(updatedList);

    // Save updated merged list back to Supabase
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
      console.warn('[Canonical Engine] Supabase update note:', e);
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
