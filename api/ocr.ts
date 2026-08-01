// ============================================================
// VERCEL SERVERLESS FUNCTION: /api/ocr
// Proxies OCR requests to NVIDIA Kimi K2.6 Vision API.
// The NVIDIA_API_KEY is a server-side environment variable only.
// This file MUST NOT be imported by any frontend code.
// ============================================================

import type { VercelRequest, VercelResponse } from '@vercel/node';

const NVIDIA_ENDPOINT = 'https://integrate.api.nvidia.com/v1/chat/completions';

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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) {
    console.error('[api/ocr] NVIDIA_API_KEY is not set in server environment.');
    return res.status(500).json({ error: 'OCR service is not configured on the server.' });
  }

  const { documentUrl } = req.body as { documentUrl?: string };
  if (!documentUrl || typeof documentUrl !== 'string') {
    return res.status(400).json({ error: 'documentUrl is required.' });
  }

  try {
    const requestBody = {
      model: 'moonshotai/kimi-k2.6-vision',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: documentUrl } },
            { type: 'text',      text: 'Extract all visible fields from this government document into the JSON schema.' },
          ],
        },
      ],
      temperature: 0.1,
      max_tokens: 1024,
    };

    const nvidiaResponse = await fetch(NVIDIA_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!nvidiaResponse.ok) {
      const errorText = await nvidiaResponse.text().catch(() => '');
      console.error('[api/ocr] NVIDIA API error:', nvidiaResponse.status, errorText);
      return res.status(502).json({ error: `OCR provider returned ${nvidiaResponse.status}` });
    }

    const data = await nvidiaResponse.json();
    const rawText = data.choices?.[0]?.message?.content || '';

    // Strip markdown fences if present
    const cleanJsonText = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();

    let parsed: Record<string, any> = {};
    try {
      parsed = JSON.parse(cleanJsonText);
    } catch {
      console.warn('[api/ocr] JSON parse failed on response:', cleanJsonText.slice(0, 200));
    }

    return res.status(200).json({ rawText, parsed });
  } catch (err: any) {
    console.error('[api/ocr] Unexpected error:', err?.message);
    return res.status(500).json({ error: 'Internal OCR service error.' });
  }
}
