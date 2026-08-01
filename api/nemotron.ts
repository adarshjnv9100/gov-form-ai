// ============================================================
// VERCEL SERVERLESS FUNCTION: /api/nemotron
// Proxies document recommendation requests to NVIDIA Nemotron.
// The NVIDIA_API_KEY is a server-side environment variable only.
// Nemotron recommends documents — it NEVER fabricates form values.
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
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  // Validate server environment
  validateServerEnvironment();

  // Validate NVIDIA API Key & Model
  const defaultNemotronModel = process.env.NVIDIA_MODEL || 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning';
  const { config, error } = validateNvidiaConfig(defaultNemotronModel);

  if (error || !config) {
    return res.status(400).json({
      success: false,
      message: error || 'Recommendation service is not configured on the server. Missing process.env.NVIDIA_API_KEY.',
    });
  }

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
    config.apiKey,
    config.model,
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent },
    ],
    0.1,
    1024
  );

  if (!nvidiaRes.success || !nvidiaRes.content) {
    return res.status(400).json({
      success: false,
      message: nvidiaRes.message || 'Failed to generate recommendations from NVIDIA provider.',
    });
  }

  const rawText = nvidiaRes.content;
  const cleanJson = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();

  let parsed: any = null;
  try {
    parsed = JSON.parse(cleanJson);
  } catch {
    console.warn('[api/nemotron] JSON parse failed on raw text snippet:', cleanJson.slice(0, 200));
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
