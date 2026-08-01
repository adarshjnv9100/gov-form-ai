// ============================================================
// SERVERLESS FUNCTION: /api/ocr
// Performs multimodal AI OCR extraction using NVIDIA Vision API Catalog.
// Includes full pre-flight & post-flight logging.
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

const ENDPOINT = 'https://integrate.api.nvidia.com/v1/chat/completions';

const SYSTEM_PROMPT = `You are a Senior AI Multimodal Document Parser specializing in Indian government documents (such as Aadhaar, PAN, Passport, Driving Licence, Voter ID, Bank Passbook).
Analyze the uploaded document image and extract values for all visible fields.

Return ONLY a valid JSON object matching this exact schema:
{
  "full_name": null,
  "father_name": null,
  "mother_name": null,
  "date_of_birth": null,
  "gender": null,
  "marital_status": null,
  "aadhaar_number": null,
  "pan_number": null,
  "passport_number": null,
  "driving_license_number": null,
  "voter_id": null,
  "mobile_number": null,
  "email": null,
  "address": null,
  "city": null,
  "district": null,
  "state": null,
  "country": null,
  "pincode": null,
  "bank_name": null,
  "bank_account_number": null,
  "ifsc_code": null,
  "branch_name": null,
  "annual_income": null,
  "occupation": null,
  "emergency_contact": null
}

RULES:
- Extract real values explicitly visible in the document.
- If a field is not visible in the document, set its value to null.
- For Aadhaar cards: extract name, father/husband name (S/O, D/O, W/O, C/O), DOB (DD/MM/YYYY), gender (Male/Female), 12-digit Aadhaar number, full address, and 6-digit pincode.
- Return ONLY the raw JSON object with no markdown fences, commentary, or extra text.`;

function getApiKey(): string {
  return (
    process.env.NVIDIA_API_KEY ||
    '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'
  ).trim();
}

function getModel(): string {
  const customModel = (process.env.NVIDIA_MODEL || '').trim();
  if (customModel && !customModel.includes('kimi') && customModel.includes('/')) {
    return customModel;
  }
  return 'meta/llama-3.2-11b-vision-instruct';
}

function convertPdfUrlToImageUrl(documentUrl: string): string {
  if (!documentUrl || typeof documentUrl !== 'string') return documentUrl;

  const url = documentUrl.trim();

  // Cloudinary PDF conversion: convert /raw/upload/ or /image/upload/ to page 1 JPEG
  if (url.includes('cloudinary.com')) {
    if (url.includes('/raw/upload/')) {
      return url
        .replace('/raw/upload/', '/image/upload/f_jpg,pg_1/')
        .replace(/\.pdf$/i, '.jpg');
    }
    if (url.includes('/image/upload/') && url.endsWith('.pdf')) {
      return url
        .replace('/image/upload/', '/image/upload/f_jpg,pg_1/')
        .replace(/\.pdf$/i, '.jpg');
    }
  }

  return url;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  const { documentUrl } = req.body || {};

  if (!documentUrl || typeof documentUrl !== 'string' || documentUrl.trim() === '') {
    console.error('[api/ocr Error] Payload verification failed: documentUrl is required');
    return res.status(400).json({
      success: false,
      message: "Payload must contain 'documentUrl' as a non-empty string.",
    });
  }

  const apiKey = getApiKey();
  const model = getModel();
  const visionTargetUrl = convertPdfUrlToImageUrl(documentUrl);

  const payload = {
    model,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: SYSTEM_PROMPT },
          { type: 'image_url', image_url: { url: visionTargetUrl } },
        ],
      },
    ],
    max_tokens: 1024,
    temperature: 0.1,
    top_p: 1.0,
  };

  // Requirement 4: Log BEFORE sending
  console.log('==================== BEFORE SENDING OCR REQUEST ====================');
  console.log('Cloudinary URL (Original):', documentUrl);
  console.log('Vision Target URL (Converted):', visionTargetUrl);
  console.log('Model:', model);
  console.log('Endpoint:', ENDPOINT);
  console.log('Prompt:', SYSTEM_PROMPT);
  console.log('Payload:', JSON.stringify(payload, null, 2));
  console.log('====================================================================');

  const startTime = performance.now();

  try {
    const nvidiaResponse = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    const durationMs = Math.round(performance.now() - startTime);

    // Requirement 5: Log AFTER receiving
    console.log('==================== AFTER RECEIVING OCR RESPONSE ====================');
    console.log('HTTP Status:', nvidiaResponse.status, `(${durationMs}ms)`);
    const headersObj: Record<string, string> = {};
    nvidiaResponse.headers.forEach((v, k) => { headersObj[k] = v; });
    console.log('Response Headers:', JSON.stringify(headersObj, null, 2));

    const responseBodyText = await nvidiaResponse.text();
    console.log('Complete Response Body:', responseBodyText);
    console.log('=====================================================================');

    if (!nvidiaResponse.ok) {
      console.error(`[api/ocr Error] NVIDIA API HTTP ${nvidiaResponse.status}:`, responseBodyText);
      return res.status(nvidiaResponse.status).json({
        success: false,
        message: `NVIDIA Provider API error (HTTP ${nvidiaResponse.status}): ${responseBodyText}`,
        status: nvidiaResponse.status,
        responseBodyText,
      });
    }

    let parsedNvidiaRes: any = null;
    try {
      parsedNvidiaRes = JSON.parse(responseBodyText);
    } catch (parseErr: any) {
      console.error('[api/ocr Error] Failed to parse NVIDIA outer JSON response:', parseErr);
      return res.status(422).json({
        success: false,
        message: `Failed to parse NVIDIA response JSON: ${parseErr?.message}`,
        responseBodyText,
      });
    }

    const aiContent = parsedNvidiaRes.choices?.[0]?.message?.content || '';
    const cleanJsonText = aiContent.replace(/```json/gi, '').replace(/```/g, '').trim();

    // Requirement 6 & 7: Parse response and extract JSON
    let extractedJson: Record<string, any> = {};
    try {
      extractedJson = JSON.parse(cleanJsonText);
    } catch (jsonErr: any) {
      console.error('[api/ocr Error] Failed to parse document extraction JSON from AI text:', jsonErr);
      return res.status(422).json({
        success: false,
        message: `Failed to parse document extraction JSON: ${jsonErr?.message}`,
        rawText: cleanJsonText,
      });
    }

    // Requirement 7: Print ONLY the extracted JSON
    console.log('==================== EXTRACTED JSON OUTPUT ====================');
    console.log(JSON.stringify(extractedJson, null, 2));
    console.log('==============================================================');

    return res.status(200).json({
      success: true,
      documentUrl,
      visionTargetUrl,
      model,
      durationMs,
      rawText: cleanJsonText,
      parsed: extractedJson,
    });
  } catch (err: any) {
    console.error('[api/ocr Exception] Network error:', err);
    return res.status(500).json({
      success: false,
      message: `Network error connecting to NVIDIA API: ${err?.message || String(err)}`,
    });
  }
}
