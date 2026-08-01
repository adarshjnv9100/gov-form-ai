import { useState } from 'react';
import { CloudinaryService, CloudinaryUploadResult, determineDocumentType } from '../services/cloudinaryService';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export interface UploadedDocumentRecord {
  id: string;
  submission_id?: string;
  user_id: string;
  file_name: string;
  document_type: string;
  cloudinary_url: string;
  public_id: string;
  uploaded_at: string;
  size: number;
  status: string;
}

export function useUpload() {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [uploadedDoc, setUploadedDoc] = useState<UploadedDocumentRecord | null>(null);
  const [lastFile, setLastFile] = useState<File | null>(null);

  const { user } = useAuth();
  const { addToast } = useToast();

  const validateFile = (file: File): string | null => {
    const MAX_SIZE = 20 * 1024 * 1024; // 20MB limit
    if (file.size > MAX_SIZE) {
      return 'File size exceeds 20MB maximum limit.';
    }

    const allowedExtensions = ['pdf', 'png', 'jpeg', 'jpg', 'docx'];
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    if (!allowedExtensions.includes(ext)) {
      return `Unsupported file format (.${ext}). Allowed formats: PDF, PNG, JPEG, JPG, DOCX.`;
    }

    return null;
  };

  const uploadFile = async (
    file: File,
    customType?: string,
    submissionId?: string
  ): Promise<UploadedDocumentRecord | null> => {
    setError(null);
    setLastFile(file);

    const valError = validateFile(file);
    if (valError) {
      setError(valError);
      addToast('Upload Rejected', valError, 'error');
      return null;
    }

    setIsUploading(true);
    setProgress(5);

    try {
      // 1. Unsigned Upload directly to Cloudinary
      const res: CloudinaryUploadResult = await CloudinaryService.uploadFile(file, (p) => {
        setProgress(p);
      });

      const finalDocType = customType || res.documentType || determineDocumentType(file.name);
      const docId = `doc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const timestamp = new Date().toISOString();

      const docRecord: UploadedDocumentRecord = {
        id: docId,
        submission_id: submissionId,
        user_id: user?.id || 'anonymous',
        file_name: file.name,
        document_type: finalDocType,
        cloudinary_url: res.secure_url,
        public_id: res.public_id,
        uploaded_at: timestamp,
        size: file.size,
        status: 'VERIFIED',
      };

      // 2. Store metadata in Supabase `documents` table with submission_id
      if (user?.id) {
        await supabase.from('documents').insert({
          id: docId,
          submission_id: submissionId || null,
          user_id: user.id,
          file_name: file.name,
          document_type: finalDocType,
          cloudinary_url: res.secure_url,
          public_id: res.public_id,
          uploaded_at: timestamp,
          size: file.size,
          status: 'VERIFIED',
          name: file.name,
          type: finalDocType,
          url: res.secure_url,
          created_at: timestamp,
        });
      }

      setUploadedDoc(docRecord);
      return docRecord;
    } catch (err: any) {
      const errMsg = err?.message || 'Failed to upload document to Cloudinary.';
      setError(errMsg);
      addToast('Upload Error', errMsg, 'error');
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  return {
    uploadFile,
    isUploading,
    progress,
    error,
    uploadedDoc,
    lastFile,
  };
}
