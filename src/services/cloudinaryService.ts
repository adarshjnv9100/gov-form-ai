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
   * Uploads raw PDF or Image binary blob directly to Cloudinary REST API.
   * Enforces resource_type: "raw" for PDFs and resource_type: "image" for images.
   */
  public static async uploadFile(
    file: File | Blob,
    onProgress?: (progress: number) => void,
    forcedResourceType?: 'auto' | 'raw' | 'image'
  ): Promise<CloudinaryUploadResult> {
    const cloudName = this.cloudName;
    const uploadPreset = this.uploadPreset;

    const fileName = (file as File).name || `document_${Date.now()}.pdf`;
    const isPdf = file.type === 'application/pdf' || fileName.toLowerCase().endsWith('.pdf');
    const isImage = file.type.startsWith('image/') || /\.(png|jpe?g|webp|gif|bmp)$/i.test(fileName);

    // Enforce resource_type = "raw" for PDFs, resource_type = "image" for images
    const resourceType = forcedResourceType || (isPdf ? 'raw' : isImage ? 'image' : 'raw');
    const endpoint = `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`;

    const formData = new FormData();
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
            const secureUrl = response.secure_url;

            // Audit Log Cloudinary Upload Details
            console.log('==================== CLOUDINARY UPLOAD SUCCESS ====================');
            console.log('uploaded filename:', fileName);
            console.log('public_id:', response.public_id);
            console.log('resource_type:', response.resource_type || resourceType);
            console.log('secure_url:', secureUrl);
            console.log('final URL sent to Gemini:', secureUrl);
            console.log('===================================================================');

            resolve({
              secure_url: secureUrl,
              public_id: response.public_id,
              asset_id: response.asset_id,
              original_filename: response.original_filename || fileName,
              format: response.format || (isPdf ? 'pdf' : 'raw'),
              bytes: response.bytes,
              resource_type: response.resource_type || resourceType,
              documentType: docType,
            });
          } catch (e) {
            console.error('[CloudinaryService Error] Failed to parse Cloudinary upload response JSON:', e);
            reject(new Error('Failed to parse Cloudinary response JSON.'));
          }
        } else {
          try {
            const errorRes = JSON.parse(xhr.responseText);
            console.error('[CloudinaryService Error] Upload rejected by Cloudinary:', errorRes);
            reject(new Error(errorRes.error?.message || `Cloudinary upload failed with status ${xhr.status}`));
          } catch {
            console.error(`[CloudinaryService Error] Upload failed with HTTP status ${xhr.status}`);
            reject(new Error(`Cloudinary upload failed with HTTP status ${xhr.status}`));
          }
        }
      };

      xhr.onerror = () => {
        console.error('[CloudinaryService Error] Network error during direct Cloudinary upload.');
        reject(new Error('Network error during direct Cloudinary upload.'));
      };

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
