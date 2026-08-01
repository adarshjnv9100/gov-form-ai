// ============================================================
// FORM WORKFLOW CONTEXT
// Manages wizard state: step, files, extracted fields.
// All fields start EMPTY — no hardcoded demo values.
// Supabase writes are delegated to SubmissionService.
// ============================================================

import React, { createContext, useContext, useState } from 'react';
import { UploadedFile, ExtractedField, FormSubmission } from '../types';
import { supabase } from '../lib/supabase';
import { OCRService } from '../services/ocrService';
import { CanonicalKey, validateField } from '../services/ocrService';
import { CanonicalMappingEngine } from '../services/canonicalMappingEngine';
import { useAuth } from './AuthContext';
import { upsertSubmission, upsertForm, updateMergedFields, createDraftSubmission } from '../services/submissionService';

// ── Context Type ───────────────────────────────────────────

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

// ── Provider ───────────────────────────────────────────────

export const FormWorkflowProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentStep,       setCurrentStep]       = useState<number>(1);
  const [activeSubmissionId, setActiveSubmissionId] = useState<string>(() => crypto.randomUUID());
  const [formFile,          setFormFile]          = useState<UploadedFile | null>(null);
  const [supportingFiles,   setSupportingFiles]   = useState<UploadedFile[]>([]);
  // Fields start EMPTY — populated only by real OCR extraction
  const [extractedFields,   setExtractedFields]   = useState<ExtractedField[]>([]);
  const [submissions,       setSubmissions]       = useState<FormSubmission[]>([]);

  const { user } = useAuth();

  // ── Start New Submission ──────────────────────────────────

  const startNewSubmission = (): string => {
    const newId = crypto.randomUUID();
    setActiveSubmissionId(newId);
    setFormFile(null);
    setSupportingFiles([]);
    setExtractedFields([]); // Always starts empty — no demo data
    setCurrentStep(1);
    return newId;
  };

  // ── File Management ───────────────────────────────────────

  const addSupportingFile = (file: UploadedFile) => {
    setSupportingFiles((prev) => [...prev, file]);
  };

  // ── Field Update ──────────────────────────────────────────

  const updateExtractedField = (id: string, newValue: string) => {
    setExtractedFields((prev) =>
      prev.map((field) =>
        field.id === id
          ? { ...field, value: newValue, isEdited: true, isMissing: !newValue.trim() }
          : field
      )
    );
  };

  // ── Merge Logic ───────────────────────────────────────────
  // When new OCR results arrive from a supporting document:
  // 1. Map raw OCR keys → canonical keys
  // 2. Validate values
  // 3. Merge into existing fields
  //    - Never overwrite a good (high-confidence, filled) value with empty
  //    - Prefer higher confidence
  //    - Prefer newer extraction when confidence is equal
  // 4. Persist to Supabase via SubmissionService

  const mergeExtractedFieldsMap = async (
    newFieldsMap: Record<string, string>,
    uploadedFile?: UploadedFile,
    rawOcrText?: string
  ): Promise<{ mergedFields: ExtractedField[]; updatedCount: number; successfulNormalizationsCount: number }> => {

    let updatedCount = 0;
    let successfulNormalizationsCount = 0;

    // Filter out null/empty values from OCR response
    const validOcrEntries = Object.entries(newFieldsMap).filter(
      ([, val]) => val !== null && val !== undefined && typeof val === 'string' && val.trim() !== '' && val !== 'null'
    );

    const updatedList: ExtractedField[] = [...extractedFields];

    // If we don't have fields yet (first extraction), build the full list from OCR schema
    const isFirstExtraction = updatedList.length === 0;
    if (isFirstExtraction) {
      const emptyResult = OCRService.buildEmptyResult();
      updatedList.push(...emptyResult.fields);
    }

    validOcrEntries.forEach(([rawOcrKey, ocrValue]) => {
      const rawVal = ocrValue.trim();
      const mappingRes = CanonicalMappingEngine.mapOCRFieldKey(rawOcrKey);

      if (!mappingRes.canonicalKey) return;

      successfulNormalizationsCount++;

      const targetIndex = updatedList.findIndex((f) => f.key === mappingRes.canonicalKey);
      if (targetIndex === -1) return;

      const existingField = updatedList[targetIndex];
      const { value: validatedVal, confidence: newConfidence } = validateField(
        mappingRes.canonicalKey as CanonicalKey,
        rawVal
      );

      if (!validatedVal) return; // Skip empty validated values

      // Merge rule:
      // - If current field is empty → always take new value
      // - If new value has higher confidence → prefer new
      // - If confidence is equal → prefer new (newer extraction wins)
      // - Never overwrite a filled field with empty
      const shouldUpdate =
        !existingField.value ||
        newConfidence > (existingField.confidence || 0) ||
        (newConfidence === existingField.confidence && !existingField.isEdited);

      if (shouldUpdate) {
        updatedCount++;
        updatedList[targetIndex] = {
          ...existingField,
          value:           validatedVal,
          confidence:      newConfidence,
          isMissing:       false,
          isLowConfidence: newConfidence < 85,
          isEdited:        true,
        };
      }
    });

    setExtractedFields(updatedList);

    // Persist merged state to Supabase
    try {
      await updateMergedFields({
        submissionId: activeSubmissionId,
        userId: user?.id,
        updatedFields: updatedList,
        rawOcrText: rawOcrText || JSON.stringify(newFieldsMap),
      });
    } catch (e) {
      console.warn('[FormWorkflow] Supabase merge persistence failed:', e);
    }

    return { mergedFields: updatedList, updatedCount, successfulNormalizationsCount };
  };

  // ── Add Submission ────────────────────────────────────────

  const addSubmission = async (submission: FormSubmission): Promise<void> => {
    setSubmissions((prev) => [submission, ...prev]);
  };

  // ── Reset ─────────────────────────────────────────────────

  const resetWorkflow = () => {
    startNewSubmission();
  };

  // ── Provider ──────────────────────────────────────────────

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
  if (!context) throw new Error('useFormWorkflow must be used within a FormWorkflowProvider');
  return context;
};
