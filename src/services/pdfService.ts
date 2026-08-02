// ============================================================
// PDF SERVICE
// Generates a filled government form PDF from reviewed fields.
// Uploads the raw PDF bytes to Cloudinary (resource_type: raw).
// Does NOT perform Supabase writes — that is SubmissionService's job.
// Does NOT auto-download — download is triggered only by user action.
// ============================================================

import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { CloudinaryService } from './cloudinaryService';
import { ExtractedField } from '../types';

// ── Types ──────────────────────────────────────────────────

export interface PDFGenerationResult {
  pdfUrl: string;
  pdfBytes: Uint8Array;
  blobUrl: string;
  submissionId: string;
  isValidPdf: boolean;
  byteSize: number;
}

// ── Text Sanitizer ─────────────────────────────────────────

export function sanitizeTextForPDF(text: string | null | undefined): string {
  if (!text) return '';
  return text
    .replace(/₹/g, 'INR ')
    .replace(/\u20B9/g, 'INR ')
    .replace(/Rs\./gi, 'INR ')
    .replace(/[^\x00-\x7F]/g, (char) => {
      const code = char.charCodeAt(0);
      if (code === 8211 || code === 8212) return '-';
      if (code === 8216 || code === 8217) return "'";
      if (code === 8220 || code === 8221) return '"';
      if (code === 8226) return '*';
      return '';
    });
}

// ── PDF Service ────────────────────────────────────────────

export class PDFService {
  /**
   * Generates a filled PDF from reviewed extracted fields.
   * Uploads to Cloudinary as resource_type: "raw".
   * Returns the Cloudinary URL and raw bytes — does NOT save to Supabase.
   *
   * @param formTitle         - The form document title
   * @param formCode          - Short form identifier code
   * @param extractedFields   - Reviewed and confirmed form fields
   * @param submissionId      - UUID for this submission
   */
  public static async generateAndUploadPDF(
    formTitle: string,
    formCode: string,
    extractedFields: ExtractedField[],
    submissionId: string
  ): Promise<PDFGenerationResult> {
    const pdfDoc = await PDFDocument.create();

    const fontHelvetica     = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontHelveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontCourier       = await pdfDoc.embedFont(StandardFonts.Courier);

    let page = pdfDoc.addPage([595.28, 841.89]); // A4
    const { width, height } = page.getSize();

    // ── Header ────────────────────────────────────────────

    page.drawRectangle({
      x: 30, y: height - 100,
      width: width - 60, height: 70,
      color: rgb(0.06, 0.09, 0.16),
    });

    page.drawText(sanitizeTextForPDF('GOVERNMENT OF INDIA • OFFICIAL AUTOMATED FORM'), {
      x: 45, y: height - 55, size: 11,
      font: fontHelveticaBold, color: rgb(0.14, 0.72, 0.65),
    });

    page.drawText(sanitizeTextForPDF(formTitle.toUpperCase()), {
      x: 45, y: height - 75, size: 14,
      font: fontHelveticaBold, color: rgb(1, 1, 1),
    });

    page.drawText(
      sanitizeTextForPDF(
        `SUBMISSION: ${submissionId.slice(0, 8).toUpperCase()} | CODE: ${formCode} | DATE: ${new Date().toLocaleDateString('en-IN')}`
      ),
      { x: 45, y: height - 90, size: 8, font: fontCourier, color: rgb(0.8, 0.8, 0.8) }
    );

    // ── Section Header ────────────────────────────────────

    let currentY = height - 130;

    page.drawText(sanitizeTextForPDF(`1. VERIFIED CITIZEN INFORMATION (${extractedFields.length} FIELDS)`), {
      x: 35, y: currentY, size: 10,
      font: fontHelveticaBold, color: rgb(0.15, 0.39, 0.92),
    });

    currentY -= 10;
    page.drawLine({
      start: { x: 35, y: currentY },
      end:   { x: width - 35, y: currentY },
      thickness: 1, color: rgb(0.85, 0.85, 0.85),
    });
    currentY -= 20;

    // ── Field Rows ────────────────────────────────────────

    extractedFields.forEach((field) => {
      if (currentY < 80) {
        page = pdfDoc.addPage([595.28, 841.89]);
        currentY = height - 50;
      }

      page.drawText(sanitizeTextForPDF(`${field.label.toUpperCase()}:`), {
        x: 45, y: currentY, size: 8,
        font: fontHelveticaBold, color: rgb(0.3, 0.3, 0.3),
      });

      page.drawRectangle({
        x: 210, y: currentY - 4,
        width: width - 255, height: 18,
        color: rgb(0.96, 0.97, 0.98),
        borderColor: rgb(0.8, 0.85, 0.9),
        borderWidth: 0.8,
      });

      const displayVal = sanitizeTextForPDF(field.value || '—');
      page.drawText(displayVal, {
        x: 218, y: currentY, size: 9,
        font: fontCourier, color: rgb(0.1, 0.1, 0.1),
      });

      currentY -= 28;
    });

    // ── Footer ────────────────────────────────────────────

    const lastPage = pdfDoc.getPages()[pdfDoc.getPageCount() - 1];

    lastPage.drawRectangle({
      x: 35, y: 35,
      width: width - 70, height: 45,
      color: rgb(0.94, 0.97, 1.0),
      borderColor: rgb(0.7, 0.8, 0.95),
      borderWidth: 1,
    });

    lastPage.drawText(sanitizeTextForPDF('VALIDATED BY GOVERNMENT FORM AI • GEMINI AI MULTIMODAL VISION'), {
      x: 45, y: 62, size: 8,
      font: fontHelveticaBold, color: rgb(0.15, 0.39, 0.92),
    });

    lastPage.drawText(
      sanitizeTextForPDF(`Submission ID: ${submissionId} | Fields: ${extractedFields.length}`),
      { x: 45, y: 46, size: 7, font: fontHelvetica, color: rgb(0.4, 0.4, 0.4) }
    );

    // ── Save & Verify ─────────────────────────────────────

    const rawPdfBytes  = await pdfDoc.save();
    const pdfUint8Array = new Uint8Array(rawPdfBytes);

    const headerSig = new TextDecoder('ascii').decode(pdfUint8Array.slice(0, 5));
    if (headerSig !== '%PDF-') {
      throw new Error('Generated PDF failed %PDF- signature verification.');
    }

    const pdfBlob    = new Blob([pdfUint8Array.buffer as ArrayBuffer], { type: 'application/pdf' });
    const localBlobUrl = URL.createObjectURL(pdfBlob);

    // ── Upload to Cloudinary ──────────────────────────────

    let persistentCloudinaryUrl = '';
    try {
      const cloudRes = await CloudinaryService.uploadFile(pdfBlob, undefined, 'raw');
      persistentCloudinaryUrl = cloudRes.secure_url;
    } catch (e) {
      console.warn('[PDFService] Cloudinary upload failed, using local blob:', e);
      persistentCloudinaryUrl = localBlobUrl;
    }

    return {
      pdfUrl:       persistentCloudinaryUrl,
      pdfBytes:     pdfUint8Array,
      blobUrl:      localBlobUrl,
      submissionId,
      isValidPdf:   true,
      byteSize:     pdfBlob.size,
    };
  }

  /**
   * Triggers a browser download of the PDF.
   * Must only be called by an explicit user action (button click).
   */
  public static downloadPDFFile(
    pdfBytes: Uint8Array,
    filename: string = 'Government_Form_AutoFilled.pdf'
  ): void {
    const blob = new Blob([new Uint8Array(pdfBytes).buffer as ArrayBuffer], { type: 'application/pdf' });
    const url  = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href     = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}
