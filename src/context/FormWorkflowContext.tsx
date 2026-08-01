// ============================================================
// FORM WORKFLOW CONTEXT
// Manages wizard state: step, files, extracted fields.
// All fields start EMPTY — no hardcoded demo values.
// Directly connects OCR output to Review UI with multi-doc merging rules.
// ============================================================

import React, { createContext, useContext, useState } from 'react';
import { UploadedFile, ExtractedField, FormSubmission } from '../types';
import { OCRService } from '../services/ocrService';
import { CanonicalKey, validateField } from '../services/ocrService';
import { CanonicalMappingEngine } from '../services/canonicalMappingEngine';
import { useAuth } from './AuthContext';

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
  // Fields start EMPTY — populated only by real Gemini OCR extraction
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

  // ── Multi-Document Merge Engine ───────────────────────────
  // Rules:
  // 1. Never overwrite manually edited values (isEdited === true).
  // 2. Never replace a populated value with null/empty.
  // 3. Always keep the highest confidence value.
  // 4. Update Review UI state immediately.

  const mergeExtractedFieldsMap = async (
    newFieldsMap: Record<string, string>,
    uploadedFile?: UploadedFile,
    rawOcrText?: string
  ): Promise<{ mergedFields: ExtractedField[]; updatedCount: number; successfulNormalizationsCount: number }> => {

    let updatedCount = 0;
    let successfulNormalizationsCount = 0;

    const updatedList: ExtractedField[] = [...extractedFields];

    // Build initial empty 26-field canonical structure if this is the first extraction
    if (updatedList.length === 0) {
      const emptyResult = OCRService.buildEmptyResult();
      updatedList.push(...emptyResult.fields);
    }

    // Process canonical entries from OCR JSON
    Object.entries(newFieldsMap).forEach(([rawOcrKey, ocrValue]) => {
      if (ocrValue === null || ocrValue === undefined || typeof ocrValue !== 'string') return;

      const rawVal = ocrValue.trim();
      if (!rawVal || rawVal.toLowerCase() === 'null') return; // Skip empty/null values — NEVER replace populated value with null

      const mappingRes = CanonicalMappingEngine.mapOCRFieldKey(rawOcrKey);
      if (!mappingRes.canonicalKey) return;

      successfulNormalizationsCount++;

      const targetIndex = updatedList.findIndex((f) => f.key === mappingRes.canonicalKey);
      if (targetIndex === -1) return;

      const existingField = updatedList[targetIndex];

      // Rule: Never overwrite manually edited fields
      if (existingField.isEdited) {
        return;
      }

      const { value: validatedVal, confidence: newConfidence } = validateField(
        mappingRes.canonicalKey as CanonicalKey,
        rawVal
      );

      if (!validatedVal || !validatedVal.trim()) return;

      const isCurrentEmpty = !existingField.value || existingField.value.trim() === '';
      const isNewHigherConfidence = newConfidence > (existingField.confidence || 0);

      // Merge Rule: Update if current field is empty OR new extraction has higher confidence
      if (isCurrentEmpty || isNewHigherConfidence) {
        updatedCount++;
        updatedList[targetIndex] = {
          ...existingField,
          value:           validatedVal,
          confidence:      newConfidence,
          isMissing:       false,
          isLowConfidence: newConfidence < 85,
        };
      }
    });

    // Update Review UI state immediately
    setExtractedFields(updatedList);

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
