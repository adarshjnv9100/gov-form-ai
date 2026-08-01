// ============================================================
// VERCEL SERVERLESS FUNCTION: /api/ocr
// Gemini OCR Endpoint placeholder.
// Accepts { documentUrl } and returns canonical JSON.
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

const DEFAULT_CANONICAL_SCHEMA = {
  full_name: null,
  father_name: null,
  mother_name: null,
  date_of_birth: null,
  gender: null,
  marital_status: null,
  aadhaar_number: null,
  pan_number: null,
  passport_number: null,
  driving_license_number: null,
  voter_id: null,
  mobile_number: null,
  email: null,
  address: null,
  city: null,
  district: null,
  state: null,
  country: null,
  pincode: null,
  bank_name: null,
  bank_account_number: null,
  ifsc_code: null,
  branch_name: null,
  annual_income: null,
  occupation: null,
  emergency_contact: null,
};

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

  return res.status(200).json({
    ...DEFAULT_CANONICAL_SCHEMA,
    documentUrl: documentUrl || '',
  });
}
