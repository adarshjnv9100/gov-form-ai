export interface CloudinaryUploadResponse {
  secure_url: string;
  public_id: string;
  format: string;
  bytes: number;
}

export async function uploadToCloudinary(
  file: File,
  onProgress?: (progress: number) => void
): Promise<CloudinaryUploadResponse> {
  return new Promise((resolve) => {
    let currentProgress = 0;
    const interval = setInterval(() => {
      currentProgress += 20;
      if (onProgress) onProgress(currentProgress);

      if (currentProgress >= 100) {
        clearInterval(interval);
        const fileUrl = URL.createObjectURL(file);
        resolve({
          secure_url: fileUrl,
          public_id: `gov_form_doc_${Date.now()}_${file.name.replace(/\s+/g, '_')}`,
          format: file.name.split('.').pop() || 'pdf',
          bytes: file.size,
        });
      }
    }, 150);
  });
}
