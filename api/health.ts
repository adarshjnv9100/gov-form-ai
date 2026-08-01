// ============================================================
// SERVERLESS FUNCTION: /api/health
// Placeholder healthcheck endpoint.
// ============================================================

interface VercelRequest {
  method?: string;
}
interface VercelResponse {
  status(code: number): VercelResponse;
  json(data: any): void;
  setHeader(name: string, value: string): void;
}

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).json({ success: true });
  }

  return res.status(200).json({
    nvidia: true,
    supabase: true,
    cloudinary: true,
    environment: true,
  });
}
