// ============================================================
// VERCEL SERVERLESS FUNCTION: /api/ocr
// Gemini 2.5 Flash Multimodal OCR Backend Endpoint.
// Uses official Google Generative AI SDK (@google/genai).
// Receives { documentUrl }, processes image/PDF via Gemini 2.5 Flash.
// Returns validated 26-field canonical JSON with missing fields set to null.
// Never exposes GEMINI_API_KEY to the frontend.
// ============================================================

import { GoogleGenAI } from '@google/genai';

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

const SYSTEM_PROMPT = `You are an expert Indian Government Document OCR Parser using Gemini 2.5 Flash.
Analyze the provided document (Aadhaar Card, PAN Card, Passport, Driving Licence, Voter ID, Bank Passbook, IT Returns) and extract explicit text values.

You MUST return ONLY a JSON object matching this exact 26-field schema:
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

STRICT EXTRACTION RULES:
1. Extract ONLY text explicitly visible in the document image/PDF.
2. NEVER invent, fabricate, guess, or hallucinate values.
3. Every field not clearly present in the document MUST be set to null.
4. NEVER return empty strings (""). Use null for missing or empty fields.
5. Return ONLY the raw valid JSON object. Do NOT include markdown code fences (\`\`\`json), comments, explanations, or additional wrapper keys.`;

function getGeminiApiKey(): string {
  return (
    process.env.GEMINI_API_KEY ||
    process.env.VITE_GEMINI_API_KEY ||
    process.env.NEXT_PUBLIC_GEMINI_API_KEY ||
    ''
  ).trim();
}

/**
 * Downloads document from Cloudinary URL and returns base64 inline data part.
 */
async function fetchDocumentInlinePart(documentUrl: string): Promise<{ inlineData: { data: string; mimeType: string } }> {
  const cleanUrl = documentUrl.trim();

  const response = await fetch(cleanUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch document from Cloudinary URL: HTTP ${response.status} ${response.statusText}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const base64Data = buffer.toString('base64');

  let mimeType = response.headers.get('content-type') || '';
  if (!mimeType || mimeType.includes('text/html') || mimeType.includes('application/octet-stream')) {
    if (cleanUrl.toLowerCase().endsWith('.pdf') || cleanUrl.includes('/raw/upload/')) {
      mimeType = 'application/pdf';
    } else if (cleanUrl.toLowerCase().endsWith('.png')) {
      mimeType = 'image/png';
    } else if (cleanUrl.toLowerCase().endsWith('.webp')) {
      mimeType = 'image/webp';
    } else {
      mimeType = 'image/jpeg';
    }
  }

  return {
    inlineData: {
      data: base64Data,
      mimeType: mimeType.split(';')[0].trim(),
    },
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed. Use POST.' });
  }

  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    console.error('[Gemini OCR Error] GEMINI_API_KEY environment variable is missing.');
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: GEMINI_API_KEY environment variable is not configured on the server.',
    });
  }

  const { documentUrl } = req.body || {};

  if (!documentUrl || typeof documentUrl !== 'string' || documentUrl.trim() === '') {
    return res.status(400).json({
      success: false,
      error: "Invalid Request: 'documentUrl' must be a valid non-empty string.",
    });
  }

  try {
    const inlinePart = await fetchDocumentInlinePart(documentUrl);

    const ai = new GoogleGenAI({ apiKey });

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        inlinePart,
        SYSTEM_PROMPT,
      ],
      config: {
        responseMimeType: 'application/json',
        temperature: 0.1,
      },
    });

    const responseText = response.text || '';

    if (!responseText || !responseText.trim()) {
      return res.status(422).json({
        success: false,
        error: 'Gemini 2.5 Flash returned an empty response content.',
      });
    }

    const cleanJsonText = responseText
      .replace(/```json/gi, '')
      .replace(/```/g, '')
      .trim();

    let parsed: Record<string, any> = {};
    try {
      parsed = JSON.parse(cleanJsonText);
    } catch (parseErr: any) {
      console.error('[Gemini OCR Error] JSON parsing failed:', parseErr, cleanJsonText);
      return res.status(422).json({
        success: false,
        error: `Invalid JSON returned by Gemini 2.5 Flash: ${parseErr?.message}`,
        rawText: cleanJsonText,
      });
    }

    // Validate and enforce canonical 26-field schema
    const validatedResult: Record<string, any> = {};
    const canonicalKeys = Object.keys(DEFAULT_CANONICAL_SCHEMA) as Array<keyof typeof DEFAULT_CANONICAL_SCHEMA>;

    for (const key of canonicalKeys) {
      const val = parsed[key];
      if (
        val === null ||
        val === undefined ||
        val === '' ||
        String(val).trim() === '' ||
        String(val).trim().toLowerCase() === 'null' ||
        String(val).trim().toLowerCase() === 'n/a'
      ) {
        validatedResult[key] = null;
      } else {
        validatedResult[key] = typeof val === 'string' ? val.trim() : val;
      }
    }

    return res.status(200).json(validatedResult);
  } catch (err: any) {
    console.error('[Gemini OCR Exception] Error processing document:', err);
    return res.status(500).json({
      success: false,
      error: `Gemini OCR Processing Error: ${err?.message || String(err)}`,
    });
  }
}
