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

export type DocumentType = 'GOVERNMENT_FORM' | 'AADHAAR' | 'PAN' | 'PASSPORT' | 'TAX_FILE' | 'OTHER';

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
  category: 'PERSONAL' | 'IDENTIFICATION' | 'TAX' | 'DECLARATION' | 'ADDRESS' | 'FINANCIAL';
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
