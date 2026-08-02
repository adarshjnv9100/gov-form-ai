// ============================================================
// GLOBAL TYPE DEFINITIONS
// All types are derived from real data — no hardcoded defaults
// ============================================================

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  isVerified?: boolean;
}

export interface UserProfile {
  fullName: string;
  dob: string;
  address: string;
  phone: string;
  panNumber: string;
  passportNumber: string;
  aadhaarNumber: string;
  completionScore: number;
}

export type DocumentType =
  | 'GOVERNMENT_FORM'
  | 'AADHAAR'
  | 'PAN'
  | 'PASSPORT'
  | 'TAX_FILE'
  | 'BANK'
  | 'DRIVING_LICENCE'
  | 'BIRTH_CERTIFICATE'
  | 'UTILITY_BILL'
  | 'INCOME_CERTIFICATE'
  | 'MARRIAGE_CERTIFICATE'
  | 'OTHER';

export type FieldCategory =
  | 'PERSONAL'
  | 'IDENTIFICATION'
  | 'ADDRESS'
  | 'TAX'
  | 'EMPLOYMENT'
  | 'FINANCIAL'
  | 'DECLARATION';

export interface UploadedFile {
  id: string;
  submissionId?: string;
  name: string;
  size: number;
  type: DocumentType;
  url: string;
  uploadDate: string;
  status: 'UPLOADING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  progress?: number;
}

export interface ExtractedField {
  id: string;
  submissionId?: string;
  key: string;
  label: string;
  value: string;
  confidence: number;
  isEdited?: boolean;
  isMissing?: boolean;
  isLowConfidence?: boolean;
  isRequired?: boolean;
  category: FieldCategory;
  source?: 'OCR' | 'PROFILE' | 'DEFAULT' | 'FORM_DETECTED';
}

export interface FormSubmission {
  id: string;
  submissionId: string;
  formTitle: string;
  formCode: string;
  createdAt: string;
  status: 'DRAFT' | 'PROCESSING' | 'COMPLETED' | 'REJECTED';
  extractedFields: ExtractedField[];
  pdfUrl?: string;
  supportingFilesCount: number;
  confidenceScore: number;
}

export interface ToastMessage {
  id: string;
  title: string;
  description?: string;
  type: 'success' | 'error' | 'info' | 'warning';
}

/** Computes the overall confidence score from a list of extracted fields */
export function computeConfidenceScore(fields: ExtractedField[]): number {
  const filledFields = fields.filter((f) => f.value && f.value.trim() !== '');
  if (filledFields.length === 0) return 0;
  const total = filledFields.reduce((sum, f) => sum + (f.confidence || 0), 0);
  return Math.round(total / filledFields.length);
}

/** Returns how many required fields have been filled */
export function computeCompletionPercentage(fields: ExtractedField[]): number {
  if (fields.length === 0) return 0;
  const filled = fields.filter((f) => f.value && f.value.trim() !== '').length;
  return Math.round((filled / fields.length) * 100);
}
