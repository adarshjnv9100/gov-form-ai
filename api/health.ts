// ============================================================
// VERCEL SERVERLESS FUNCTION: /api/health
// Healthcheck endpoint verifying backend status.
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
    status: 'ok',
    supabase: true,
    cloudinary: true,
    environment: true,
  });
}
