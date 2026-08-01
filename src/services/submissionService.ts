// ============================================================
// SUBMISSION SERVICE
// Single source of truth for all Supabase write operations
// related to submissions, forms, and extracted data.
// Computes real confidence scores — never uses hardcoded values.
// ============================================================

import { supabase } from '../lib/supabase';
import { ExtractedField, computeConfidenceScore } from '../types';

// ── Upsert Submission ─────────────────────────────────────

export interface UpsertSubmissionParams {
  id: string;
  userId: string;
  formTitle: string;
  formCode: string;
  status: 'DRAFT' | 'PROCESSING' | 'COMPLETED' | 'REJECTED';
  extractedFields: ExtractedField[];
  pdfUrl?: string;
  supportingFilesCount: number;
}

export async function upsertSubmission(params: UpsertSubmissionParams): Promise<void> {
  const confidenceScore = computeConfidenceScore(params.extractedFields);
  const timestamp = new Date().toISOString();

  const { error } = await supabase.from('submissions').upsert(
    {
      id:                     params.id,
      user_id:                params.userId,
      form_title:             params.formTitle,
      form_code:              params.formCode,
      status:                 params.status,
      confidence_score:       confidenceScore,
      supporting_files_count: params.supportingFilesCount,
      pdf_url:                params.pdfUrl || null,
      updated_at:             timestamp,
    },
    { onConflict: 'id' }
  );

  if (error) {
    console.warn('[SubmissionService] upsertSubmission error:', error.message);
    throw error;
  }
}

// ── Upsert Form ───────────────────────────────────────────

export interface UpsertFormParams {
  submissionId: string;
  userId: string;
  formTitle: string;
  formCode: string;
  status: 'DRAFT' | 'PROCESSING' | 'COMPLETED' | 'REJECTED';
  extractedFields: ExtractedField[];
  rawOcrText?: string;
  pdfUrl?: string;
  supportingFilesCount: number;
}

export async function upsertForm(params: UpsertFormParams): Promise<void> {
  const confidenceScore = computeConfidenceScore(params.extractedFields);
  const timestamp = new Date().toISOString();

  const { error } = await supabase.from('forms').upsert(
    {
      id:                     `form_${params.submissionId}`,
      submission_id:          params.submissionId,
      user_id:                params.userId,
      form_title:             params.formTitle,
      form_code:              params.formCode,
      status:                 params.status,
      extracted_fields:       params.extractedFields,
      raw_ocr_text:           params.rawOcrText || null,
      supporting_files_count: params.supportingFilesCount,
      confidence_score:       confidenceScore,
      pdf_url:                params.pdfUrl || null,
      updated_at:             timestamp,
    },
    { onConflict: 'id' }
  );

  if (error) {
    console.warn('[SubmissionService] upsertForm error:', error.message);
    throw error;
  }
}

// ── Insert Extracted Data ─────────────────────────────────

export interface InsertExtractedDataParams {
  submissionId: string;
  userId: string;
  documentId: string;
  jsonData: Record<string, string>;
}

export async function insertExtractedData(params: InsertExtractedDataParams): Promise<void> {
  const recordId = `ext_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  const { error } = await supabase.from('extracted_data').insert({
    id:            recordId,
    submission_id: params.submissionId,
    user_id:       params.userId,
    document_id:   params.documentId,
    json_data:     params.jsonData,
    created_at:    new Date().toISOString(),
  });

  if (error) {
    // Non-critical: log but do not throw
    console.warn('[SubmissionService] insertExtractedData error:', error.message);
  }
}

// ── Update Merged Fields ──────────────────────────────────

export interface UpdateMergedFieldsParams {
  submissionId: string;
  updatedFields: ExtractedField[];
  rawOcrText?: string;
}

export async function updateMergedFields(params: UpdateMergedFieldsParams): Promise<void> {
  const confidenceScore = computeConfidenceScore(params.updatedFields);
  const timestamp = new Date().toISOString();

  await supabase
    .from('forms')
    .update({
      extracted_fields: params.updatedFields,
      raw_ocr_text:     params.rawOcrText || null,
      confidence_score: confidenceScore,
      updated_at:       timestamp,
    })
    .eq('submission_id', params.submissionId);

  await supabase
    .from('submissions')
    .update({
      confidence_score: confidenceScore,
      updated_at:       timestamp,
    })
    .eq('id', params.submissionId);
}
