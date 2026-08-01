// ============================================================
// SHARED BACKEND NVIDIA SERVICE & SERVER ENVIRONMENT VALIDATOR
// Serverless Functions helper module for Vercel.
// Never exposes API keys or secrets to the browser.
// ============================================================

export interface NvidiaConfig {
  apiKey: string;
  model: string;
}

export interface NvidiaCallResult {
  success: boolean;
  message?: string;
  content?: string;
  statusCode?: number;
}

/**
 * Validates process.env.NVIDIA_API_KEY and process.env.NVIDIA_MODEL.
 */
export function validateNvidiaConfig(defaultModel: string): { config?: NvidiaConfig; error?: string } {
  const apiKey = process.env.NVIDIA_API_KEY;
  const model = process.env.NVIDIA_MODEL || defaultModel;

  if (!apiKey) {
    const msg = 'OCR / Nemotron service is not configured on the server: process.env.NVIDIA_API_KEY is missing.';
    console.error(`[NVIDIA Server Error] ${msg}`);
    return { error: msg };
  }

  return { config: { apiKey, model } };
}

/**
 * Verifies all required server environment variables on startup / function execution.
 */
export function validateServerEnvironment(): { isValid: boolean; missing: string[] } {
  const requiredKeys = [
    'NVIDIA_API_KEY',
    'SUPABASE_URL',
    'SUPABASE_SERVICE_ROLE_KEY',
    'SUPABASE_ANON_KEY',
    'CLOUDINARY_CLOUD_NAME',
    'CLOUDINARY_API_KEY',
    'CLOUDINARY_API_SECRET',
  ];

  const missing: string[] = [];

  for (const key of requiredKeys) {
    const val =
      process.env[key] ||
      process.env[`VITE_${key}`] ||
      process.env[`NEXT_PUBLIC_${key}`];

    if (!val) {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    console.warn(`[Server Environment Validation] Warning: Missing environment variables: ${missing.join(', ')}`);
  }

  return { isValid: missing.length === 0, missing };
}

/**
 * Reusable backend caller for NVIDIA Chat Completions API.
 * Never throws an unhandled exception or crashes with HTTP 500.
 */
export async function callNvidiaApi(
  apiKey: string,
  model: string,
  messages: Array<any>,
  temperature = 0.1,
  maxTokens = 1024
): Promise<NvidiaCallResult> {
  const endpoint = 'https://integrate.api.nvidia.com/v1/chat/completions';

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens: maxTokens,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      const msg = `NVIDIA API provider error (${response.status}): ${errorText || response.statusText}`;
      console.error(`[callNvidiaApi] ${msg}`);
      return {
        success: false,
        message: msg,
        statusCode: response.status,
      };
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';

    if (!content) {
      return {
        success: false,
        message: 'NVIDIA API returned an empty completion response.',
        statusCode: 422,
      };
    }

    return {
      success: true,
      content,
    };
  } catch (err: any) {
    const msg = `Network error contacting NVIDIA API: ${err?.message || String(err)}`;
    console.error(`[callNvidiaApi] Exception: ${msg}`);
    return {
      success: false,
      message: msg,
      statusCode: 500,
    };
  }
}
