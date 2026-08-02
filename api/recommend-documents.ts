// ============================================================
// VERCEL SERVERLESS FUNCTION: /api/recommend-documents
// Gemini AI Document Recommendation Engine for Indian Government Forms.
// Generates minimum set of recommended supporting documents based on missing fields.
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

const RECOMMENDATION_SYSTEM_PROMPT = `You are an expert Indian Government Document Advisor.

Your task is to recommend the minimum number of supporting documents required to fill the missing form fields.

Rules:
• Recommend only documents commonly accepted in India.

Examples:
- Aadhaar Card
- PAN Card
- Passport
- Driving Licence
- Voter ID
- Bank Passbook
- Cancelled Cheque
- Income Certificate
- Utility Bill
- Marriage Certificate
- Employer ID
- Birth Certificate

Return ONLY valid JSON.

Schema:
{
  "completion_percentage": 78,
  "documents": [
    {
      "document": "Aadhaar Card",
      "reason": "Contains Aadhaar Number, Date of Birth and Address.",
      "fills": [
        "aadhaar_number",
        "date_of_birth",
        "address"
      ]
    }
  ]
}

Never return markdown.
Never explain.
Never hallucinate unsupported documents.
Recommend the minimum number of documents.`;

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
      error: 'Unauthorized: GEMINI_API_KEY environment variable is not configured.',
    });
  }

  const { missing_fields = [], uploaded_documents = [] } = req.body || {};

  if (!Array.isArray(missing_fields) || missing_fields.length === 0) {
    return res.status(200).json({
      success: true,
      completion_percentage: 100,
      documents: [],
    });
  }

  const selectedModel = getGeminiModel();

  const userPrompt = `MISSING FORM FIELDS TO COMPLETE:
${JSON.stringify(missing_fields, null, 2)}

ALREADY UPLOADED DOCUMENTS:
${JSON.stringify(uploaded_documents, null, 2)}

Analyze the missing fields and return the optimal JSON recommendation.`;

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
            RECOMMENDATION_SYSTEM_PROMPT,
            userPrompt,
          ],
          config: {
            responseMimeType: 'application/json',
            temperature: 0.1,
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
        error: `Gemini Recommendation Error: ${lastError?.message || 'Empty response returned across candidate models.'}`,
      });
    }

    const responseText = response.text;
    const cleanJsonText = responseText
      .replace(/```json/gi, '')
      .replace(/```/g, '')
      .trim();

    let parsed: any = {};
    try {
      parsed = JSON.parse(cleanJsonText);
    } catch (parseErr: any) {
      return res.status(422).json({
        success: false,
        error: `Invalid JSON returned by Gemini: ${parseErr?.message}`,
        rawText: cleanJsonText,
      });
    }

    const documents = Array.isArray(parsed.documents) ? parsed.documents : Array.isArray(parsed.recommendations) ? parsed.recommendations : [];

    return res.status(200).json({
      success: true,
      completion_percentage: typeof parsed.completion_percentage === 'number' ? parsed.completion_percentage : 75,
      documents,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: `Gemini Recommendation Exception: ${err?.message || String(err)}`,
    });
  }
}
