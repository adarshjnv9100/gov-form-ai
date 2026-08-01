// ============================================================
// VERCEL SERVERLESS FUNCTION: /api/ocr
// Kimi Vision OCR Endpoint
// Receives { documentUrl }, calls Kimi Vision API directly on Cloudinary URL.
// Returns ONLY canonical JSON with 26 required fields (missing = null).
// Saves nothing, calls no databases, modifies no UI.
// ============================================================

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

function getKimiConfig(): { apiKey: string; endpoint: string; model: string } {
  const apiKey = (
    process.env.KIMI_API_KEY ||
    process.env.NVIDIA_API_KEY ||
    ''
  ).trim();

  // If using Moonshot AI native API endpoint vs NVIDIA endpoint:
  const isNvidiaKey = apiKey.startsWith('nvapi-');
  const endpoint = isNvidiaKey
    ? 'https://integrate.api.nvidia.com/v1/chat/completions'
    : (process.env.KIMI_API_ENDPOINT || 'https://api.moonshot.cn/v1/chat/completions');

  const model = isNvidiaKey
    ? (process.env.NVIDIA_MODEL || 'meta/llama-3.2-11b-vision-instruct')
    : (process.env.KIMI_MODEL || 'moonshot-v1-8k-vision');

  return { apiKey, endpoint, model };
}

function convertPdfToImageUrl(documentUrl: string): string {
  if (!documentUrl || typeof documentUrl !== 'string') return documentUrl;
  const url = documentUrl.trim();

  // Convert Cloudinary RAW/PDF URLs to page 1 JPEG for vision model processing
  if (url.includes('cloudinary.com')) {
    if (url.includes('/raw/upload/')) {
      return url
        .replace('/raw/upload/', '/image/upload/f_jpg,pg_1/')
        .replace(/\.pdf$/i, '.jpg');
    }
    if (url.includes('/image/upload/') && url.endsWith('.pdf')) {
      return url
        .replace('/image/upload/', '/image/upload/f_jpg,pg_1/')
        .replace(/\.pdf$/i, '.jpg');
    }
  }

  return url;
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
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const { documentUrl } = req.body || {};

  if (!documentUrl || typeof documentUrl !== 'string' || documentUrl.trim() === '') {
    return res.status(400).json({
      ...DEFAULT_CANONICAL_SCHEMA,
    });
  }

  const visionImageUrl = convertPdfToImageUrl(documentUrl);
  const { apiKey, endpoint, model } = getKimiConfig();

  // If no API key configured, return default canonical schema with nulls
  if (!apiKey) {
    console.warn('[api/ocr] No Vision API key configured in environment variables.');
    return res.status(200).json(DEFAULT_CANONICAL_SCHEMA);
  }

  const payload = {
    model,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: SYSTEM_PROMPT },
          { type: 'image_url', image_url: { url: visionImageUrl } },
        ],
      },
    ],
    temperature: 0.1,
    max_tokens: 1024,
  };

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      console.warn(`[api/ocr] Kimi Vision API returned HTTP ${response.status}`);
      return res.status(200).json(DEFAULT_CANONICAL_SCHEMA);
    }

    const resData = await response.json();
    const rawContent = resData.choices?.[0]?.message?.content || '';

    // Strip markdown code fences if model accidentally includes them
    const cleanText = rawContent
      .replace(/```json/gi, '')
      .replace(/```/g, '')
      .trim();

    let extracted: Record<string, any> = {};
    try {
      extracted = JSON.parse(cleanText);
    } catch {
      console.warn('[api/ocr] Could not parse Kimi Vision JSON response text.');
      return res.status(200).json(DEFAULT_CANONICAL_SCHEMA);
    }

    // Format output: enforce 26 keys, replace empty strings with null
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
  } catch (err) {
    console.error('[api/ocr] Exception during Kimi Vision API call:', err);
    return res.status(200).json(DEFAULT_CANONICAL_SCHEMA);
  }
}
