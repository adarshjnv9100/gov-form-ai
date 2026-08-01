// ============================================================
// VERCEL SERVERLESS FUNCTION: /api/nemotron
// Proxies document recommendation requests to NVIDIA Nemotron.
// 100% self-contained serverless function (zero relative module imports).
// Prevents ERR_MODULE_NOT_FOUND on Vercel Node.js ESM runtime.
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
    NVIDIA_MODEL: getEnv('NVIDIA_MODEL') || 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning',
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

  console.log(`[api/nemotron] Initiating NVIDIA request to model: ${model}`);

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

    console.log(`[api/nemotron] Response Status: ${response.status} (${durationMs}ms)`);
    const rawText = await response.text();

    if (!response.ok) {
      const msg = `NVIDIA Provider API error (HTTP ${response.status}): ${rawText || response.statusText}`;
      console.error(`[api/nemotron Error] ${msg}`);
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
    } catch (parseErr: any) {
      const parseErrorMsg = `JSON parsing failed on NVIDIA response: ${parseErr?.message || String(parseErr)}`;
      console.error(`[api/nemotron Error] ${parseErrorMsg}`);
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
      console.error(`[api/nemotron Error] ${msg}`);
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
    console.error(`[api/nemotron Exception] ${msg}`);
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
    console.error('[api/nemotron] Missing required environment variables:', envResult.missing);
    return res.status(500).json({
      success: false,
      missing: envResult.missing,
      message: 'Missing required environment variables.',
    });
  }

  const { config } = envResult;
  const { missing_fields, uploaded_documents } = req.body || {};

  if (!missing_fields || !Array.isArray(missing_fields)) {
    return res.status(400).json({
      success: false,
      message: 'missing_fields array is required.',
    });
  }

  if (missing_fields.length === 0) {
    return res.status(200).json({
      success: true,
      completion_percentage: 100,
      recommendations: [],
    });
  }

  const totalFields = 26;
  const filledCount = totalFields - missing_fields.length;
  const completionPercentage = Math.max(0, Math.round((filledCount / totalFields) * 100));
  const nemotronModel = config.NVIDIA_MODEL || 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning';

  console.log(`[api/nemotron Audit Log] Processing recommendations for ${missing_fields.length} missing fields using model ${nemotronModel}`);

  const systemPrompt = `You are a Government Document Recommendation Engine.
Your ONLY job is to recommend official government documents that can provide the missing field values.
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

  const userContent = JSON.stringify({ missing_fields, uploaded_documents: uploaded_documents || [] });

  const nvidiaRes = await callNvidiaApi(
    config.NVIDIA_API_KEY,
    nemotronModel,
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent },
    ],
    0.1,
    1024
  );

  if (!nvidiaRes.success || !nvidiaRes.content) {
    console.error(`[api/nemotron Audit Log] Recommendation generation failed: ${nvidiaRes.message}`);
    return res.status(400).json({
      success: false,
      message: nvidiaRes.message || 'Failed to generate recommendations from NVIDIA provider.',
    });
  }

  const rawText = nvidiaRes.content;
  console.log(`[api/nemotron Audit Log] Raw Response: ${rawText.slice(0, 300)}`);
  const cleanJson = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();

  let parsed: any = null;
  try {
    parsed = JSON.parse(cleanJson);
    console.log(`[api/nemotron Audit Log] Parsed JSON successfully:`, JSON.stringify(parsed));
  } catch (err: any) {
    const parseErrorMsg = `JSON parse failed on Nemotron AI response: ${err?.message || String(err)}`;
    console.error(`[api/nemotron Audit Log] ${parseErrorMsg}`);
    return res.status(422).json({
      success: false,
      message: parseErrorMsg,
      rawText,
    });
  }

  if (parsed && Array.isArray(parsed.recommendations)) {
    return res.status(200).json({
      success: true,
      completion_percentage: parsed.completion_percentage ?? completionPercentage,
      recommendations: parsed.recommendations,
    });
  }

  return res.status(422).json({
    success: false,
    message: 'Invalid response format from AI provider.',
  });
}
