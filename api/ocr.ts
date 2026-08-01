// ============================================================
// VERCEL SERVERLESS FUNCTION: /api/ocr
// Proxies OCR requests to NVIDIA Kimi K2.6 Vision API.
// 100% self-contained serverless function (zero relative module imports).
// Prevents ERR_MODULE_NOT_FOUND on Vercel Node.js ESM runtime.
// ============================================================

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

function getEnv(key: string): string {
  return (
    process.env[key] ||
    process.env[`VITE_${key}`] ||
    process.env[`NEXT_PUBLIC_${key}`] ||
    ''
  ).trim();
}

function validateEnvironment() {
  const envMap = {
    NVIDIA_API_KEY: getEnv('NVIDIA_API_KEY'),
    NVIDIA_MODEL: getEnv('NVIDIA_MODEL') || 'moonshotai/kimi-k2.6-vision',
    SUPABASE_URL: getEnv('SUPABASE_URL'),
    SUPABASE_ANON_KEY: getEnv('SUPABASE_ANON_KEY'),
    SUPABASE_SERVICE_ROLE_KEY: getEnv('SUPABASE_SERVICE_ROLE_KEY'),
    CLOUDINARY_CLOUD_NAME: getEnv('CLOUDINARY_CLOUD_NAME'),
    CLOUDINARY_API_KEY: getEnv('CLOUDINARY_API_KEY'),
    CLOUDINARY_API_SECRET: getEnv('CLOUDINARY_API_SECRET'),
  };

  const requiredKeys: Array<keyof typeof envMap> = [
    'NVIDIA_API_KEY',
    'NVIDIA_MODEL',
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'CLOUDINARY_CLOUD_NAME',
    'CLOUDINARY_API_KEY',
    'CLOUDINARY_API_SECRET',
  ];

  const missing: string[] = [];
  for (const key of requiredKeys) {
    if (!envMap[key]) {
      missing.push(key);
    }
  }

  return {
    isValid: missing.length === 0,
    missing,
    config: envMap,
  };
}

async function callNvidiaApi(
  apiKey: string,
  model: string,
  messages: Array<any>,
  temperature = 0.1,
  maxTokens = 1024
) {
  const startTime = performance.now();
  const endpoint = 'https://integrate.api.nvidia.com/v1/chat/completions';

  console.log(`[api/ocr] Initiating NVIDIA request to model: ${model}`);

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens: maxTokens,
      }),
    });

    const durationMs = Math.round(performance.now() - startTime);

    console.log(`[api/ocr] NVIDIA Response Status: ${response.status} (${durationMs}ms)`);
    const headersObj: Record<string, string> = {};
    response.headers.forEach((val, key) => { headersObj[key] = val; });
    console.log(`[api/ocr] Response Headers:`, JSON.stringify(headersObj));

    const rawText = await response.text();
    console.log(`[api/ocr] Raw Response snippet:`, rawText.slice(0, 500));

    if (!response.ok) {
      const msg = `NVIDIA Provider API error (HTTP ${response.status}): ${rawText || response.statusText}`;
      console.error(`[api/ocr Error] ${msg}`);
      return {
        success: false,
        message: msg,
        rawText,
        durationMs,
        statusCode: response.status,
      };
    }

    let data: any = null;
    try {
      data = JSON.parse(rawText);
      console.log(`[api/ocr] Parsed NVIDIA outer JSON successfully.`);
    } catch (parseErr: any) {
      const parseErrorMsg = `JSON parsing failed on NVIDIA response: ${parseErr?.message || String(parseErr)}`;
      console.error(`[api/ocr Error] ${parseErrorMsg}`);
      return {
        success: false,
        message: parseErrorMsg,
        rawText,
        durationMs,
        statusCode: 422,
      };
    }

    const content = data.choices?.[0]?.message?.content || '';
    if (!content) {
      const msg = 'NVIDIA API response contained no choices or empty message content.';
      console.error(`[api/ocr Error] ${msg}`);
      return {
        success: false,
        message: msg,
        rawText,
        durationMs,
        statusCode: 422,
      };
    }

    return {
      success: true,
      content,
      rawText,
      durationMs,
      statusCode: 200,
    };
  } catch (err: any) {
    const durationMs = Math.round(performance.now() - startTime);
    const msg = `Network error calling NVIDIA endpoint (${durationMs}ms): ${err?.message || String(err)}`;
    console.error(`[api/ocr Exception] ${msg}`);
    return {
      success: false,
      message: msg,
      durationMs,
      statusCode: 500,
    };
  }
}

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

  // 1. Environment Validation (HTTP 500 if missing)
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

  console.log(`[api/ocr Audit Log] Cloudinary URL (documentUrl): ${documentUrl}`);
  console.log(`[api/ocr Audit Log] Model: ${ocrModel}`);

  // 3. Call NVIDIA API
  const nvidiaRes = await callNvidiaApi(
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

  console.log(`[api/ocr Audit Log] NVIDIA Response Time: ${nvidiaRes.durationMs}ms`);

  if (!nvidiaRes.success || !nvidiaRes.content) {
    console.error(`[api/ocr Audit Log] NVIDIA processing failed: ${nvidiaRes.message}`);
    return res.status(400).json({
      success: false,
      message: nvidiaRes.message || 'Failed to perform OCR with NVIDIA provider.',
    });
  }

  const rawText = nvidiaRes.content;
  console.log(`[api/ocr Audit Log] NVIDIA Raw Response: ${rawText.slice(0, 300)}`);

  const cleanJsonText = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();

  let parsed: Record<string, any> = {};
  try {
    parsed = JSON.parse(cleanJsonText);
    console.log(`[api/ocr Audit Log] Parsed JSON Response successfully:`, JSON.stringify(parsed));
  } catch (err: any) {
    const jsonParseError = `JSON parse failed on extracted AI response: ${err?.message || String(err)}`;
    console.error(`[api/ocr Audit Log] ${jsonParseError}. Raw text:`, cleanJsonText.slice(0, 300));
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
