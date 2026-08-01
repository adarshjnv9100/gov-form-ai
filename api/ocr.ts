// ============================================================
// VERCEL SERVERLESS FUNCTION: /api/ocr
// Proxies OCR requests to NVIDIA API Catalog endpoints.
// 100% self-contained serverless function.
// Verified against integrate.api.nvidia.com OpenAPI specs.
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

const ENDPOINT = 'https://integrate.api.nvidia.com/v1/chat/completions';

// Supported NVIDIA Vision Catalog Models (fallback chain)
const SUPPORTED_VISION_MODELS = [
  'meta/llama-3.2-11b-vision-instruct',
  'meta/llama-3.2-90b-vision-instruct',
  'nvidia/neva-22b',
  'microsoft/phi-3.5-vision-instruct',
];

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
    NVIDIA_MODEL: getEnv('NVIDIA_MODEL'),
    SUPABASE_URL: getEnv('SUPABASE_URL'),
    SUPABASE_ANON_KEY: getEnv('SUPABASE_ANON_KEY'),
    SUPABASE_SERVICE_ROLE_KEY: getEnv('SUPABASE_SERVICE_ROLE_KEY'),
    CLOUDINARY_CLOUD_NAME: getEnv('CLOUDINARY_CLOUD_NAME'),
    CLOUDINARY_API_KEY: getEnv('CLOUDINARY_API_KEY'),
    CLOUDINARY_API_SECRET: getEnv('CLOUDINARY_API_SECRET'),
  };

  const missing: string[] = [];
  if (!envMap.NVIDIA_API_KEY) missing.push('NVIDIA_API_KEY');
  if (!envMap.SUPABASE_URL) missing.push('SUPABASE_URL');
  if (!envMap.SUPABASE_ANON_KEY && !envMap.SUPABASE_SERVICE_ROLE_KEY) missing.push('SUPABASE_ANON_KEY');
  if (!envMap.CLOUDINARY_CLOUD_NAME) missing.push('CLOUDINARY_CLOUD_NAME');

  return {
    isValid: missing.length === 0,
    missing,
    config: envMap,
  };
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

  // 1. Startup Environment Validation
  const envResult = validateEnvironment();
  if (!envResult.isValid) {
    console.error('[api/ocr] Missing required environment variables:', envResult.missing);
    return res.status(500).json({
      success: false,
      missing: envResult.missing,
      message: `Missing required environment variables: ${envResult.missing.join(', ')}`,
    });
  }

  const { config } = envResult;
  const body = req.body || {};
  const submissionId = body.submissionId || req.headers?.['x-submission-id'] || 'N/A';

  // 2. Verify Payload: body MUST contain documentUrl
  const wrongKeys = ['url', 'image', 'file', 'pdf', 'cloudinaryUrl'].filter((k) => k in body);
  if (!body.documentUrl || typeof body.documentUrl !== 'string' || body.documentUrl.trim() === '') {
    const errorMsg = wrongKeys.length > 0
      ? `Payload must contain 'documentUrl' as a non-empty string. (Found incorrect property '${wrongKeys[0]}' in payload).`
      : "Payload must contain 'documentUrl' as a non-empty string.";
    console.error(`[api/ocr] Payload verification failed: ${errorMsg}`);
    return res.status(400).json({
      success: false,
      message: errorMsg,
    });
  }

  const documentUrl = body.documentUrl.trim();

  // Determine model: if configured model is non-existent or known non-catalog, fallback to catalog model
  let selectedModel = config.NVIDIA_MODEL;
  if (!selectedModel || selectedModel.includes('kimi') || !selectedModel.includes('/')) {
    selectedModel = 'meta/llama-3.2-11b-vision-instruct';
  }

  // Build NVIDIA Chat Completions Payload
  const requestBody = {
    model: selectedModel,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: SYSTEM_PROMPT },
          { type: 'image_url', image_url: { url: documentUrl } },
        ],
      },
    ],
    max_tokens: 1024,
    temperature: 0.1,
    top_p: 1.0,
  };

  // Requirement 9: Log endpoint, model, request body (sans key) BEFORE making request
  console.log(`[api/ocr Request Log] Endpoint: ${ENDPOINT}`);
  console.log(`[api/ocr Request Log] Model: ${selectedModel}`);
  console.log(`[api/ocr Request Log] Request Payload:`, JSON.stringify(requestBody));

  const startTime = performance.now();

  try {
    let response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.NVIDIA_API_KEY}`,
      },
      body: JSON.stringify(requestBody),
    });

    let durationMs = Math.round(performance.now() - startTime);

    // Requirement 10: Log full NVIDIA response
    console.log(`[api/ocr Response Log] Status: ${response.status} (${durationMs}ms)`);
    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((v, k) => { responseHeaders[k] = v; });
    console.log(`[api/ocr Response Log] Headers:`, JSON.stringify(responseHeaders));

    let rawResponseText = await response.text();
    console.log(`[api/ocr Response Log] Full Raw Response:`, rawResponseText);

    // If configured model returned 404, retry with primary catalog vision model
    if (response.status === 404 && selectedModel !== 'meta/llama-3.2-11b-vision-instruct') {
      console.warn(`[api/ocr Retry] Model '${selectedModel}' returned 404. Retrying with 'meta/llama-3.2-11b-vision-instruct'...`);
      requestBody.model = 'meta/llama-3.2-11b-vision-instruct';
      selectedModel = 'meta/llama-3.2-11b-vision-instruct';

      const retryStart = performance.now();
      response = await fetch(ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.NVIDIA_API_KEY}`,
        },
        body: JSON.stringify(requestBody),
      });

      durationMs = Math.round(performance.now() - retryStart);
      rawResponseText = await response.text();

      console.log(`[api/ocr Retry Response Log] Status: ${response.status} (${durationMs}ms)`);
      console.log(`[api/ocr Retry Response Log] Full Raw Response:`, rawResponseText);
    }

    // Requirement 11: Surface exact NVIDIA error if HTTP status is non-200
    if (!response.ok) {
      console.error(`[api/ocr Error Surface] NVIDIA HTTP ${response.status}: ${rawResponseText}`);
      return res.status(response.status >= 400 && response.status < 500 ? response.status : 502).json({
        success: false,
        message: `NVIDIA Provider API Error (HTTP ${response.status}): ${rawResponseText || response.statusText}`,
        nvidiaStatus: response.status,
        nvidiaResponseBody: rawResponseText,
        endpoint: ENDPOINT,
        model: selectedModel,
      });
    }

    let parsedNvidiaData: any = null;
    try {
      parsedNvidiaData = JSON.parse(rawResponseText);
    } catch (parseErr: any) {
      const parseErrorMsg = `Failed to parse NVIDIA response JSON: ${parseErr?.message || String(parseErr)}`;
      console.error(`[api/ocr Error] ${parseErrorMsg}`);
      return res.status(422).json({
        success: false,
        message: parseErrorMsg,
        rawResponseText,
      });
    }

    const aiContent = parsedNvidiaData.choices?.[0]?.message?.content || '';
    if (!aiContent) {
      return res.status(422).json({
        success: false,
        message: 'NVIDIA API returned empty choices or missing content.',
        rawResponseText,
      });
    }

    const cleanJsonText = aiContent.replace(/```json/gi, '').replace(/```/g, '').trim();

    let extractedFieldsJson: Record<string, any> = {};
    try {
      extractedFieldsJson = JSON.parse(cleanJsonText);
      console.log(`[api/ocr Success] Extracted Fields JSON:`, JSON.stringify(extractedFieldsJson));
    } catch (jsonErr: any) {
      const jsonErrorMsg = `Failed to parse document extraction JSON: ${jsonErr?.message || String(jsonErr)}`;
      console.error(`[api/ocr Error] ${jsonErrorMsg}. Raw content:`, cleanJsonText.slice(0, 300));
      return res.status(422).json({
        success: false,
        message: jsonErrorMsg,
        rawText: cleanJsonText,
      });
    }

    return res.status(200).json({
      success: true,
      documentUrl,
      model: selectedModel,
      responseTimeMs: durationMs,
      submissionId,
      rawText: cleanJsonText,
      parsed: extractedFieldsJson,
    });
  } catch (netErr: any) {
    const netErrorMsg = `Network exception calling NVIDIA API: ${netErr?.message || String(netErr)}`;
    console.error(`[api/ocr Exception] ${netErrorMsg}`);
    return res.status(500).json({
      success: false,
      message: netErrorMsg,
      endpoint: ENDPOINT,
    });
  }
}
