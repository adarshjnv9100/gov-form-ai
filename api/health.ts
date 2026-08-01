// ============================================================
// VERCEL SERVERLESS FUNCTION: /api/health
// Healthcheck endpoint to verify backend environment configuration
// without exposing secrets.
// ============================================================

import { validateEnvironment } from './_config';

interface VercelRequest {
  method?: string;
}
interface VercelResponse {
  status(code: number): VercelResponse;
  json(data: any): void;
  setHeader(name: string, value: string): void;
}

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).json({ success: true });
  }

  const envResult = validateEnvironment();
  const c = envResult.config;

  const nvidiaOk = Boolean(c.NVIDIA_API_KEY && c.NVIDIA_MODEL);
  const supabaseOk = Boolean(c.SUPABASE_URL && (c.SUPABASE_ANON_KEY || c.SUPABASE_SERVICE_ROLE_KEY));
  const cloudinaryOk = Boolean(c.CLOUDINARY_CLOUD_NAME && (c.CLOUDINARY_API_KEY || c.CLOUDINARY_API_SECRET));
  const envOk = envResult.isValid;

  const statusCode = (nvidiaOk && supabaseOk && cloudinaryOk && envOk) ? 200 : 500;

  return res.status(statusCode).json({
    nvidia: nvidiaOk,
    supabase: supabaseOk,
    cloudinary: cloudinaryOk,
    environment: envOk,
  });
}
