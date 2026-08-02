// ============================================================
// VERCEL SERVERLESS FUNCTION: /api/parse-form
// Gemini Multimodal Vision API endpoint for Application Form Structure.
// Extracts fillable field labels & required status from form image/PDF.
// Returns JSON array: [{ "label": "Field Label", "required": true }, ...]
// Does NOT extract values.
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

const FORM_STRUCTURE_SYSTEM_PROMPT = `You are an expert Government Application Form Parser using Gemini Multimodal Vision.
Analyze the provided application form image or PDF document.
Extract every fillable field label and box heading present in the form layout.

STRICT EXTRACTION RULES:
1. Extract ONLY fillable field labels present in the form layout (e.g. "School Name", "Student Name", "Parent Name", "Parent Phone", "Parent Email", "Preferred Sport", "Date of Birth", "Address", "Aadhaar Number", etc.).
2. Do NOT extract user data values or handwritten filled values. Extract ONLY the form field labels/headings.
3. Determine whether each field is marked as required (true) or optional (false).
4. Return ONLY a valid JSON array of objects matching this exact schema:
[
  {
    "label": "Field Label",
    "required": true
  }
]
5. Do NOT include markdown code fences (\`\`\`json), comments, explanations, or wrapper objects. Return ONLY the raw valid JSON array.`;

function getGeminiApiKey(): string {
  return (
    process.env.GEMINI_API_KEY ||
    process.env.VITE_GEMINI_API_KEY ||
    process.env.NEXT_PUBLIC_GEMINI_API_KEY ||
    ''
  ).trim();
}

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

async function fetchDocumentInlinePart(documentUrl: string): Promise<{ inlineData: { data: string; mimeType: string } }> {
  const cleanUrl = documentUrl.trim();
  let response = await fetch(cleanUrl).catch(() => null);

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
    throw new Error(`Failed to fetch document from Cloudinary URL: HTTP ${response?.status || 404}`);
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
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: GEMINI_API_KEY environment variable is not configured.',
    });
  }

  const { documentUrl } = req.body || {};
  if (!documentUrl || typeof documentUrl !== 'string' || documentUrl.trim() === '') {
    return res.status(400).json({
      success: false,
      error: "Invalid Request: 'documentUrl' must be a valid non-empty string.",
    });
  }

  const selectedModel = getGeminiModel();

  console.log('==================== GEMINI FORM VISION PARSER ====================');
  console.log('Model:', selectedModel);
  console.log('Document URL:', documentUrl);
  console.log('==================================================================');

  try {
    const inlinePart = await fetchDocumentInlinePart(documentUrl);
    const ai = new GoogleGenAI({ apiKey });

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
            FORM_STRUCTURE_SYSTEM_PROMPT,
          ],
          config: {
            responseMimeType: 'application/json',
            temperature: 0.1,
          },
        });

        if (response && response.text) {
          console.log(`[Gemini Vision Success] Successfully parsed form structure using model: ${modelCandidate}`);
          break;
        }
      } catch (modelErr: any) {
        lastError = modelErr;
        console.warn(`[Gemini Vision Warning] Model '${modelCandidate}' failed (${modelErr?.message}). Trying next candidate...`);
      }
    }

    if (!response || !response.text || !response.text.trim()) {
      return res.status(500).json({
        success: false,
        error: `Gemini Vision Error: ${lastError?.message || 'Empty response choices returned.'}`,
      });
    }

    const responseText = response.text;
    const cleanJsonText = responseText
      .replace(/```json/gi, '')
      .replace(/```/g, '')
      .trim();

    let parsedArray: any[] = [];
    try {
      const parsed = JSON.parse(cleanJsonText);
      if (Array.isArray(parsed)) {
        parsedArray = parsed;
      } else if (parsed && typeof parsed === 'object') {
        if (Array.isArray(parsed.fields)) parsedArray = parsed.fields;
        else if (Array.isArray(parsed.labels)) parsedArray = parsed.labels;
        else parsedArray = Object.keys(parsed).map((k) => ({ label: k.replace(/_/g, ' '), required: true }));
      }
    } catch (parseErr: any) {
      console.error('[Gemini Vision Error] JSON parsing failed:', parseErr, cleanJsonText);
      return res.status(422).json({
        success: false,
        error: `Invalid JSON returned by Gemini Vision: ${parseErr?.message}`,
        rawText: cleanJsonText,
      });
    }

    const validatedTemplate = parsedArray
      .filter((item) => item && (item.label || typeof item === 'string'))
      .map((item) => {
        if (typeof item === 'string') {
          return { label: item.trim(), required: true };
        }
        return {
          label: String(item.label || item.name || '').trim(),
          required: item.required !== false,
        };
      })
      .filter((item) => item.label.length > 0);

    return res.status(200).json({
      success: true,
      template: validatedTemplate,
      rawText: cleanJsonText,
    });
  } catch (err: any) {
    console.error('[Gemini Vision Exception] Error parsing form layout:', err);
    return res.status(500).json({
      success: false,
      error: `Gemini Vision Processing Error: ${err?.message || String(err)}`,
    });
  }
}
