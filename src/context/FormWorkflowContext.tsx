import React, { createContext, useContext, useState } from 'react';
import { UploadedFile, ExtractedField, FormSubmission } from '../types';
import { INITIAL_EXTRACTED_FIELDS } from '../services/kimiAiService';
import { supabase } from '../lib/supabase';
import { KimiService } from '../services/kimiService';
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
    uploadedFile?: UploadedFile,
    rawOcrText?: string
  ) => Promise<{
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

  const startNewSubmission = () => {
    const newId = crypto.randomUUID();
    setActiveSubmissionId(newId);
    setFormFile(null);
    setSupportingFiles([]);
    setExtractedFields(INITIAL_EXTRACTED_FIELDS);
    setCurrentStep(1);
    console.log('[Form Workflow] Started New Fresh Submission ID:', newId);
    return newId;
  };

  const addSupportingFile = (file: UploadedFile) => {
    setSupportingFiles((prev) => [...prev, file]);
  };

  const updateExtractedField = (id: string, newValue: string) => {
    setExtractedFields((prev) =>
      prev.map((field) => {
        if (field.id === id) {
          return { ...field, value: newValue, isEdited: true, isMissing: !newValue.trim() };
        }
        return field;
      })
    );
  };

  const mergeExtractedFieldsMap = async (
    newFieldsMap: Record<string, string>,
    uploadedFile?: UploadedFile,
    rawOcrText?: string
  ): Promise<{
    mergedFields: ExtractedField[];
    updatedCount: number;
    successfulNormalizationsCount: number;
  }> => {
    const fileObj = uploadedFile || formFile || { name: 'document', url: '' };

    console.log('==================================================');
    console.log('Uploaded file:', fileObj.name);
    console.log('Raw OCR text:', rawOcrText || JSON.stringify(newFieldsMap));
    console.log('Structured JSON:', newFieldsMap);

    let updatedCount = 0;
    let skippedCount = 0;
    let successfulNormalizationsCount = 0;

    const normalizedFieldsObj: Record<string, string> = {};
    const fieldsUpdatedList: string[] = [];
    const fieldsSkippedList: { key: string; reason: string }[] = [];

    const updatedList: ExtractedField[] = [...extractedFields];

    const validOcrEntries = Object.entries(newFieldsMap).filter(
      ([_, val]) => val !== null && val !== undefined && typeof val === 'string' && val.trim() !== '' && val !== 'null'
    );

    validOcrEntries.forEach(([rawOcrKey, ocrValue]) => {
      const rawVal = ocrValue.trim();

      const mappingRes = CanonicalMappingEngine.mapOCRFieldKey(rawOcrKey);
      const targetCanonicalKey = mappingRes.canonicalKey;

      if (targetCanonicalKey) {
        successfulNormalizationsCount++;
        normalizedFieldsObj[targetCanonicalKey] = rawVal;

        const targetIndex = updatedList.findIndex((f) => f.key === targetCanonicalKey);

        if (targetIndex !== -1) {
          const existingField = updatedList[targetIndex];
          const newConfidence = mappingRes.confidence;

          const validated = KimiService.validateField(targetCanonicalKey as any, rawVal);
          const finalVal = validated.value || rawVal;

          if (finalVal) {
            updatedCount++;
            fieldsUpdatedList.push(targetCanonicalKey);

            updatedList[targetIndex] = {
              ...existingField,
              value: finalVal,
              confidence: newConfidence,
              isMissing: false,
              isLowConfidence: false,
              isEdited: true,
            };
          }
        }
      }
    });

    console.log('Normalized JSON:', normalizedFieldsObj);
    const mergedFieldsObj = updatedList.reduce((acc, f) => ({ ...acc, [f.key]: f.value || '' }), {});
    console.log('Merged JSON:', mergedFieldsObj);
    console.log('==================================================');

    setExtractedFields(updatedList);

    try {
      await supabase
        .from('forms')
        .update({
          extracted_fields: updatedList,
          raw_ocr_text: rawOcrText || JSON.stringify(newFieldsMap),
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
