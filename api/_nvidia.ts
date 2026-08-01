// ============================================================
// SHARED BACKEND NVIDIA CLIENT & LOGGING MODULE
// Shared between /api/ocr and /api/nemotron.
// Never exposes API keys or secrets to the browser.
// ============================================================

export interface NvidiaCallResult {
  success: boolean;
  message?: string;
  content?: string;
  rawText?: string;
  parseError?: string;
  durationMs?: number;
  statusCode?: number;
}

/**
 * Reusable backend caller for NVIDIA Chat Completions API.
 * Never silently swallows JSON parsing failures or unhandled exceptions.
 */
export async function callNvidiaClient(
  apiKey: string,
  model: string,
  messages: Array<any>,
  temperature = 0.1,
  maxTokens = 1024
): Promise<NvidiaCallResult> {
  const startTime = performance.now();
  const endpoint = 'https://integrate.api.nvidia.com/v1/chat/completions';

  console.log(`[NVIDIA Client] Initiating request to model: ${model}`);

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

    const durationMs = Math.round(performance.now() - startTime);

    // Requirement 3: Log status and headers
    console.log(`[NVIDIA Client] Response Status: ${response.status} (${durationMs}ms)`);
    const headersObj: Record<string, string> = {};
    response.headers.forEach((val, key) => { headersObj[key] = val; });
    console.log(`[NVIDIA Client] Response Headers:`, JSON.stringify(headersObj));

    const rawText = await response.text();
    // Requirement 3: Log raw response
    console.log(`[NVIDIA Client] Raw Response snippet:`, rawText.slice(0, 500));

    if (!response.ok) {
      const msg = `NVIDIA Provider API error (HTTP ${response.status}): ${rawText || response.statusText}`;
      console.error(`[NVIDIA Client Error] ${msg}`);
      return {
        success: false,
        message: msg,
        rawText,
        durationMs,
        statusCode: response.status,
      };
    }

    let data: any = null;
    try {
      data = JSON.parse(rawText);
      console.log(`[NVIDIA Client] Parsed outer JSON successfully.`);
    } catch (parseErr: any) {
      // Requirement 3: Never silently swallow JSON parsing failures!
      const parseErrorMsg = `JSON parsing failed on NVIDIA outer response: ${parseErr?.message || String(parseErr)}`;
      console.error(`[NVIDIA Client JSON Parsing Error] ${parseErrorMsg}`);
      return {
        success: false,
        message: parseErrorMsg,
        rawText,
        parseError: parseErrorMsg,
        durationMs,
        statusCode: 422,
      };
    }

    const content = data.choices?.[0]?.message?.content || '';
    if (!content) {
      const msg = 'NVIDIA API response contained no choices or empty message content.';
      console.error(`[NVIDIA Client Error] ${msg}`);
      return {
        success: false,
        message: msg,
        rawText,
        durationMs,
        statusCode: 422,
      };
    }

    return {
      success: true,
      content,
      rawText,
      durationMs,
      statusCode: 200,
    };
  } catch (err: any) {
    const durationMs = Math.round(performance.now() - startTime);
    const msg = `Network error calling NVIDIA endpoint (${durationMs}ms): ${err?.message || String(err)}`;
    console.error(`[NVIDIA Client Exception] ${msg}`);
    return {
      success: false,
      message: msg,
      durationMs,
      statusCode: 500,
    };
  }
}
