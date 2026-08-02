// ============================================================
// VERCEL SERVERLESS FUNCTION: /api/verify-semantic-map
// Gemini AI Decision Engine for Semantic Equivalence Verification.
// Evaluates whether OCR Field X represents the value requested by Form Label Y.
// Returns JSON: { "match": true, "confidence": 94, "reason": "..." }
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

const SEMANTIC_VERIFICATION_PROMPT = `You are an expert Semantic Equivalence Evaluator for Government Application Forms.
Your task is to determine whether an extracted OCR Field from a supporting document represents the exact value requested by a target Application Form Label.

STRICT VERIFICATION RULES:
1. Return match: true ONLY if the OCR Field strictly represents the same concept/data requested by the Form Label.
2. Return match: false if there is any mismatch in entity type (e.g. Phone vs Name, Email vs Name, Address vs Name, School Name vs Person Name, Date vs Name, etc.).
3. Return ONLY a valid JSON object in this exact schema:
{
  "match": true,
  "confidence": 94,
  "reason": "Detailed concise reason for acceptance or rejection"
}
4. Never return markdown code fences (\`\`\`json), comments, or extra text. Return ONLY valid raw JSON.`;

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
      error: 'Unauthorized: GEMINI_API_KEY environment variable is missing.',
    });
  }

  const { ocrField, ocrValue, formLabel } = req.body || {};

  if (!ocrField || !formLabel) {
    return res.status(400).json({
      success: false,
      error: "Invalid request: 'ocrField' and 'formLabel' are required.",
    });
  }

  const selectedModel = getGeminiModel();

  const userQuery = `EVALUATE EQUIVALENCE:
Does OCR Field: "${ocrField}" (extracted value: "${ocrValue || ''}")
represent the value requested by Target Application Form Label: "${formLabel}"?`;

  try {
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
            SEMANTIC_VERIFICATION_PROMPT,
            userQuery,
          ],
          config: {
            responseMimeType: 'application/json',
            temperature: 0.0,
          },
        });

        if (response && response.text) {
          break;
        }
      } catch (modelErr: any) {
        lastError = modelErr;
      }
    }

    if (!response || !response.text || !response.text.trim()) {
      return res.status(500).json({
        success: false,
        error: `Gemini Verification Error: ${lastError?.message || 'Empty response choices returned.'}`,
      });
    }

    const cleanJsonText = response.text
      .replace(/```json/gi, '')
      .replace(/```/g, '')
      .trim();

    let parsed: any = {};
    try {
      parsed = JSON.parse(cleanJsonText);
    } catch (parseErr: any) {
      return res.status(422).json({
        success: false,
        error: `Invalid JSON from Gemini: ${parseErr?.message}`,
        rawText: cleanJsonText,
      });
    }

    return res.status(200).json({
      success: true,
      match: Boolean(parsed.match),
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : (parsed.match ? 90 : 20),
      reason: String(parsed.reason || ''),
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: `Gemini Verification Exception: ${err?.message || String(err)}`,
    });
  }
}
