// ============================================================
// VERCEL SERVERLESS FUNCTION: /api/ocr
// Kimi Vision OCR Endpoint using lib/kimi.ts
// Receives { documentUrl }, calls Kimi Vision API directly on Cloudinary URL.
// Logs: Cloudinary URL, Model, Prompt, Payload, HTTP Status, Response Time,
// Raw Response, Parsed JSON.
// Returns descriptive error JSON if parsing or API call fails.
// Never silently returns empty JSON.
// ============================================================

import { callKimiVision } from '../lib/kimi.js';

interface VercelRequest {
  method?: string;
  body: any;
}
interface VercelResponse {
  status(code: number): VercelResponse;
  json(data: any): void;
  setHeader(name: string, value: string): void;
  end(): void;
}

const DEFAULT_CANONICAL_SCHEMA = {
  full_name: null,
  father_name: null,
  mother_name: null,
  date_of_birth: null,
  gender: null,
  marital_status: null,
  aadhaar_number: null,
  pan_number: null,
  passport_number: null,
  driving_license_number: null,
  voter_id: null,
  mobile_number: null,
  email: null,
  address: null,
  city: null,
  district: null,
  state: null,
  country: null,
  pincode: null,
  bank_name: null,
  bank_account_number: null,
  ifsc_code: null,
  branch_name: null,
  annual_income: null,
  occupation: null,
  emergency_contact: null,
};

const SYSTEM_PROMPT = `You are a Senior AI Multimodal Document Parser specializing in Indian government documents (Aadhaar, PAN, Passport, Driving Licence, Voter ID, Bank Passbook, Tax Returns).
Analyze the uploaded document image and extract values for all visible fields.

You MUST return ONLY a raw valid JSON object matching this exact 26-field schema:
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
1. Extract explicit values present in the document.
2. Every field NOT present in the document MUST be set to null.
3. NEVER return empty strings (""). If a value is empty or not found, set it to null.
4. NEVER return markdown code fences (like \`\`\`json), explanations, preambles, or postscripts.
5. Return ONLY the single JSON object.`;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const { documentUrl } = req.body || {};

  if (!documentUrl || typeof documentUrl !== 'string' || documentUrl.trim() === '') {
    return res.status(400).json({
      success: false,
      error: "Payload verification failed: 'documentUrl' must be a non-empty string.",
    });
  }

  const response = await callKimiVision(documentUrl, SYSTEM_PROMPT);

  // Return descriptive error if processing failed — never silently return empty JSON
  if (!response.success || !response.parsed) {
    const statusCode = response.statusCode && response.statusCode >= 400 && response.statusCode < 600
      ? response.statusCode
      : 500;

    return res.status(statusCode).json({
      success: false,
      error: response.error || 'Failed to extract text from document using Kimi Vision API.',
      rawText: response.rawText || null,
      statusCode,
    });
  }

  const extracted = response.parsed;
  const resultSchema: Record<string, any> = {};
  const canonicalKeys = Object.keys(DEFAULT_CANONICAL_SCHEMA) as Array<keyof typeof DEFAULT_CANONICAL_SCHEMA>;

  for (const key of canonicalKeys) {
    const val = extracted[key];
    if (val === null || val === undefined || val === '' || String(val).trim() === '' || String(val).trim().toLowerCase() === 'null') {
      resultSchema[key] = null;
    } else {
      resultSchema[key] = typeof val === 'string' ? val.trim() : val;
    }
  }

  return res.status(200).json(resultSchema);
}
