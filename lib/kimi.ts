// ============================================================
// LIB/KIMI.TS
// Reusable Kimi Vision API Client & Comprehensive Debug Logger.
// Reads KIMI_API_KEY from environment variables.
// Never exposes API key to the frontend or in logs.
// Logged fields: Cloudinary URL, Model, Prompt, Payload, HTTP Status,
// Response Time, Raw Response, Parsed JSON.
// Returns descriptive errors on failure — never silently swallows errors.
// ============================================================

export interface KimiVisionResponse {
  success: boolean;
  parsed?: Record<string, any>;
  rawText?: string;
  error?: string;
  statusCode?: number;
  durationMs?: number;
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
 * Never exposes the API key to the frontend or in logs.
 * Performs detailed pre-flight and post-flight debug logging.
 */
export async function callKimiVision(
  documentUrl: string,
  prompt: string,
  timeoutMs = 30000
): Promise<KimiVisionResponse> {
  const { apiKey, endpoint, model } = getKimiConfig();

  if (!apiKey) {
    const error = 'Missing environment variable: KIMI_API_KEY is not configured on the server.';
    console.error(`[OCR Debug Log] Error: ${error}`);
    return {
      success: false,
      statusCode: 401,
      error,
    };
  }

  if (!documentUrl || typeof documentUrl !== 'string' || !documentUrl.trim()) {
    const error = "Invalid Request: 'documentUrl' parameter must be a non-empty string.";
    console.error(`[OCR Debug Log] Error: ${error}`);
    return {
      success: false,
      statusCode: 400,
      error,
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

  // Log BEFORE Request (sanitized payload without API keys)
  console.log('==================== OCR REQUEST DEBUG LOG ====================');
  console.log('Cloudinary URL (Original):', documentUrl);
  console.log('Cloudinary URL (Vision Target):', visionImageUrl);
  console.log('Model:', model);
  console.log('Endpoint:', endpoint);
  console.log('Prompt:', prompt);
  console.log('Payload:', JSON.stringify(payload, null, 2));
  console.log('================================================================');

  const startTime = performance.now();
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
    const durationMs = Math.round(performance.now() - startTime);
    const rawResponseText = await response.text();

    // Log AFTER Request
    console.log('==================== OCR RESPONSE DEBUG LOG ====================');
    console.log('HTTP Status:', response.status);
    console.log('Response Time:', `${durationMs}ms`);
    console.log('Raw Response:', rawResponseText);
    console.log('=================================================================');

    if (response.status === 401) {
      const error = 'HTTP 401 Unauthorized: Invalid API key or unauthorized access to vision endpoint.';
      console.error(`[OCR Debug Log] Error: ${error}`);
      return { success: false, statusCode: 401, durationMs, rawText: rawResponseText, error };
    }

    if (response.status === 429) {
      const error = 'HTTP 429 Rate Limit Exceeded: Vision API rate limit reached. Please retry in a moment.';
      console.error(`[OCR Debug Log] Error: ${error}`);
      return { success: false, statusCode: 429, durationMs, rawText: rawResponseText, error };
    }

    if (!response.ok) {
      const error = `HTTP ${response.status} Provider Error: ${rawResponseText || response.statusText}`;
      console.error(`[OCR Debug Log] Error: ${error}`);
      return { success: false, statusCode: response.status, durationMs, rawText: rawResponseText, error };
    }

    let parsedOuter: any = null;
    try {
      parsedOuter = JSON.parse(rawResponseText);
    } catch (parseErr: any) {
      const error = `JSON Parse Error: Could not parse outer HTTP response JSON (${parseErr?.message}).`;
      console.error(`[OCR Debug Log] Error: ${error}`);
      return { success: false, statusCode: 422, durationMs, rawText: rawResponseText, error };
    }

    const aiContent = parsedOuter.choices?.[0]?.message?.content || '';
    if (!aiContent || !aiContent.trim()) {
      const error = 'Empty AI Response: Vision model returned no text content in choices array.';
      console.error(`[OCR Debug Log] Error: ${error}`);
      return { success: false, statusCode: 422, durationMs, rawText: rawResponseText, error };
    }

    const cleanText = aiContent
      .replace(/```json/gi, '')
      .replace(/```/g, '')
      .trim();

    let parsedJson: Record<string, any> = {};
    try {
      parsedJson = JSON.parse(cleanText);
      console.log('==================== PARSED JSON DEBUG LOG ====================');
      console.log(JSON.stringify(parsedJson, null, 2));
      console.log('===============================================================');
    } catch (jsonErr: any) {
      const error = `JSON Parse Error: Failed to parse extracted JSON content (${jsonErr?.message}). Raw text: "${cleanText.slice(0, 200)}"`;
      console.error(`[OCR Debug Log] Error: ${error}`);
      return {
        success: false,
        statusCode: 422,
        durationMs,
        rawText: cleanText,
        error,
      };
    }

    return {
      success: true,
      statusCode: 200,
      durationMs,
      rawText: cleanText,
      parsed: parsedJson,
    };
  } catch (err: any) {
    clearTimeout(timeoutId);
    const durationMs = Math.round(performance.now() - startTime);

    if (err.name === 'AbortError') {
      const error = `Gateway Timeout: Request to Vision API timed out after ${timeoutMs}ms.`;
      console.error(`[OCR Debug Log] Error: ${error}`);
      return { success: false, statusCode: 504, durationMs, error };
    }

    const error = `Network Exception: ${err?.message || String(err)}`;
    console.error(`[OCR Debug Log] Error: ${error}`);
    return { success: false, statusCode: 500, durationMs, error };
  }
}
