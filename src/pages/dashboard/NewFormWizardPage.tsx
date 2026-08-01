// ============================================================
// NEW FORM WIZARD PAGE
// 5-step wizard: Upload Form → Upload Docs → AI Processing →
// Review & Edit → Download PDF
// ============================================================

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Stepper } from '../../components/ui/Stepper';
import { FileUploader } from '../../components/ui/FileUploader';
import { ExtractedFieldsTable } from '../../components/forms/ExtractedFieldsTable';
import { useFormWorkflow } from '../../context/FormWorkflowContext';
import { useToast } from '../../context/ToastContext';
import { Button } from '../../components/ui/Button';
import { useAI } from '../../hooks/useAI';
import { useAuth } from '../../context/AuthContext';
import { PDFService, PDFGenerationResult } from '../../services/pdfService';
import { PDFViewerModal } from '../../components/document/PDFViewerModal';
import { AIAssistantPanel } from '../../components/ai/AIAssistantPanel';
import { NemotronService, NemotronRecommendationResponse, RecommendedDocumentItem } from '../../services/nemotronService';
import { upsertSubmission, upsertForm, createDraftSubmission } from '../../services/submissionService';
import { computeConfidenceScore, computeCompletionPercentage, ExtractedField, UploadedFile } from '../../types';
import {
  Cpu, CheckCircle2, ArrowRight, ArrowLeft, Download,
  RefreshCw, FileText, AlertCircle, Eye, Bot, Sparkles, Layers,
} from 'lucide-react';
import confetti from 'canvas-confetti';

// ── Batch Progress State ───────────────────────────────────

interface BatchStatus {
  currentIndex: number;
  totalFiles: number;
  currentFileName: string;
  mergedCountThisFile: number;
  totalBatchMerged: number;
  isBatchProcessing: boolean;
}

// ── Component ──────────────────────────────────────────────

export const NewFormWizardPage: React.FC = () => {
  const {
    currentStep,
    setCurrentStep,
    activeSubmissionId,
    startNewSubmission,
    formFile,
    setFormFile,
    supportingFiles,
    addSupportingFile,
    extractedFields,
    setExtractedFields,
    updateExtractedField,
    mergeExtractedFieldsMap,
    addSubmission,
    resetWorkflow,
  } = useFormWorkflow();

  const { user }                                    = useAuth();
  const { isProcessing, progress, error, processDocument, retryProcessing } = useAI();
  const { addToast }                                = useToast();

  const [activeFields,           setActiveFields]           = useState<ExtractedField[]>(extractedFields);
  const [pdfResult,              setPdfResult]              = useState<PDFGenerationResult | null>(null);
  const [isGeneratingPdf,        setIsGeneratingPdf]        = useState(false);
  const [showPreviewModal,       setShowPreviewModal]       = useState(false);
  const [recommendationsData,    setRecommendationsData]    = useState<NemotronRecommendationResponse | null>(null);
  const [activeTargetRec,        setActiveTargetRec]        = useState<RecommendedDocumentItem | null>(null);
  const [batchStatus,            setBatchStatus]            = useState<BatchStatus | null>(null);

  // Sync local state whenever context fields change
  useEffect(() => {
    setActiveFields(extractedFields);
  }, [extractedFields]);

  // Refresh Nemotron recommendations whenever we land on Step 4
  useEffect(() => {
    if (currentStep === 4 && activeFields.length > 0) {
      refreshNemotronRecommendations(activeFields);
    }
  }, [currentStep]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Nemotron Recommendations ───────────────────────────────

  const refreshNemotronRecommendations = async (currentFields: ExtractedField[]) => {
    const missingKeys  = currentFields.filter((f) => !f.value || f.value.trim() === '').map((f) => f.key);
    const uploadedNames = [formFile?.name, ...supportingFiles.map((s) => s.name)].filter(Boolean) as string[];

    const recRes = await NemotronService.getDocumentRecommendations({
      missing_fields:     missingKeys,
      uploaded_documents: uploadedNames,
    });

    setRecommendationsData(recRes);
  };

  // ── Recommendation Selection ───────────────────────────────

  const handleSelectRecommendationToUpload = (rec: RecommendedDocumentItem) => {
    setActiveTargetRec(rec);
    setCurrentStep(2);
    addToast('AI Recommendation Active', `Please upload ${rec.document} to auto-fill missing fields.`, 'info');
  };

  // ── Sequential Batch Upload Processing ────────────────────

  const handleProcessBatchUploadedFiles = async (files: UploadedFile[]) => {
    if (files.length === 0) return;

    setCurrentStep(3);
    setBatchStatus({
      currentIndex:      1,
      totalFiles:        files.length,
      currentFileName:   files[0].name,
      mergedCountThisFile: 0,
      totalBatchMerged:  0,
      isBatchProcessing: true,
    });

    let totalMerged = 0;
    let currentFieldsState: ExtractedField[] = [...activeFields];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      setBatchStatus({
        currentIndex:      i + 1,
        totalFiles:        files.length,
        currentFileName:   file.name,
        mergedCountThisFile: 0,
        totalBatchMerged:  totalMerged,
        isBatchProcessing: true,
      });

      const res = await processDocument(file.id, file.url, activeSubmissionId);

      if (res && res.structured) {
        const { mergedFields, updatedCount, successfulNormalizationsCount } = await mergeExtractedFieldsMap(
          res.structured as unknown as Record<string, string>,
          file,
          res.rawOcrText
        );

        currentFieldsState = mergedFields;
        totalMerged += updatedCount;

        setBatchStatus({
          currentIndex:      i + 1,
          totalFiles:        files.length,
          currentFileName:   file.name,
          mergedCountThisFile: updatedCount,
          totalBatchMerged:  totalMerged,
          isBatchProcessing: true,
        });

        if (updatedCount > 0) {
          addToast(
            `File ${i + 1}/${files.length} Processed`,
            `${file.name}: Merged ${updatedCount} field(s).`,
            'success'
          );
        } else if (successfulNormalizationsCount === 0) {
          addToast(
            `File ${i + 1}/${files.length} Note`,
            'No information could be extracted from this document.',
            'warning'
          );
        }
      } else {
        // OCR returned null (error) — keep previous fields, show warning
        addToast(
          `File ${i + 1}/${files.length} Failed`,
          `Could not extract data from ${file.name}. Previous fields preserved.`,
          'warning'
        );
      }
    }

    setActiveFields(currentFieldsState);
    await refreshNemotronRecommendations(currentFieldsState);
    setActiveTargetRec(null);
    setBatchStatus(null);
    setCurrentStep(4);

    const completionPct = computeCompletionPercentage(currentFieldsState);
    addToast(
      'Batch Upload Completed!',
      `Processed ${files.length} file(s) • Merged: ${totalMerged} field(s) • Completion: ${completionPct}%`,
      'success'
    );
  };

  const handleStartAIProcessing = async () => {
    if (supportingFiles.length > 0) {
      await handleProcessBatchUploadedFiles(supportingFiles);
    } else if (formFile) {
      await handleProcessBatchUploadedFiles([formFile]);
    }
  };

  // ── Field Edit Save ────────────────────────────────────────

  const handleSaveFieldValue = (id: string, newValue: string) => {
    updateExtractedField(id, newValue);
    setActiveFields((prev) => {
      const updated = prev.map((field) =>
        field.id === id ? { ...field, value: newValue, isEdited: true, isMissing: !newValue.trim() } : field
      );
      refreshNemotronRecommendations(updated);
      return updated;
    });
  };

  // ── Generate PDF ───────────────────────────────────────────

  const handleFinishAndGenerate = async () => {
    setIsGeneratingPdf(true);
    const formTitle = formFile?.name.replace(/\.[^/.]+$/, '') || 'Government Form Auto-Fill';
    const formCode  = 'GOV-AUTO-2026';

    try {
      // 1. Ensure parent submission exists in Supabase
      if (user?.id) {
        await createDraftSubmission(activeSubmissionId, user.id, formTitle, formCode);
      }

      // 2. Generate & upload PDF to Cloudinary
      const res = await PDFService.generateAndUploadPDF(
        formTitle,
        formCode,
        activeFields,
        activeSubmissionId
      );

      setPdfResult(res);

      // 2. Persist submission to Supabase (real confidence score, real file count)
      if (user?.id) {
        const confidenceScore  = computeConfidenceScore(activeFields);
        const supportingCount  = supportingFiles.length + 1; // +1 for the form itself

        await upsertSubmission({
          id:                  activeSubmissionId,
          userId:              user.id,
          formTitle,
          formCode,
          status:              'COMPLETED',
          extractedFields:     activeFields,
          pdfUrl:              res.pdfUrl,
          supportingFilesCount: supportingCount,
        });

        await upsertForm({
          submissionId:        activeSubmissionId,
          userId:              user.id,
          formTitle,
          formCode,
          status:              'COMPLETED',
          extractedFields:     activeFields,
          pdfUrl:              res.pdfUrl,
          supportingFilesCount: supportingCount,
        });
      }

      // 3. Update local submissions list
      await addSubmission({
        id:                  activeSubmissionId,
        submissionId:        activeSubmissionId,
        formTitle,
        formCode,
        createdAt:           new Date().toISOString(),
        status:              'COMPLETED',
        extractedFields:     activeFields,
        pdfUrl:              res.pdfUrl,
        supportingFilesCount: supportingFiles.length + 1,
        confidenceScore:     computeConfidenceScore(activeFields),
      });

      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      setCurrentStep(5);
      addToast('PDF Generated!', `Submission ${activeSubmissionId.slice(0, 8)} saved to Supabase.`, 'success');
    } catch (err: any) {
      addToast('PDF Generation Failed', err?.message || 'Error compiling PDF form.', 'error');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // ── Download Handler ───────────────────────────────────────

  const handleDownloadGenerated = () => {
    if (pdfResult?.pdfBytes) {
      PDFService.downloadPDFFile(
        pdfResult.pdfBytes,
        `${formFile?.name.replace(/\.[^/.]+$/, '') || 'Form'}_${activeSubmissionId.slice(0, 6)}.pdf`
      );
    }
  };

  // ── Metrics ────────────────────────────────────────────────

  const completedCount   = activeFields.filter((f) => f.value && f.value.trim() !== '').length;
  const totalFieldCount  = activeFields.length;
  const fileSizeDisplay  = pdfResult ? `${(pdfResult.byteSize / 1024).toFixed(1)} KB` : '—';

  // ── Render ─────────────────────────────────────────────────

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-extrabold text-slate-900">New Form Auto-Fill Stepper</h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-100 text-blue-800 border border-blue-200">
              ID: {activeSubmissionId.slice(0, 8)}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Upload your government form and supporting documents for AI-powered auto-fill.
          </p>
        </div>

        {currentStep > 1 && currentStep < 5 && (
          <Button onClick={resetWorkflow} variant="ghost" size="sm">
            Reset Wizard
          </Button>
        )}
      </div>

      {/* Stepper Header */}
      <Stepper currentStep={currentStep} onStepClick={(s) => setCurrentStep(s)} />

      {/* Step Content */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 md:p-10 shadow-sm min-h-[420px] flex flex-col justify-between">
        <AnimatePresence mode="wait">

          {/* ── STEP 1: UPLOAD GOVERNMENT FORM ─────────────────── */}
          {currentStep === 1 && (
            <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Step 1: Upload Government Form PDF</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Upload the official blank or partially-filled government form template.
                </p>
              </div>

              <FileUploader
                title="Select Government Form Template (PDF, PNG, JPEG, JPG)"
                docType="GOVERNMENT_FORM"
                allowMultiple={false}
                onUploadSuccess={(file) => setFormFile({ ...file, submissionId: activeSubmissionId })}
              />

              <div className="flex justify-end pt-4 border-t border-slate-100">
                <Button disabled={!formFile} onClick={() => setCurrentStep(2)} rightIcon={<ArrowRight className="w-4 h-4" />}>
                  Continue to Step 2
                </Button>
              </div>
            </motion.div>
          )}

          {/* ── STEP 2: UPLOAD SUPPORTING DOCUMENTS ────────────── */}
          {currentStep === 2 && (
            <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Step 2: Upload Supporting Documents</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Attach multiple identity proofs (Aadhaar, PAN, Passport, Bank Passbook, etc.) simultaneously.
                </p>
              </div>

              {/* AI Recommendation Banner */}
              {activeTargetRec && (
                <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-900 to-indigo-900 text-white flex items-center gap-3 border border-blue-700 shadow-md">
                  <Bot className="w-6 h-6 text-teal-400 animate-pulse flex-shrink-0" />
                  <div>
                    <h4 className="text-xs font-bold text-teal-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" /> AI Recommendation Active
                    </h4>
                    <p className="text-xs text-slate-200 mt-0.5">
                      Please upload <span className="font-bold underline text-white">{activeTargetRec.document}</span> to auto-fill:{' '}
                      <span className="font-mono text-teal-200">{activeTargetRec.fills.map((f) => f.replace(/_/g, ' ')).join(', ')}</span>.
                    </p>
                  </div>
                </div>
              )}

              <FileUploader
                title={activeTargetRec ? `Upload ${activeTargetRec.document}` : 'Upload Supporting Proofs (Drag & Drop or Select Multiple Files)'}
                docType="AADHAAR"
                allowMultiple={true}
                onBatchUploadSuccess={async (files) => {
                  const uploadedFiles = files.map((f) => ({ ...f, submissionId: activeSubmissionId }));
                  uploadedFiles.forEach((uf) => addSupportingFile(uf));
                  await handleProcessBatchUploadedFiles(uploadedFiles);
                }}
              />

              {supportingFiles.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-slate-700 uppercase flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-blue-600" /> Attached Supporting Proofs ({supportingFiles.length})
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {supportingFiles.map((f, idx) => (
                      <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs font-semibold">
                        <span className="truncate max-w-[200px]">{f.name}</span>
                        <span className="text-emerald-600 font-bold">Uploaded</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-between pt-4 border-t border-slate-100">
                <Button onClick={() => setCurrentStep(1)} variant="outline" leftIcon={<ArrowLeft className="w-4 h-4" />}>
                  Back
                </Button>
                <Button onClick={handleStartAIProcessing} variant="teal" rightIcon={<Cpu className="w-4 h-4" />}>
                  Process All Files with AI
                </Button>
              </div>
            </motion.div>
          )}

          {/* ── STEP 3: BATCH AI PROCESSING ─────────────────────── */}
          {currentStep === 3 && (
            <motion.div key="step3" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="py-12 text-center space-y-6 max-w-lg mx-auto">
              {!error ? (
                <>
                  <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-blue-600 to-teal-500 text-white flex items-center justify-center mx-auto shadow-glow animate-bounce">
                    <Cpu className="w-10 h-10 animate-spin" />
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-xl font-extrabold text-slate-900">AI Extraction in Progress</h3>
                    {batchStatus ? (
                      <p className="text-xs font-bold text-blue-600 font-mono">
                        Processing File {batchStatus.currentIndex} / {batchStatus.totalFiles}: {batchStatus.currentFileName}
                      </p>
                    ) : (
                      <p className="text-xs font-medium text-blue-600">
                        Processing submission <span className="font-mono">{activeSubmissionId.slice(0, 8)}</span>...
                      </p>
                    )}
                  </div>

                  {batchStatus && (
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs font-mono space-y-2 text-left">
                      <div className="flex justify-between text-slate-700 font-bold">
                        <span>Canonical Mapping:</span>
                        <span className="text-emerald-600">Active</span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>Merged in File {batchStatus.currentIndex}:</span>
                        <span className="font-bold text-blue-600">{batchStatus.mergedCountThisFile} Fields</span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>Total Batch Merged:</span>
                        <span className="font-bold text-teal-600">{batchStatus.totalBatchMerged} Fields</span>
                      </div>
                    </div>
                  )}

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-slate-500 font-bold">
                      <span>Progress</span><span>{progress}%</span>
                    </div>
                    <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200">
                      <div className="h-full bg-gradient-to-r from-blue-600 to-teal-400 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                </>
              ) : (
                <div className="space-y-4 bg-rose-50 p-6 rounded-2xl border border-rose-200">
                  <AlertCircle className="w-12 h-12 text-rose-600 mx-auto" />
                  <h3 className="text-base font-bold text-rose-900">Extraction Error</h3>
                  <p className="text-xs text-rose-700">{error}</p>
                  <p className="text-xs text-slate-500">Your previously extracted fields have been preserved.</p>
                  <div className="flex gap-3 justify-center">
                    <Button onClick={retryProcessing} variant="danger" leftIcon={<RefreshCw className="w-4 h-4" />}>
                      Retry Processing
                    </Button>
                    <Button onClick={() => setCurrentStep(4)} variant="outline">
                      Continue to Review
                    </Button>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* ── STEP 4: REVIEW & EDIT ───────────────────────────── */}
          {currentStep === 4 && (
            <motion.div key="step4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Step 4: Review & Edit Extracted Form Fields</h3>
                <p className="text-xs text-slate-500 mt-1">
                  AI Assistant recommends documents to auto-fill missing fields. Edit any values before generating PDF.
                </p>
              </div>

              <AIAssistantPanel
                submissionId={activeSubmissionId}
                recommendationsData={recommendationsData}
                totalRequiredCount={totalFieldCount || 26}
                completedCount={completedCount}
                onSelectRecommendationToUpload={handleSelectRecommendationToUpload}
              />

              <ExtractedFieldsTable
                fields={activeFields}
                onSaveField={handleSaveFieldValue}
                onConfirmAll={handleFinishAndGenerate}
              />

              <div className="flex justify-between pt-4 border-t border-slate-100">
                <Button onClick={() => setCurrentStep(2)} variant="outline" leftIcon={<ArrowLeft className="w-4 h-4" />}>
                  Back to Uploads
                </Button>
              </div>
            </motion.div>
          )}

          {/* ── STEP 5: DOWNLOAD & PREVIEW ──────────────────────── */}
          {currentStep === 5 && (
            <motion.div key="step5" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="py-8 text-center space-y-6 max-w-xl mx-auto">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div>
                <h2 className="text-2xl font-extrabold text-slate-900">Form Submission Completed!</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Submission ID: <span className="font-mono font-bold text-slate-800">{activeSubmissionId}</span>
                </p>
              </div>

              <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 text-left space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                  <span className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-600" />
                    {formFile?.name || 'Government_Form_AutoFilled.pdf'}
                  </span>
                  <span className="text-emerald-600">{fileSizeDisplay}</span>
                </div>
                <div className="text-[11px] text-slate-500 space-y-1 font-mono">
                  <p>Submission UUID: {activeSubmissionId}</p>
                  <p>Fields Completed: {completedCount} / {totalFieldCount}</p>
                  <p>Confidence Score: {computeConfidenceScore(activeFields)}%</p>
                  <p>Database: Supabase PostgreSQL (submissions &amp; forms tables)</p>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <Button onClick={() => setShowPreviewModal(true)} variant="outline" size="lg" leftIcon={<Eye className="w-5 h-5" />}>
                  View PDF
                </Button>
                <Button onClick={handleDownloadGenerated} variant="primary" size="lg" leftIcon={<Download className="w-5 h-5" />}>
                  Download PDF
                </Button>
                <Button onClick={resetWorkflow} variant="ghost" leftIcon={<RefreshCw className="w-4 h-4" />}>
                  Process Another Form
                </Button>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* PDF Modal */}
      <PDFViewerModal
        isOpen={showPreviewModal}
        onClose={() => setShowPreviewModal(false)}
        title={formFile?.name || 'Filled Government Form PDF'}
        pdfUrl={pdfResult?.pdfUrl}
        pdfBytes={pdfResult?.pdfBytes}
      />
    </div>
  );
};
