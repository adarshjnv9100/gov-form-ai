// ============================================================
// SERVERLESS FUNCTION: /api/ocr
// Placeholder OCR endpoint for rebuilding AI integration from scratch.
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const { documentUrl } = req.body || {};

  return res.status(200).json({
    success: true,
    documentUrl: documentUrl || '',
    rawText: '',
    parsed: {},
  });
}
