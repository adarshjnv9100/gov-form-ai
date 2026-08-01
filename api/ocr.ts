// ============================================================
// VERCEL SERVERLESS FUNCTION: /api/ocr
// Proxies OCR requests to NVIDIA Kimi K2.6 Vision API.
// The NVIDIA_API_KEY is a server-side environment variable only.
// Never exposes API keys or secrets to the browser.
// ============================================================

import { validateNvidiaConfig, callNvidiaApi, validateServerEnvironment } from './_nvidia';

interface VercelRequest {
  method?: string;
  body: any;
}
interface VercelResponse {
  status(code: number): VercelResponse;
  json(data: any): void;
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
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  // Validate server environment
  validateServerEnvironment();

  // Validate NVIDIA API Key & Model
  const defaultOcrModel = process.env.NVIDIA_MODEL || 'moonshotai/kimi-k2.6-vision';
  const { config, error } = validateNvidiaConfig(defaultOcrModel);

  if (error || !config) {
    return res.status(400).json({
      success: false,
      message: error || 'OCR service is not configured on the server. Missing process.env.NVIDIA_API_KEY.',
    });
  }

  const { documentUrl } = req.body || {};
  if (!documentUrl || typeof documentUrl !== 'string') {
    return res.status(400).json({
      success: false,
      message: 'documentUrl is required and must be a valid string.',
    });
  }

  const nvidiaRes = await callNvidiaApi(
    config.apiKey,
    config.model,
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

  if (!nvidiaRes.success || !nvidiaRes.content) {
    return res.status(400).json({
      success: false,
      message: nvidiaRes.message || 'Failed to perform OCR with NVIDIA provider.',
    });
  }

  const rawText = nvidiaRes.content;
  const cleanJsonText = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();

  let parsed: Record<string, any> = {};
  try {
    parsed = JSON.parse(cleanJsonText);
  } catch {
    console.warn('[api/ocr] JSON parse failed on raw text snippet:', cleanJsonText.slice(0, 200));
  }

  return res.status(200).json({
    success: true,
    rawText,
    parsed,
  });
}
