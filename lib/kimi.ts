// ============================================================
// LIB/KIMI.TS
// Reusable Kimi Vision API Client & Error Handler (Server-Side Only).
// Reads KIMI_API_KEY from environment variables.
// Never exposes API key to the frontend.
// Handles 401, 429, 500, timeouts, and invalid JSON gracefully.
// ============================================================

export interface KimiVisionResponse {
  success: boolean;
  parsed?: Record<string, any>;
  rawText?: string;
  error?: string;
  statusCode?: number;
}

export function getKimiApiKey(): string {
  return (
    process.env.KIMI_API_KEY ||
    process.env.NVIDIA_API_KEY ||
    ''
  ).trim();
}

export function getKimiConfig(): { apiKey: string; endpoint: string; model: string } {
  const apiKey = getKimiApiKey();
  const isNvidiaKey = apiKey.startsWith('nvapi-');

  const endpoint = isNvidiaKey
    ? 'https://integrate.api.nvidia.com/v1/chat/completions'
    : (process.env.KIMI_API_ENDPOINT || 'https://api.moonshot.cn/v1/chat/completions');

  const model = isNvidiaKey
    ? (process.env.NVIDIA_MODEL || 'meta/llama-3.2-11b-vision-instruct')
    : (process.env.KIMI_MODEL || 'moonshot-v1-8k-vision');

  return { apiKey, endpoint, model };
}

/**
 * Converts Cloudinary raw/PDF URLs to page-1 JPEG image URLs for vision models.
 */
export function formatCloudinaryVisionUrl(url: string): string {
  if (!url || typeof url !== 'string') return url;
  const clean = url.trim();

  if (clean.includes('cloudinary.com')) {
    if (clean.includes('/raw/upload/')) {
      return clean
        .replace('/raw/upload/', '/image/upload/f_jpg,pg_1/')
        .replace(/\.pdf$/i, '.jpg');
    }
    if (clean.includes('/image/upload/') && clean.endsWith('.pdf')) {
      return clean
        .replace('/image/upload/', '/image/upload/f_jpg,pg_1/')
        .replace(/\.pdf$/i, '.jpg');
    }
  }

  return clean;
}

/**
 * Reusable function to call Kimi Vision API directly on a Cloudinary URL.
 * Never exposes the API key to the frontend.
 * Handles 401, 429, 500, timeouts, and invalid JSON with descriptive errors.
 */
export async function callKimiVision(
  documentUrl: string,
  prompt: string,
  timeoutMs = 30000
): Promise<KimiVisionResponse> {
  const { apiKey, endpoint, model } = getKimiConfig();

  if (!apiKey) {
    return {
      success: false,
      statusCode: 401,
      error: 'Unauthorized: KIMI_API_KEY environment variable is not configured.',
    };
  }

  if (!documentUrl || typeof documentUrl !== 'string' || !documentUrl.trim()) {
    return {
      success: false,
      statusCode: 400,
      error: 'Invalid Request: documentUrl parameter must be a non-empty string.',
    };
  }

  const visionImageUrl = formatCloudinaryVisionUrl(documentUrl);

  const payload = {
    model,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: prompt },
          { type: 'image_url', image_url: { url: visionImageUrl } },
        ],
      },
    ],
    temperature: 0.1,
    max_tokens: 1024,
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    // Handle 401 Unauthorized
    if (response.status === 401) {
      return {
        success: false,
        statusCode: 401,
        error: 'HTTP 401 Unauthorized: Invalid or expired KIMI_API_KEY credential.',
      };
    }

    // Handle 429 Rate Limit Exceeded
    if (response.status === 429) {
      return {
        success: false,
        statusCode: 429,
        error: 'HTTP 429 Rate Limit Exceeded: Kimi Vision API rate limit reached. Please retry shortly.',
      };
    }

    // Handle 500 Provider Error
    if (response.status >= 500) {
      const errText = await response.text().catch(() => '');
      return {
        success: false,
        statusCode: response.status,
        error: `HTTP ${response.status} Provider Error: Kimi Vision service error (${errText || response.statusText}).`,
      };
    }

    if (!response.ok) {
      const errText = await response.text().catch(() => '');
      return {
        success: false,
        statusCode: response.status,
        error: `HTTP ${response.status} Error: ${errText || response.statusText}`,
      };
    }

    const data = await response.json();
    const rawContent = data.choices?.[0]?.message?.content || '';

    if (!rawContent || !rawContent.trim()) {
      return {
        success: false,
        statusCode: 422,
        error: 'Empty Response: Kimi Vision API returned no message content choices.',
      };
    }

    // Clean markdown code fences if present
    const cleanText = rawContent
      .replace(/```json/gi, '')
      .replace(/```/g, '')
      .trim();

    let parsed: Record<string, any> = {};
    try {
      parsed = JSON.parse(cleanText);
    } catch (jsonErr: any) {
      return {
        success: false,
        statusCode: 422,
        rawText: cleanText,
        error: `Invalid JSON Response: Failed to parse vision model response JSON (${jsonErr?.message}).`,
      };
    }

    return {
      success: true,
      statusCode: 200,
      rawText: cleanText,
      parsed,
    };
  } catch (err: any) {
    clearTimeout(timeoutId);

    // Handle Timeout
    if (err.name === 'AbortError') {
      return {
        success: false,
        statusCode: 504,
        error: `Gateway Timeout: Request to Kimi Vision API timed out after ${timeoutMs}ms.`,
      };
    }

    return {
      success: false,
      statusCode: 500,
      error: `Network Error: ${err?.message || String(err)}`,
    };
  }
}
