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
import { CanonicalKey, validateField, FIELD_SCHEMA } from '../services/ocrService';
import { CanonicalMappingEngine } from '../services/canonicalMappingEngine';
import { useAuth } from './AuthContext';

interface FormWorkflowContextType {
  currentStep: number;
  setCurrentStep: (step: number) => void;
  activeSubmissionId: string;
  startNewSubmission: () => string;
  formFile: UploadedFile | null;
  setFormFile: (file: UploadedFile | null) => void;
  uploadedForms: UploadedFile[];
  addUploadedForm: (file: UploadedFile) => Promise<ExtractedField[]>;
  selectTargetForm: (file: UploadedFile) => Promise<ExtractedField[]>;
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
 * Only used if the user did not upload an application form.
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
  const [uploadedForms,     setUploadedForms]     = useState<UploadedFile[]>([]);
  const [supportingFiles,   setSupportingFiles]   = useState<UploadedFile[]>([]);
  
  // Fields initialized with Master Profile as fallback — replaced dynamically when application form is uploaded
  const [extractedFields,   setExtractedFields]   = useState<ExtractedField[]>(() =>
    buildInitialFieldsWithMasterProfile(profile)
  );

  const [submissions,       setSubmissions]       = useState<FormSubmission[]>([]);

  // ── Target Application Form Detection & Field Extraction ───

  // ── Target Application Form Detection & Field Extraction ───

  // ── Target Application Form Detection & Field Extraction ───

  const selectTargetForm = async (file: UploadedFile): Promise<ExtractedField[]> => {
    setFormFile(file);

    let extracted: ExtractedField[] = [];
    let docType: 'APPLICATION_FORM' | 'SUPPORTING_DOCUMENT' = 'APPLICATION_FORM';

    try {
      // Dedicated AI Pipeline: Send ONLY application form image/PDF to Gemini Vision
      const parsedStructure = await OCRService.parseApplicationFormStructure(file.url);

      let detectedFields: ExtractedField[] = [];

      if (parsedStructure && parsedStructure.length > 0) {
        let fieldIdx = 1;
        detectedFields = parsedStructure.map((item) => {
          const mappingRes = CanonicalMappingEngine.mapOCRFieldKey(item.label);
          const canonicalKey = mappingRes.canonicalKey || item.label.toLowerCase().replace(/[\s\-_]+/g, '_');
          const meta = FIELD_SCHEMA[canonicalKey as CanonicalKey] || {
            label: item.label,
            isRequired: item.required,
            category: 'PERSONAL',
          };

          return {
            id: `detected_field_${canonicalKey}_${fieldIdx++}`,
            key: canonicalKey,
            label: item.label,
            value: '', // Values left blank for application form
            confidence: 0,
            isMissing: true,
            isLowConfidence: false,
            isRequired: item.required !== false,
            category: meta.category,
            source: 'FORM_DETECTED',
          };
        });
      } else {
        // Fallback parsing via standard OCR if vision route returned empty
        const ocrResult = await OCRService.extractDocumentJSON(file.url);
        const rawFieldsMap = ocrResult.structured as unknown as Record<string, string>;
        docType = CanonicalMappingEngine.classifyDocument(rawFieldsMap, 'APPLICATION_FORM');

        const rawEntries = Object.entries(rawFieldsMap);
        const activeEntries = rawEntries.filter(([_, val]) => val !== null && val !== undefined);
        const entriesToProcess = activeEntries.length > 0 ? activeEntries : rawEntries.slice(0, 8);

        let fieldIdx = 1;
        detectedFields = entriesToProcess.map(([rawKey, _]) => {
          const mappingRes = CanonicalMappingEngine.mapOCRFieldKey(rawKey);
          const canonicalKey = mappingRes.canonicalKey || rawKey;
          const meta = FIELD_SCHEMA[canonicalKey as CanonicalKey] || {
            label: rawKey.replace(/_/g, ' ').toUpperCase(),
            isRequired: true,
            category: 'PERSONAL',
          };

          return {
            id: `form_field_${canonicalKey}_${fieldIdx++}`,
            key: canonicalKey,
            label: meta.label,
            value: '',
            confidence: 0,
            isMissing: true,
            isLowConfidence: false,
            isRequired: meta.isRequired,
            category: meta.category,
            source: 'FORM_DETECTED',
          };
        });
      }

      extracted = detectedFields;
    } catch (e) {
      console.warn('[FormWorkflowContext] Error extracting fields from target form:', e);
      extracted = buildInitialFieldsWithMasterProfile(profile);
    }

    // Required Debug Logs
    console.log('==================== DEDICATED APPLICATION FORM VISION PIPELINE ====================');
    console.log('[Audit Log] Detected Form Template:', JSON.stringify(extracted.map((f) => ({ label: f.label, required: f.isRequired })), null, 2));
    console.log('[Audit Log] Detected Labels:', JSON.stringify(extracted.map((f) => f.label), null, 2));
    console.log('[Audit Log] Canonical fields:', JSON.stringify(extracted.map((f) => f.key), null, 2));
    console.log('[Audit Log] Rendered Dynamic Form:', JSON.stringify(extracted.map((f) => ({ key: f.key, label: f.label, value: f.value })), null, 2));
    console.log('====================================================================================');

    setExtractedFields(extracted);
    return extracted;
  };

  const addUploadedForm = async (file: UploadedFile): Promise<ExtractedField[]> => {
    setUploadedForms((prev) => {
      const exists = prev.some((f) => f.id === file.id);
      return exists ? prev : [...prev, file];
    });
    return await selectTargetForm(file);
  };

  // ── Start New Submission ──────────────────────────────────

  const startNewSubmission = (): string => {
    const newId = crypto.randomUUID();
    setActiveSubmissionId(newId);
    setFormFile(null);
    setUploadedForms([]);
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

  // ── Direct Canonical Mapping & Priority Merge Engine ─────

  const mergeExtractedFieldsMap = async (
    newFieldsMap: Record<string, string>,
    uploadedFile?: UploadedFile,
    rawOcrText?: string
  ): Promise<{ mergedFields: ExtractedField[]; updatedCount: number; successfulNormalizationsCount: number }> => {

    const docType = CanonicalMappingEngine.classifyDocument(newFieldsMap, 'SUPPORTING_DOCUMENT');
    const targetTemplate: ExtractedField[] = [...extractedFields];

    if (targetTemplate.length === 0) {
      targetTemplate.push(...buildInitialFieldsWithMasterProfile(profile));
    }

    // Direct Deterministic Canonical Mapping & Normalization
    const { updatedTemplate, canonicalMappings, normalizedOcrMap } = CanonicalMappingEngine.mapValuesToDetectedTemplate(
      newFieldsMap,
      targetTemplate
    );

    const updatedCount = canonicalMappings.length;
    const successfulNormalizationsCount = canonicalMappings.length;

    // Structured Audit Logs
    console.log('==================== CANONICAL MAPPING ARCHITECTURE LOGS ====================');
    console.log('[Audit Log] Detected document type:', docType);
    console.log('[Audit Log] Canonical Mapping:', JSON.stringify(canonicalMappings, null, 2));
    console.log('[Audit Log] Normalized OCR:', JSON.stringify(normalizedOcrMap, null, 2));
    console.log('[Audit Log] Final Dynamic Form:', JSON.stringify(updatedTemplate.map((f) => ({ label: f.label, canonicalKey: f.key, value: f.value })), null, 2));
    console.log('=============================================================================');

    setExtractedFields(updatedTemplate);

    return { mergedFields: updatedTemplate, updatedCount, successfulNormalizationsCount };
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
        uploadedForms,
        addUploadedForm,
        selectTargetForm,
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
