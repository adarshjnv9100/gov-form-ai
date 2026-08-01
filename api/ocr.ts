// ============================================================
// VERCEL SERVERLESS FUNCTION: /api/ocr
// Proxies OCR requests to NVIDIA Kimi K2.6 Vision API.
// The NVIDIA_API_KEY is a server-side environment variable only.
// Never exposes API keys or secrets to the browser.
// Includes full audit logging & payload validation.
// ============================================================

import { validateEnvironment } from './_config';
import { callNvidiaClient } from './_nvidia';

interface VercelRequest {
  method?: string;
  body: any;
  headers?: any;
}
interface VercelResponse {
  status(code: number): VercelResponse;
  json(data: any): void;
  setHeader(name: string, value: string): void;
  end(): void;
}

const SYSTEM_PROMPT = `You are a Senior AI Multimodal Document Parser specializing in Indian government documents.
Analyze the uploaded document image and extract values for all required government form fields.

Return ONLY valid JSON matching this exact schema (use null for any field not found in the document):
{
  "full_name": null,
  "father_name": null,
  "mother_name": null,
  "date_of_birth": null,
  "gender": null,
  "marital_status": null,
  "aadhaar_number": null,
  "pan_number": null,
  "passport_number": null,
  "driving_license_number": null,
  "voter_id": null,
  "mobile_number": null,
  "email": null,
  "address": null,
  "city": null,
  "district": null,
  "state": null,
  "country": null,
  "pincode": null,
  "bank_name": null,
  "bank_account_number": null,
  "ifsc_code": null,
  "branch_name": null,
  "annual_income": null,
  "occupation": null,
  "emergency_contact": null
}

RULES:
- If a field is not visible in the document, set it to null.
- Never guess or invent values. Only extract what is explicitly shown.
- Return only the JSON object with no markdown fences or extra text.`;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  // 1. Startup Environment Validation (HTTP 500 if missing)
  const envResult = validateEnvironment();
  if (!envResult.isValid) {
    console.error('[api/ocr] Missing required environment variables:', envResult.missing);
    return res.status(500).json({
      success: false,
      missing: envResult.missing,
      message: 'Missing required environment variables.',
    });
  }

  const { config } = envResult;
  const body = req.body || {};
  const submissionId = body.submissionId || req.headers?.['x-submission-id'] || 'N/A';

  // Audit Log: Incoming request & Submission ID
  console.log(`[api/ocr Audit Log] Incoming OCR request. Submission ID: ${submissionId}`);

  // 2. Verify Payload: body MUST contain documentUrl
  const wrongKeys = ['url', 'image', 'file', 'pdf', 'cloudinaryUrl'].filter((k) => k in body);
  if (!body.documentUrl || typeof body.documentUrl !== 'string' || body.documentUrl.trim() === '') {
    const errorMsg = wrongKeys.length > 0
      ? `Payload must contain 'documentUrl' as a non-empty string. (Found incorrect property '${wrongKeys[0]}' in payload).`
      : "Payload must contain 'documentUrl' as a non-empty string.";
    console.error(`[api/ocr Audit Log] Payload verification failed: ${errorMsg}`);
    return res.status(400).json({
      success: false,
      message: errorMsg,
    });
  }

  const documentUrl = body.documentUrl.trim();
  const ocrModel = config.NVIDIA_MODEL || 'moonshotai/kimi-k2.6-vision';

  // Audit Log: Cloudinary URL & Model
  console.log(`[api/ocr Audit Log] Cloudinary URL (documentUrl): ${documentUrl}`);
  console.log(`[api/ocr Audit Log] Model: ${ocrModel}`);

  // 3. Call Shared NVIDIA API Client
  const nvidiaRes = await callNvidiaClient(
    config.NVIDIA_API_KEY,
    ocrModel,
    [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: documentUrl } },
          { type: 'text', text: 'Extract all visible fields from this government document into the JSON schema.' },
        ],
      },
    ],
    0.1,
    1024
  );

  // Audit Log: Response time & NVIDIA response status
  console.log(`[api/ocr Audit Log] NVIDIA Response Time: ${nvidiaRes.durationMs}ms`);

  if (!nvidiaRes.success || !nvidiaRes.content) {
    console.error(`[api/ocr Audit Log] NVIDIA processing failed: ${nvidiaRes.message}`);
    return res.status(400).json({
      success: false,
      message: nvidiaRes.message || 'Failed to perform OCR with NVIDIA provider.',
      parseError: nvidiaRes.parseError,
    });
  }

  const rawText = nvidiaRes.content;
  console.log(`[api/ocr Audit Log] NVIDIA Raw Response: ${rawText.slice(0, 300)}`);

  const cleanJsonText = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();

  let parsed: Record<string, any> = {};
  let jsonParseError: string | null = null;

  try {
    parsed = JSON.parse(cleanJsonText);
    // Audit Log: Parsed JSON
    console.log(`[api/ocr Audit Log] Parsed JSON Response successfully:`, JSON.stringify(parsed));
  } catch (err: any) {
    jsonParseError = `JSON parse failed on extracted AI response: ${err?.message || String(err)}`;
    console.error(`[api/ocr Audit Log] ${jsonParseError}. Raw text:`, cleanJsonText.slice(0, 300));
    // Requirement 3: Never silently swallow JSON parsing failures. Return explicit error!
    return res.status(422).json({
      success: false,
      message: jsonParseError,
      rawText,
    });
  }

  return res.status(200).json({
    success: true,
    documentUrl,
    model: ocrModel,
    responseTimeMs: nvidiaRes.durationMs,
    submissionId,
    rawText,
    parsed,
  });
}
