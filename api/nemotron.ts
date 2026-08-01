// ============================================================
// VERCEL SERVERLESS FUNCTION: /api/nemotron
// Proxies document recommendation requests to NVIDIA Nemotron.
// 100% self-contained serverless function.
// Verified against integrate.api.nvidia.com OpenAPI specs.
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

const ENDPOINT = 'https://integrate.api.nvidia.com/v1/chat/completions';

const SUPPORTED_DOCUMENTS = [
  'Aadhaar Card', 'PAN Card', 'Passport', 'Driving Licence', 'Voter ID Card',
  'Birth Certificate', 'Income Certificate', 'Caste Certificate', 'Domicile Certificate',
  'Residence Certificate', 'Family ID Card', 'Ration Card', 'Bank Passbook',
  'Cancelled Cheque', 'Bank Statement', 'Salary Slip', 'Form 16',
  'Income Tax Return (ITR)', 'Employer ID Card', 'Student ID Card',
  'Disability Certificate', 'Marriage Certificate', 'Property Tax Receipt',
  'Electricity Bill', 'Water Bill', 'Gas Bill', 'Telephone Bill',
  'Health Insurance Card', 'Vehicle Registration Certificate (RC)', 'Pension Book',
  'Senior Citizen Card', 'NREGA Job Card', 'Marksheet', 'Transfer Certificate',
  'School Certificate', 'Employment Letter',
].join(', ');

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
    console.error('[api/nemotron] Missing required environment variables:', envResult.missing);
    return res.status(500).json({
      success: false,
      missing: envResult.missing,
      message: `Missing required environment variables: ${envResult.missing.join(', ')}`,
    });
  }

  const { config } = envResult;
  const body = req.body || {};

  // 2. Validate Payload Schema
  if (!body || typeof body !== 'object' || !Array.isArray(body.missing_fields)) {
    console.error('[api/nemotron] Invalid request payload schema:', body);
    return res.status(400).json({
      success: false,
      message: "Request payload must contain 'missing_fields' as an array.",
    });
  }

  const missingFields: string[] = body.missing_fields.filter(
    (f: any) => typeof f === 'string' && f.trim() !== ''
  );
  const uploadedDocs: string[] = Array.isArray(body.uploaded_documents)
    ? body.uploaded_documents.filter((d: any) => typeof d === 'string' && d.trim() !== '')
    : [];

  if (missingFields.length === 0) {
    return res.status(200).json({
      success: true,
      completion_percentage: 100,
      recommendations: [],
    });
  }

  const totalFields = 26;
  const filledCount = totalFields - missingFields.length;
  const completionPercentage = Math.max(0, Math.round((filledCount / totalFields) * 100));

  let selectedModel = config.NVIDIA_MODEL;
  if (!selectedModel || selectedModel.includes('kimi') || !selectedModel.includes('/')) {
    selectedModel = 'meta/llama-3.3-70b-instruct';
  }

  const systemPrompt = `You are a Government Document Recommendation Engine.
Your ONLY job is to recommend official government documents that can provide missing field values.
You NEVER fabricate or guess field values. You only recommend documents.

Supported document types:
${SUPPORTED_DOCUMENTS}

RULES:
- Recommend the MINIMUM set of documents that covers the MAXIMUM missing fields.
- For each recommendation, list exactly which missing_fields it can fill.
- Each document can only appear once in the recommendations list.
- Do NOT recommend documents already uploaded.

Return ONLY valid JSON in this exact format:
{
  "completion_percentage": ${completionPercentage},
  "recommendations": [
    {
      "document": "Document Name",
      "fills": ["field_key_1", "field_key_2"],
      "priority": 1,
      "reason": "One sentence explanation of why this document is optimal."
    }
  ]
}`;

  const requestBody = {
    model: selectedModel,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: JSON.stringify({ missing_fields: missingFields, uploaded_documents: uploadedDocs }) },
    ],
    temperature: 0.1,
    max_tokens: 1024,
  };

  console.log(`[api/nemotron Request Log] Endpoint: ${ENDPOINT}`);
  console.log(`[api/nemotron Request Log] Model: ${selectedModel}`);
  console.log(`[api/nemotron Request Log] Payload:`, JSON.stringify(requestBody));

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
    let rawResponseText = await response.text();

    console.log(`[api/nemotron Response Log] Status: ${response.status} (${durationMs}ms)`);
    console.log(`[api/nemotron Response Log] Full Raw Response:`, rawResponseText);

    // If configured model returned 404, retry with catalog fallback
    if (response.status === 404 && selectedModel !== 'meta/llama-3.3-70b-instruct') {
      console.warn(`[api/nemotron Retry] Model '${selectedModel}' returned 404. Retrying with 'meta/llama-3.3-70b-instruct'...`);
      requestBody.model = 'meta/llama-3.3-70b-instruct';
      selectedModel = 'meta/llama-3.3-70b-instruct';

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

      console.log(`[api/nemotron Retry Response Log] Status: ${response.status} (${durationMs}ms)`);
      console.log(`[api/nemotron Retry Response Log] Full Raw Response:`, rawResponseText);
    }

    if (!response.ok) {
      console.error(`[api/nemotron Error Surface] NVIDIA HTTP ${response.status}: ${rawResponseText}`);
      return res.status(response.status >= 400 && response.status < 500 ? response.status : 502).json({
        success: false,
        message: `NVIDIA Provider API Error (HTTP ${response.status}): ${rawResponseText || response.statusText}`,
        nvidiaStatus: response.status,
        nvidiaResponseBody: rawResponseText,
      });
    }

    let parsed: any = null;
    try {
      parsed = JSON.parse(rawResponseText);
    } catch (parseErr: any) {
      const parseErrorMsg = `Failed to parse NVIDIA response JSON: ${parseErr?.message || String(parseErr)}`;
      console.error(`[api/nemotron Error] ${parseErrorMsg}`);
      return res.status(422).json({
        success: false,
        message: parseErrorMsg,
        rawResponseText,
      });
    }

    const aiContent = parsed.choices?.[0]?.message?.content || '';
    const cleanJson = aiContent.replace(/```json/gi, '').replace(/```/g, '').trim();

    let recommendationsJson: any = null;
    try {
      recommendationsJson = JSON.parse(cleanJson);
      console.log(`[api/nemotron Success] Recommendations JSON:`, JSON.stringify(recommendationsJson));
    } catch (jsonErr: any) {
      const jsonErrorMsg = `Failed to parse recommendation JSON: ${jsonErr?.message || String(jsonErr)}`;
      console.error(`[api/nemotron Error] ${jsonErrorMsg}`);
      return res.status(422).json({
        success: false,
        message: jsonErrorMsg,
        rawText: cleanJson,
      });
    }

    if (recommendationsJson && Array.isArray(recommendationsJson.recommendations)) {
      return res.status(200).json({
        success: true,
        completion_percentage: recommendationsJson.completion_percentage ?? completionPercentage,
        recommendations: recommendationsJson.recommendations,
      });
    }

    return res.status(422).json({
      success: false,
      message: 'Invalid response format from AI provider.',
      rawText: cleanJson,
    });
  } catch (netErr: any) {
    const netErrorMsg = `Network exception calling NVIDIA API: ${netErr?.message || String(netErr)}`;
    console.error(`[api/nemotron Exception] ${netErrorMsg}`);
    return res.status(500).json({
      success: false,
      message: netErrorMsg,
      endpoint: ENDPOINT,
    });
  }
}
