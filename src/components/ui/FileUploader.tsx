import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileText, CheckCircle, AlertCircle, X, Loader2, Files } from 'lucide-react';
import { DocumentType, UploadedFile } from '../../types';
import { useUpload } from '../../hooks/useUpload';
import { useToast } from '../../context/ToastContext';

interface FileUploaderProps {
  onUploadSuccess?: (file: UploadedFile) => void;
  onBatchUploadSuccess?: (files: UploadedFile[]) => void;
  docType?: DocumentType;
  allowedTypes?: string[];
  maxSizeMB?: number;
  title?: string;
  allowMultiple?: boolean;
}

export const FileUploader: React.FC<FileUploaderProps> = ({
  onUploadSuccess,
  onBatchUploadSuccess,
  docType = 'OTHER',
  allowedTypes = ['.pdf', '.png', '.jpg', '.jpeg', '.webp', '.docx'],
  maxSizeMB = 10,
  title = 'Upload Files (Multiple PDFs & Images Supported)',
  allowMultiple = true,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadedFilesList, setUploadedFilesList] = useState<UploadedFile[]>([]);
  const { uploadFile, isUploading, progress, error: uploadError } = useUpload();
  const { addToast } = useToast();

  const handleFilesSelect = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    const validFiles = fileArray.filter((file) => {
      const ext = `.${file.name.split('.').pop()?.toLowerCase()}`;
      if (!allowedTypes.includes(ext)) {
        addToast('Invalid File Format', `${file.name} format not supported. Use PDF, PNG, JPG, JPEG, WEBP.`, 'error');
        return false;
      }
      if (file.size > maxSizeMB * 1024 * 1024) {
        addToast('File Too Large', `${file.name} exceeds ${maxSizeMB}MB size limit.`, 'error');
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) return;

    const uploadedBatch: UploadedFile[] = [];

    for (let i = 0; i < validFiles.length; i++) {
      const file = validFiles[i];
      try {
        const res = await uploadFile(file, docType);
        if (res) {
          const uploadedDoc: UploadedFile = {
            id: res.id,
            name: file.name,
            size: file.size,
            type: docType,
            url: res.cloudinary_url,
            uploadDate: new Date().toISOString(),
            status: 'COMPLETED',
          };
          uploadedBatch.push(uploadedDoc);
          if (onUploadSuccess) onUploadSuccess(uploadedDoc);
        }
      } catch (err: any) {
        addToast('Upload Error', `Failed to upload ${file.name}`, 'error');
      }
    }

    if (uploadedBatch.length > 0) {
      setUploadedFilesList((prev) => [...prev, ...uploadedBatch]);
      if (onBatchUploadSuccess) onBatchUploadSuccess(uploadedBatch);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files) {
      handleFilesSelect(e.dataTransfer.files);
    }
  };

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-3xl p-8 text-center cursor-pointer transition-all duration-200 ${
          isDragOver
            ? 'border-blue-500 bg-blue-50/60 scale-[1.01]'
            : 'border-slate-300 hover:border-blue-400 bg-slate-50/50 hover:bg-slate-50'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple={allowMultiple}
          accept={allowedTypes.join(',')}
          onChange={(e) => e.target.files && handleFilesSelect(e.target.files)}
          className="hidden"
        />

        <div className="flex flex-col items-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center shadow-sm">
            {isUploading ? <Loader2 className="w-7 h-7 animate-spin" /> : <Files className="w-7 h-7" />}
          </div>

          <div className="space-y-1">
            <h4 className="text-sm font-bold text-slate-800">{title}</h4>
            <p className="text-xs text-slate-500">
              Drag & Drop or click to browse (Hold <kbd className="px-1 bg-slate-200 rounded text-[10px]">Ctrl</kbd> / <kbd className="px-1 bg-slate-200 rounded text-[10px]">Shift</kbd> to select multiple files)
            </p>
            <p className="text-[11px] font-mono text-slate-400">PDF, PNG, JPG, JPEG, WEBP up to {maxSizeMB}MB</p>
          </div>

          {isUploading && (
            <div className="w-full max-w-xs space-y-1 pt-2">
              <div className="flex justify-between text-[11px] font-bold text-slate-600 font-mono">
                <span>Uploading Batch...</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
                <div className="h-full bg-blue-600 rounded-full transition-all duration-300" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}
        </div>
      </div>

      {uploadedFilesList.length > 0 && (
        <div className="space-y-2">
          <h5 className="text-xs font-bold uppercase text-slate-600 flex items-center gap-1.5">
            <CheckCircle className="w-4 h-4 text-emerald-600" /> Uploaded Batch Files ({uploadedFilesList.length})
          </h5>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {uploadedFilesList.map((file, idx) => (
              <div key={idx} className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between text-xs shadow-xs">
                <span className="font-semibold text-slate-800 truncate max-w-[200px]">{file.name}</span>
                <span className="text-[10px] font-bold font-mono px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md">
                  Uploaded
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
