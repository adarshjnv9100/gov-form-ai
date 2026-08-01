export interface CloudinaryUploadResult {
  secure_url: string;
  public_id: string;
  asset_id: string;
  original_filename: string;
  format: string;
  bytes: number;
  resource_type: string;
  documentType?: string;
}

export class CloudinaryService {
  private static get cloudName(): string {
    return import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'wjjjfwhr';
  }

  private static get uploadPreset(): string {
    return import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'government-form-ai';
  }

  /**
   * Uploads raw PDF binary blob directly to Cloudinary REST API.
   * Enforces resource_type: "raw" with binary FormData blob preservation.
   */
  public static async uploadFile(
    file: File | Blob,
    onProgress?: (progress: number) => void,
    forcedResourceType?: 'auto' | 'raw' | 'image'
  ): Promise<CloudinaryUploadResult> {
    const cloudName = this.cloudName;
    const uploadPreset = this.uploadPreset;

    const fileName = (file as File).name || `form_${Date.now()}.pdf`;
    const isPdf = file.type === 'application/pdf' || fileName.toLowerCase().endsWith('.pdf');
    
    // Always use resource_type: "raw" for PDF files
    const resourceType = forcedResourceType || (isPdf ? 'raw' : 'auto');
    const endpoint = `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`;

    const formData = new FormData();
    // Pass raw Blob directly into FormData
    formData.append('file', file, fileName);
    formData.append('upload_preset', uploadPreset);

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', endpoint, true);

      if (xhr.upload && onProgress) {
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100);
            onProgress(percent);
          }
        };
      }

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            const docType = determineDocumentType(fileName);

            resolve({
              secure_url: response.secure_url,
              public_id: response.public_id,
              asset_id: response.asset_id,
              original_filename: response.original_filename || fileName,
              format: response.format || (isPdf ? 'pdf' : 'raw'),
              bytes: response.bytes,
              resource_type: response.resource_type || resourceType,
              documentType: docType,
            });
          } catch (e) {
            reject(new Error('Failed to parse Cloudinary response JSON.'));
          }
        } else {
          try {
            const errorRes = JSON.parse(xhr.responseText);
            reject(new Error(errorRes.error?.message || `Cloudinary upload failed with status ${xhr.status}`));
          } catch {
            reject(new Error(`Cloudinary upload failed with HTTP status ${xhr.status}`));
          }
        }
      };

      xhr.onerror = () => reject(new Error('Network error during direct Cloudinary upload.'));
      xhr.send(formData);
    });
  }
}

export function determineDocumentType(filename: string): string {
  const lower = filename.toLowerCase();
  if (lower.includes('form') || lower.includes('itr') || lower.includes('application')) return 'GOVERNMENT_FORM';
  if (lower.includes('aadhaar') || lower.includes('uid')) return 'AADHAAR';
  if (lower.includes('pan')) return 'PAN';
  if (lower.includes('passport')) return 'PASSPORT';
  if (lower.includes('tax') || lower.includes('w2') || lower.includes('1040')) return 'TAX_FILE';
  return 'OTHER';
}
