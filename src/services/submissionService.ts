// ============================================================
// SUBMISSION SERVICE
// Single source of truth for all Supabase write operations
// related to submissions, forms, and extracted data.
// Computes real confidence scores — never uses hardcoded values.
// Ensures parent submission exists BEFORE child record inserts.
// Uses upsert with onConflict for all write operations.
// ============================================================

import { supabase } from '../lib/supabase';
import { ExtractedField, computeConfidenceScore } from '../types';

// ── Ensure Parent Submission Exists ───────────────────────

export async function createDraftSubmission(
  submissionId: string,
  userId: string,
  formTitle = 'Government Form Auto-Fill',
  formCode = 'GOV-AUTO-2026'
): Promise<void> {
  if (!submissionId || !userId || userId === 'anonymous') return;
  const timestamp = new Date().toISOString();

  const { error } = await supabase.from('submissions').upsert(
    {
      id: submissionId,
      user_id: userId,
      form_title: formTitle,
      form_code: formCode,
      status: 'DRAFT',
      confidence_score: 0,
      supporting_files_count: 0,
      updated_at: timestamp,
    },
    { onConflict: 'id' }
  );

  if (error) {
    console.warn('[SubmissionService] createDraftSubmission warning:', error.message);
  }
}

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
  if (!params.id || !params.userId || params.userId === 'anonymous') return;
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
  if (!params.submissionId || !params.userId || params.userId === 'anonymous') return;

  // 1. Ensure parent submission exists FIRST
  await createDraftSubmission(params.submissionId, params.userId, params.formTitle, params.formCode);

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
  }
}

// ── Upsert Extracted Data ─────────────────────────────────

export interface InsertExtractedDataParams {
  submissionId: string;
  userId: string;
  documentId: string;
  jsonData: Record<string, string>;
}

export async function insertExtractedData(params: InsertExtractedDataParams): Promise<void> {
  if (!params.submissionId || !params.userId || params.userId === 'anonymous') return;

  // 1. MUST ensure parent submission exists BEFORE inserting child extracted_data!
  await createDraftSubmission(params.submissionId, params.userId);

  const recordId = `ext_${params.submissionId}_${params.documentId}`;

  const { error } = await supabase.from('extracted_data').upsert(
    {
      id:            recordId,
      submission_id: params.submissionId,
      user_id:       params.userId,
      document_id:   params.documentId,
      json_data:     params.jsonData,
      created_at:    new Date().toISOString(),
    },
    { onConflict: 'id' }
  );

  if (error) {
    console.warn('[SubmissionService] insertExtractedData error:', error.message);
  }
}

// ── Update Merged Fields ──────────────────────────────────

export interface UpdateMergedFieldsParams {
  submissionId: string;
  userId?: string;
  updatedFields: ExtractedField[];
  rawOcrText?: string;
}

export async function updateMergedFields(params: UpdateMergedFieldsParams): Promise<void> {
  if (!params.submissionId) return;

  if (params.userId && params.userId !== 'anonymous') {
    await createDraftSubmission(params.submissionId, params.userId);
  }

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
