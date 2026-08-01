// ============================================================
// VERCEL SERVERLESS FUNCTION: /api/ocr
// Gemini Multimodal OCR Backend Endpoint.
// Uses official Google Generative AI SDK (@google/genai).
// Model is configurable via process.env.GEMINI_MODEL with supported default 'gemini-flash-latest'.
// Logs: SDK version, API version, Selected model.
// Returns validated 26-field canonical JSON with missing fields set to null.
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

const SYSTEM_PROMPT = `You are an expert Indian Government Document OCR Parser using Gemini Multimodal Vision.
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
 * Gets configured model from process.env.GEMINI_MODEL, with supported fallback 'gemini-flash-latest'.
 */
function getGeminiModel(): string {
  const customModel = (
    process.env.GEMINI_MODEL ||
    process.env.VITE_GEMINI_MODEL ||
    ''
  ).trim();

  if (customModel && !customModel.includes('2.5-flash') && !customModel.includes('1.5-flash')) {
    return customModel;
  }

  return 'gemini-flash-latest';
}

/**
 * Validates that documentUrl returns HTTP 200 OK via HEAD/GET request before invoking Gemini.
 */
async function validateDocumentUrlReachable(documentUrl: string): Promise<{ reachable: boolean; status: number; statusText: string }> {
  try {
    let response = await fetch(documentUrl, { method: 'HEAD' }).catch(() => null);
    if (!response || response.status === 405 || response.status === 403) {
      response = await fetch(documentUrl, { method: 'GET', headers: { Range: 'bytes=0-10' } }).catch(() => null);
    }

    if (response && (response.status === 200 || response.status === 206)) {
      return { reachable: true, status: 200, statusText: 'OK' };
    }

    return {
      reachable: false,
      status: response ? response.status : 404,
      statusText: response ? response.statusText : 'Not Found',
    };
  } catch (err: any) {
    return { reachable: false, status: 500, statusText: err?.message || 'Network Exception' };
  }
}

/**
 * Downloads document from Cloudinary URL and returns base64 inline data part.
 */
async function fetchDocumentInlinePart(documentUrl: string): Promise<{ inlineData: { data: string; mimeType: string } }> {
  const cleanUrl = documentUrl.trim();

  let response = await fetch(cleanUrl).catch(() => null);

  // Fallback fetching if initial URL returns 404
  if (!response || !response.ok) {
    const fallbackUrls: string[] = [];
    if (cleanUrl.includes('/image/upload/pg_1/')) {
      fallbackUrls.push(cleanUrl.replace('/image/upload/pg_1/', '/raw/upload/').replace(/\.jpg$/i, '.pdf'));
      fallbackUrls.push(cleanUrl.replace('/image/upload/pg_1/', '/image/upload/'));
    } else if (cleanUrl.includes('/raw/upload/')) {
      fallbackUrls.push(cleanUrl.replace('/raw/upload/', '/image/upload/'));
    }

    for (const fbUrl of fallbackUrls) {
      const fbRes = await fetch(fbUrl).catch(() => null);
      if (fbRes && fbRes.ok) {
        response = fbRes;
        break;
      }
    }
  }

  if (!response || !response.ok) {
    throw new Error(`Failed to fetch document from Cloudinary URL: HTTP ${response?.status || 404} ${response?.statusText || 'Not Found'}`);
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

  // Validate Cloudinary URL with HEAD request before calling Gemini
  const validation = await validateDocumentUrlReachable(documentUrl);
  if (!validation.reachable) {
    console.error(`[api/ocr Error] Cloudinary URL validation failed: HTTP ${validation.status} ${validation.statusText} for URL: ${documentUrl}`);
    return res.status(400).json({
      success: false,
      error: `Cloudinary URL Validation Failed: Document URL is not reachable (HTTP ${validation.status} ${validation.statusText}). URL: ${documentUrl}`,
      documentUrl,
    });
  }

  const selectedModel = getGeminiModel();
  const sdkVersion = '@google/genai';
  const apiVersion = 'v1';

  // Requirement 9: Log SDK version, API version, Selected model
  console.log('==================== GEMINI OCR PROCESSING ====================');
  console.log('SDK version:', sdkVersion);
  console.log('API version:', apiVersion);
  console.log('Selected model:', selectedModel);
  console.log('Document URL:', documentUrl);
  console.log('================================================================');

  try {
    const inlinePart = await fetchDocumentInlinePart(documentUrl);
    const ai = new GoogleGenAI({ apiKey });

    // Retry pipeline across supported vision models if needed
    const candidateModels = [selectedModel, 'gemini-flash-latest', 'gemini-2.0-flash', 'gemini-pro-latest'];
    const uniqueModels = [...new Set(candidateModels)];

    let response: any = null;
    let lastError: any = null;

    for (const modelCandidate of uniqueModels) {
      try {
        response = await ai.models.generateContent({
          model: modelCandidate,
          contents: [
            inlinePart,
            SYSTEM_PROMPT,
          ],
          config: {
            responseMimeType: 'application/json',
            temperature: 0.1,
          },
        });

        if (response && response.text) {
          console.log(`[Gemini OCR Success] Successfully generated content using model: ${modelCandidate}`);
          break;
        }
      } catch (modelErr: any) {
        lastError = modelErr;
        console.warn(`[Gemini OCR Warning] Model '${modelCandidate}' failed (${modelErr?.message}). Trying next candidate model...`);
      }
    }

    if (!response || !response.text || !response.text.trim()) {
      return res.status(500).json({
        success: false,
        error: `Gemini OCR Processing Error: ${lastError?.message || 'Empty response choices returned across all candidate models.'}`,
      });
    }

    const responseText = response.text;
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
        error: `Invalid JSON returned by Gemini: ${parseErr?.message}`,
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
