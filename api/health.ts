// ============================================================
// VERCEL SERVERLESS FUNCTION: /api/health
// Healthcheck endpoint to verify backend environment configuration
// without exposing secrets.
// 100% self-contained serverless function.
// ============================================================

interface VercelRequest {
  method?: string;
}
interface VercelResponse {
  status(code: number): VercelResponse;
  json(data: any): void;
  setHeader(name: string, value: string): void;
}

function getEnv(key: string): string {
  return (
    process.env[key] ||
    process.env[`VITE_${key}`] ||
    process.env[`NEXT_PUBLIC_${key}`] ||
    ''
  ).trim();
}

function validateEnvironment() {
  const envMap = {
    NVIDIA_API_KEY: getEnv('NVIDIA_API_KEY'),
    NVIDIA_MODEL: getEnv('NVIDIA_MODEL') || 'moonshotai/kimi-k2.6-vision',
    SUPABASE_URL: getEnv('SUPABASE_URL'),
    SUPABASE_ANON_KEY: getEnv('SUPABASE_ANON_KEY'),
    SUPABASE_SERVICE_ROLE_KEY: getEnv('SUPABASE_SERVICE_ROLE_KEY'),
    CLOUDINARY_CLOUD_NAME: getEnv('CLOUDINARY_CLOUD_NAME'),
    CLOUDINARY_API_KEY: getEnv('CLOUDINARY_API_KEY'),
    CLOUDINARY_API_SECRET: getEnv('CLOUDINARY_API_SECRET'),
  };

  const requiredKeys: Array<keyof typeof envMap> = [
    'NVIDIA_API_KEY',
    'NVIDIA_MODEL',
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'CLOUDINARY_CLOUD_NAME',
    'CLOUDINARY_API_KEY',
    'CLOUDINARY_API_SECRET',
  ];

  const missing: string[] = [];
  for (const key of requiredKeys) {
    if (!envMap[key]) {
      missing.push(key);
    }
  }

  return {
    isValid: missing.length === 0,
    missing,
    config: envMap,
  };
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
