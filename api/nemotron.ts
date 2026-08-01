// ============================================================
// VERCEL SERVERLESS FUNCTION: /api/nemotron
// Proxies document recommendation requests to NVIDIA Nemotron.
// The NVIDIA_API_KEY is a server-side environment variable only.
// Nemotron recommends documents — it NEVER fabricates form values.
// ============================================================

import type { VercelRequest, VercelResponse } from '@vercel/node';

const NVIDIA_ENDPOINT = 'https://integrate.api.nvidia.com/v1/chat/completions';
const NEMOTRON_MODEL  = 'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning';

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
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) {
    console.error('[api/nemotron] NVIDIA_API_KEY is not set in server environment.');
    return res.status(500).json({ error: 'Recommendation service is not configured on the server.' });
  }

  const { missing_fields, uploaded_documents } = req.body as {
    missing_fields?: string[];
    uploaded_documents?: string[];
  };

  if (!missing_fields || !Array.isArray(missing_fields)) {
    return res.status(400).json({ error: 'missing_fields array is required.' });
  }

  if (missing_fields.length === 0) {
    return res.status(200).json({ completion_percentage: 100, recommendations: [] });
  }

  const totalFields = 26; // Total canonical schema fields
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

  try {
    const nvidiaResponse = await fetch(NVIDIA_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: NEMOTRON_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user',   content: userContent },
        ],
        temperature: 0.1,
        max_tokens:  1024,
      }),
    });

    if (!nvidiaResponse.ok) {
      const errorText = await nvidiaResponse.text().catch(() => '');
      console.error('[api/nemotron] NVIDIA API error:', nvidiaResponse.status, errorText);
      return res.status(502).json({ error: `Recommendation provider returned ${nvidiaResponse.status}` });
    }

    const data     = await nvidiaResponse.json();
    const rawText  = data.choices?.[0]?.message?.content || '';
    const cleanJson = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();

    let parsed: any = null;
    try {
      parsed = JSON.parse(cleanJson);
    } catch {
      console.warn('[api/nemotron] JSON parse failed:', cleanJson.slice(0, 200));
    }

    if (parsed && Array.isArray(parsed.recommendations)) {
      return res.status(200).json({
        completion_percentage: parsed.completion_percentage ?? completionPercentage,
        recommendations:       parsed.recommendations,
      });
    }

    // Parsing failed — return 422 so client falls back to local algorithm
    return res.status(422).json({ error: 'Invalid response format from AI provider.' });
  } catch (err: any) {
    console.error('[api/nemotron] Unexpected error:', err?.message);
    return res.status(500).json({ error: 'Internal recommendation service error.' });
  }
}
