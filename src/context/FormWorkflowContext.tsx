// ============================================================
// FORM WORKFLOW CONTEXT
// Priority Merge Engine:
// User Manual Edit > OCR Extracted Values > Master Profile > Default Values
// Enforces rules:
// - Never overwrite OCR values with Master Profile.
// - Never reload Master Profile after OCR completes.
// - Update React state immediately upon OCR completion.
// - Comprehensive Audit Logging: Master Profile, OCR JSON, Merged Form, Rendered Form.
// ============================================================

import React, { createContext, useContext, useState, useEffect } from 'react';
import { UploadedFile, ExtractedField, FormSubmission, UserProfile } from '../types';
import { OCRService } from '../services/ocrService';
import { CanonicalKey, validateField } from '../services/ocrService';
import { CanonicalMappingEngine } from '../services/canonicalMappingEngine';
import { useAuth } from './AuthContext';

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

/**
 * Maps Master Profile object keys to Canonical OCR Keys.
 */
function getProfileValueForCanonicalKey(key: string, profile?: UserProfile): string | null {
  if (!profile) return null;
  switch (key) {
    case 'full_name':
      return profile.fullName || null;
    case 'date_of_birth':
      return profile.dob || null;
    case 'mobile_number':
      return profile.phone || null;
    case 'aadhaar_number':
      return profile.aadhaarNumber || null;
    case 'pan_number':
      return profile.panNumber || null;
    case 'passport_number':
      return profile.passportNumber || null;
    case 'address':
      return profile.address || null;
    default:
      return null;
  }
}

/**
 * Builds initial field list using Master Profile as fallback (Priority: Master Profile > Default).
 */
function buildInitialFieldsWithMasterProfile(profile?: UserProfile): ExtractedField[] {
  const emptyResult = OCRService.buildEmptyResult();
  return emptyResult.fields.map((field) => {
    const profileVal = getProfileValueForCanonicalKey(field.key, profile);
    if (profileVal && profileVal.trim()) {
      return {
        ...field,
        value: profileVal.trim(),
        confidence: 80,
        isMissing: false,
        source: 'PROFILE',
      };
    }
    return {
      ...field,
      value: '',
      confidence: 0,
      isMissing: true,
      source: 'DEFAULT',
    };
  });
}

export const FormWorkflowProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { profile } = useAuth();

  const [currentStep,       setCurrentStep]       = useState<number>(1);
  const [activeSubmissionId, setActiveSubmissionId] = useState<string>(() => crypto.randomUUID());
  const [formFile,          setFormFile]          = useState<UploadedFile | null>(null);
  const [supportingFiles,   setSupportingFiles]   = useState<UploadedFile[]>([]);
  
  // Fields initialized with Master Profile as fallback — updated immediately by OCR
  const [extractedFields,   setExtractedFields]   = useState<ExtractedField[]>(() =>
    buildInitialFieldsWithMasterProfile(profile)
  );

  const [submissions,       setSubmissions]       = useState<FormSubmission[]>([]);

  // ── Start New Submission ──────────────────────────────────

  const startNewSubmission = (): string => {
    const newId = crypto.randomUUID();
    setActiveSubmissionId(newId);
    setFormFile(null);
    setSupportingFiles([]);
    setExtractedFields(buildInitialFieldsWithMasterProfile(profile));
    setCurrentStep(1);
    return newId;
  };

  // ── File Management ───────────────────────────────────────

  const addSupportingFile = (file: UploadedFile) => {
    setSupportingFiles((prev) => [...prev, file]);
  };

  // ── User Manual Edit ──────────────────────────────────────
  // Priority 1: User Manual Edit is supreme and cannot be overwritten

  const updateExtractedField = (id: string, newValue: string) => {
    setExtractedFields((prev) =>
      prev.map((field) =>
        field.id === id
          ? {
              ...field,
              value: newValue,
              isEdited: true,
              isMissing: !newValue.trim(),
              source: newValue.trim() ? field.source || 'OCR' : 'DEFAULT',
            }
          : field
      )
    );
  };

  // ── Strict Priority Merge Engine ──────────────────────────
  // Priority Hierarchy: User Manual Edit > OCR Extracted Values > Master Profile > Default Values
  // Rules:
  // 1. Never overwrite OCR values with Master Profile.
  // 2. Never reload Master Profile after OCR completes.
  // 3. Never replace a populated value with null/empty.
  // 4. Update React state immediately.

  const mergeExtractedFieldsMap = async (
    newFieldsMap: Record<string, string>,
    uploadedFile?: UploadedFile,
    rawOcrText?: string
  ): Promise<{ mergedFields: ExtractedField[]; updatedCount: number; successfulNormalizationsCount: number }> => {

    let updatedCount = 0;
    let successfulNormalizationsCount = 0;

    // Requirement 9 Logs
    console.log('==================== OCR REVIEW MERGE ENGINE ====================');
    console.log('[Audit Log] Master Profile:', JSON.stringify(profile, null, 2));
    console.log('[Audit Log] OCR JSON:', JSON.stringify(newFieldsMap, null, 2));

    const updatedList: ExtractedField[] = [...extractedFields];

    // Ensure list is populated
    if (updatedList.length === 0) {
      updatedList.push(...buildInitialFieldsWithMasterProfile(profile));
    }

    // Process canonical entries from OCR JSON
    Object.entries(newFieldsMap).forEach(([rawOcrKey, ocrValue]) => {
      const mappingRes = CanonicalMappingEngine.mapOCRFieldKey(rawOcrKey);
      const targetKey = mappingRes.canonicalKey || (rawOcrKey in DEFAULT_CANONICAL_SCHEMA_KEYS ? rawOcrKey : null);
      
      if (!targetKey) return;

      const targetIndex = updatedList.findIndex((f) => f.key === targetKey);
      if (targetIndex === -1) return;

      const existingField = updatedList[targetIndex];

      // Priority 1: Never overwrite user manual edits
      if (existingField.isEdited) {
        return;
      }

      // Check if OCR has a valid non-empty value
      const hasOcrVal = ocrValue !== null && ocrValue !== undefined && typeof ocrValue === 'string' && ocrValue.trim() !== '' && ocrValue.trim().toLowerCase() !== 'null';

      if (hasOcrVal) {
        successfulNormalizationsCount++;
        const rawVal = ocrValue.trim();
        const { value: validatedVal, confidence: newConfidence } = validateField(
          targetKey as CanonicalKey,
          rawVal
        );

        if (validatedVal && validatedVal.trim()) {
          // Priority 2: Use OCR Extracted Values!
          // Replace profile or default values with OCR extracted value
          const isCurrentFromProfileOrDefault = existingField.source === 'PROFILE' || existingField.source === 'DEFAULT' || !existingField.value;
          const isHigherConfidence = newConfidence >= (existingField.confidence || 0);

          if (isCurrentFromProfileOrDefault || isHigherConfidence) {
            updatedCount++;
            updatedList[targetIndex] = {
              ...existingField,
              value:           validatedVal.trim(),
              confidence:      newConfidence || 95,
              isMissing:       false,
              isLowConfidence: (newConfidence || 95) < 85,
              source:          'OCR',
            };
          }
        }
      } else {
        // OCR value for this key is null/empty
        // Priority 3: Keep existing OCR value if present; otherwise fall back to Master Profile
        if (existingField.source === 'OCR' && existingField.value) {
          // NEVER overwrite OCR value with Master Profile or null!
          return;
        }

        const profileVal = getProfileValueForCanonicalKey(targetKey, profile);
        if (profileVal && profileVal.trim() && !existingField.value) {
          updatedList[targetIndex] = {
            ...existingField,
            value: profileVal.trim(),
            confidence: 80,
            isMissing: false,
            source: 'PROFILE',
          };
        }
      }
    });

    // Requirement 9 Logs
    console.log('[Audit Log] Merged Form:', JSON.stringify(updatedList, null, 2));
    console.log('[Audit Log] Rendered Form:', JSON.stringify(updatedList, null, 2));
    console.log('==================================================================');

    // Requirement 7 & 8: Update React form state immediately
    setExtractedFields(updatedList);

    return { mergedFields: updatedList, updatedCount, successfulNormalizationsCount };
  };

  // Helper set for canonical keys validation
  const DEFAULT_CANONICAL_SCHEMA_KEYS: Record<string, boolean> = {
    full_name: true, father_name: true, mother_name: true, date_of_birth: true,
    gender: true, marital_status: true, aadhaar_number: true, pan_number: true,
    passport_number: true, driving_license_number: true, voter_id: true,
    mobile_number: true, email: true, address: true, city: true, district: true,
    state: true, country: true, pincode: true, bank_name: true, bank_account_number: true,
    ifsc_code: true, branch_name: true, annual_income: true, occupation: true, emergency_contact: true,
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
