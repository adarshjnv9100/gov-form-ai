// ============================================================
// SINGLE CONFIGURATION MODULE & ENVIRONMENT VALIDATOR
// Serverless Functions helper module for Vercel.
// Never exposes API keys or secrets to the browser.
// ============================================================

export interface ConfigValidationResult {
  isValid: boolean;
  missing: string[];
  config: {
    NVIDIA_API_KEY: string;
    NVIDIA_MODEL: string;
    SUPABASE_URL: string;
    SUPABASE_ANON_KEY: string;
    SUPABASE_SERVICE_ROLE_KEY: string;
    CLOUDINARY_CLOUD_NAME: string;
    CLOUDINARY_API_KEY: string;
    CLOUDINARY_API_SECRET: string;
  };
}

export function validateEnvironment(): ConfigValidationResult {
  const getEnv = (key: string): string => {
    return (
      process.env[key] ||
      process.env[`VITE_${key}`] ||
      process.env[`NEXT_PUBLIC_${key}`] ||
      ''
    ).trim();
  };

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
