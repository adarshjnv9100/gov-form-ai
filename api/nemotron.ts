// ============================================================
// VERCEL SERVERLESS FUNCTION: /api/nemotron
// Proxies document recommendation requests to NVIDIA Nemotron.
// The NVIDIA_API_KEY is a server-side environment variable only.
// Nemotron recommends documents — it NEVER fabricates form values.
// Includes full CORS headers and environment validation.
// ============================================================

import { validateEnvironment } from './_config';
import { callNvidiaClient } from './_nvidia';

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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Apply CORS headers for cross-origin browser compatibility
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

  const nvidiaRes = await callNvidiaClient(
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
