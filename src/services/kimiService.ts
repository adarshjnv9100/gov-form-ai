import { ExtractedField } from '../types';

export interface KimiStructuredSchema {
  full_name: string;
  father_name: string;
  date_of_birth: string;
  gender: string;
  aadhaar_number: string;
  pan_number: string;
  mobile_number: string;
  email: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  annual_income: string;
  bank_account_number: string;
  ifsc_code: string;
  occupation: string;
  marital_status: string;
  emergency_contact: string;
}

export interface ExtractedFieldDetail {
  id: string;
  key: keyof KimiStructuredSchema;
  label: string;
  value: string;
  confidence: number;
  isMissing: boolean;
  isLowConfidence: boolean;
  isRequired: boolean;
  category: 'PERSONAL' | 'IDENTIFICATION' | 'ADDRESS' | 'TAX' | 'EMPLOYMENT';
}

export interface KimiExtractionResult {
  structured: KimiStructuredSchema;
  confidences: Record<keyof KimiStructuredSchema, number>;
  fields: ExtractedFieldDetail[];
  rawText?: string;
}

export const REQUIRED_FIELDS_SCHEMA: Record<
  keyof KimiStructuredSchema,
  { label: string; isRequired: boolean; category: 'PERSONAL' | 'IDENTIFICATION' | 'ADDRESS' | 'TAX' | 'EMPLOYMENT' }
> = {
  full_name: { label: 'Full Legal Name', isRequired: true, category: 'PERSONAL' },
  father_name: { label: 'Father / Husband Name', isRequired: true, category: 'PERSONAL' },
  date_of_birth: { label: 'Date of Birth (DD/MM/YYYY)', isRequired: true, category: 'PERSONAL' },
  gender: { label: 'Gender', isRequired: true, category: 'PERSONAL' },
  aadhaar_number: { label: 'Aadhaar Number (12 Digits)', isRequired: true, category: 'IDENTIFICATION' },
  pan_number: { label: 'PAN Number (10 Alphanumeric)', isRequired: true, category: 'IDENTIFICATION' },
  mobile_number: { label: 'Mobile Phone Number', isRequired: true, category: 'PERSONAL' },
  email: { label: 'Email Address', isRequired: true, category: 'PERSONAL' },
  address: { label: 'Permanent Residential Address', isRequired: true, category: 'ADDRESS' },
  city: { label: 'City', isRequired: true, category: 'ADDRESS' },
  state: { label: 'State', isRequired: true, category: 'ADDRESS' },
  pincode: { label: 'Pincode (6 Digits)', isRequired: true, category: 'ADDRESS' },
  annual_income: { label: 'Annual Family Income', isRequired: true, category: 'TAX' },
  bank_account_number: { label: 'Bank Account Number', isRequired: true, category: 'TAX' },
  ifsc_code: { label: 'Bank IFSC Code', isRequired: true, category: 'TAX' },
  occupation: { label: 'Occupation / Profession', isRequired: true, category: 'PERSONAL' },
  marital_status: { label: 'Marital Status', isRequired: true, category: 'PERSONAL' },
  emergency_contact: { label: 'Emergency Contact Number', isRequired: true, category: 'PERSONAL' },
};

/**
 * Extensive Synonym Dictionary mapping raw OCR variations into canonical form keys
 */
export const CANONICAL_SYNONYMS: Record<string, keyof KimiStructuredSchema> = {
  // Full Name
  full_name: 'full_name',
  fullname: 'full_name',
  'full name': 'full_name',
  citizen_name: 'full_name',
  applicant_name: 'full_name',
  applicant: 'full_name',
  name: 'full_name',
  person_name: 'full_name',
  legal_name: 'full_name',
  candidate_name: 'full_name',
  beneficiary_name: 'full_name',

  // Father Name
  father_name: 'father_name',
  father: 'father_name',
  "father's_name": 'father_name',
  "father's name": 'father_name',
  fathername: 'father_name',
  guardian_name: 'father_name',
  parent_name: 'father_name',
  husband_name: 'father_name',
  father_or_husband: 'father_name',

  // DOB
  dob: 'date_of_birth',
  birth_date: 'date_of_birth',
  date_of_birth: 'date_of_birth',
  'd.o.b': 'date_of_birth',
  birthdate: 'date_of_birth',
  'date birth': 'date_of_birth',
  birthday: 'date_of_birth',
  birth: 'date_of_birth',

  // Gender
  gender: 'gender',
  sex: 'gender',

  // Aadhaar
  aadhaar: 'aadhaar_number',
  aadhaar_number: 'aadhaar_number',
  aadhaar_no: 'aadhaar_number',
  aadhar: 'aadhaar_number',
  adhar: 'aadhaar_number',
  aadhar_number: 'aadhaar_number',
  uid: 'aadhaar_number',
  uidai: 'aadhaar_number',
  uid_number: 'aadhaar_number',
  unique_id: 'aadhaar_number',

  // PAN
  pan: 'pan_number',
  pan_number: 'pan_number',
  pan_no: 'pan_number',
  permanent_account_number: 'pan_number',
  tax_id: 'pan_number',
  tax_number: 'pan_number',

  // Mobile
  mobile: 'mobile_number',
  mobile_number: 'mobile_number',
  phone: 'mobile_number',
  phone_number: 'mobile_number',
  contact: 'mobile_number',
  contact_number: 'mobile_number',
  telephone: 'mobile_number',
  cell: 'mobile_number',
  cellphone: 'mobile_number',
  'mobile no': 'mobile_number',

  // Emergency Contact
  emergency_contact: 'emergency_contact',
  guardian_phone: 'emergency_contact',
  secondary_contact: 'emergency_contact',
  alternate_contact: 'emergency_contact',
  alternate_mobile: 'emergency_contact',
  parent_phone: 'emergency_contact',
  emergency_phone: 'emergency_contact',

  // Email
  email: 'email',
  email_address: 'email',
  mail: 'email',
  e_mail: 'email',

  // Address
  address: 'address',
  address_line: 'address',
  residential_address: 'address',
  permanent_address: 'address',
  current_address: 'address',
  home_address: 'address',
  street_address: 'address',

  // City / District
  city: 'city',
  town: 'city',
  municipality: 'city',
  locality: 'city',
  district: 'city',

  // State
  state: 'state',
  province: 'state',
  region: 'state',

  // Pincode
  pin: 'pincode',
  pin_code: 'pincode',
  zipcode: 'pincode',
  postal_code: 'pincode',
  pincode: 'pincode',
  zip: 'pincode',

  // Bank Account Number
  bank_account: 'bank_account_number',
  bank_account_number: 'bank_account_number',
  account_number: 'bank_account_number',
  account_no: 'bank_account_number',
  acct_no: 'bank_account_number',
  account: 'bank_account_number',
  saving_account: 'bank_account_number',
  current_account: 'bank_account_number',

  // IFSC Code
  ifsc: 'ifsc_code',
  ifsc_code: 'ifsc_code',
  bank_ifsc: 'ifsc_code',
  branch_ifsc: 'ifsc_code',
  ifs_code: 'ifsc_code',

  // Annual Income
  income: 'annual_income',
  salary: 'annual_income',
  annual_income: 'annual_income',
  family_income: 'annual_income',
  gross_income: 'annual_income',
  yearly_income: 'annual_income',
  annual_salary: 'annual_income',

  // Occupation
  occupation: 'occupation',
  profession: 'occupation',
  job_title: 'occupation',

  // Marital Status
  marital_status: 'marital_status',
  marriage_status: 'marital_status',
};

/**
 * Normalizes raw OCR dictionary keys into canonical schema keys
 */
export function normalizeOCRFields(rawJson: Record<string, any>): Record<string, any> {
  const normalized: Record<string, any> = {};

  Object.entries(rawJson).forEach(([rawKey, value]) => {
    if (value === null || value === undefined) return;

    const valStr = typeof value === 'string' ? value.trim() : String(value).trim();
    if (valStr === '') return;

    const cleanKey = rawKey.toLowerCase().trim();
    const cleanSpaceKey = cleanKey.replace(/_/g, ' ');
    const cleanUnderscoreKey = cleanKey.replace(/\s+/g, '_');

    const canonicalKey =
      CANONICAL_SYNONYMS[cleanKey] ||
      CANONICAL_SYNONYMS[cleanSpaceKey] ||
      CANONICAL_SYNONYMS[cleanUnderscoreKey];

    if (canonicalKey) {
      if (!normalized[canonicalKey]) {
        normalized[canonicalKey] = valStr;
        console.log(`Mapped: ${rawKey} -> ${canonicalKey}`);
      }
    } else {
      normalized[cleanKey] = valStr;
      console.warn(`Unknown OCR key: ${rawKey}`);
    }
  });

  return normalized;
}

const PATTERNS = {
  pan: /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/,
  ifsc: /^[A-Z]{4}0[A-Z0-9]{6}$/,
  mobile: /^(\+91[\-\s]?)?[0-9]{10}$/,
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  dob: /^\d{2}\/\d{2}\/\d{4}$/,
};

export class KimiService {
  private static get apiKey(): string {
    return (
      import.meta.env.VITE_NVIDIA_API_KEY ||
      import.meta.env.NVIDIA_API_KEY ||
      import.meta.env.VITE_KIMI_API_KEY ||
      import.meta.env.KIMI_API_KEY ||
      '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'
    );
  }

  public static validateField(
    key: keyof KimiStructuredSchema,
    rawValue: string,
    defaultConf: number = 95
  ): { value: string; confidence: number } {
    if (!rawValue || typeof rawValue !== 'string') {
      return { value: '', confidence: 0 };
    }

    const val = rawValue.trim();
    if (val === '') {
      return { value: '', confidence: 0 };
    }

    // DEMO DATA GUARD: Reject any demo strings and log runtime error
    const DEMO_BLOCKED_TERMS = [
      'RAHUL VIKRAM VERMA',
      'SURESH VERMA',
      '4589 1029 3847',
      '458910293847',
      'ABCDE1234F',
      'rahul.verma@gov.ai',
      'Flat 402',
      'HighTech Heights',
      'Silicon City',
      'INR 14,50,000',
    ];

    if (DEMO_BLOCKED_TERMS.some((term) => val.toUpperCase().includes(term.toUpperCase()))) {
      console.error('[Demo Data Guard Error] Demo data detected. Runtime fallback is still active.', { key, rawValue });
      return { value: '', confidence: 0 };
    }

    switch (key) {
      case 'aadhaar_number': {
        const cleanDigits = val.replace(/\s+/g, '');
        if (cleanDigits.length === 12 && /^\d+$/.test(cleanDigits)) {
          const formatted = `${cleanDigits.slice(0, 4)} ${cleanDigits.slice(4, 8)} ${cleanDigits.slice(8, 12)}`;
          return { value: formatted, confidence: Math.max(defaultConf, 96) };
        }
        return { value: val, confidence: 75 }; // Mark as Needs Review if format not exact
      }

      case 'pan_number': {
        const cleanPan = val.toUpperCase().trim();
        if (PATTERNS.pan.test(cleanPan)) {
          return { value: cleanPan, confidence: Math.max(defaultConf, 95) };
        }
        return { value: cleanPan, confidence: 75 };
      }

      case 'mobile_number':
      case 'emergency_contact': {
        const cleanDigits = val.replace(/[^\d+]/g, '');
        if (PATTERNS.mobile.test(val) || cleanDigits.length >= 10) {
          return { value: val, confidence: Math.max(defaultConf, 94) };
        }
        return { value: val, confidence: 75 };
      }

      case 'email': {
        if (PATTERNS.email.test(val)) {
          return { value: val.toLowerCase(), confidence: Math.max(defaultConf, 97) };
        }
        return { value: val, confidence: 75 };
      }

      case 'date_of_birth': {
        if (PATTERNS.dob.test(val) || !isNaN(Date.parse(val))) {
          return { value: val, confidence: Math.max(defaultConf, 96) };
        }
        return { value: val, confidence: 75 };
      }

      case 'gender': {
        const lower = val.toLowerCase();
        if (['male', 'female', 'other', 'm', 'f'].includes(lower)) {
          const formatted = lower.startsWith('m') ? 'Male' : lower.startsWith('f') ? 'Female' : 'Other';
          return { value: formatted, confidence: Math.max(defaultConf, 98) };
        }
        return { value: val, confidence: 75 };
      }

      case 'pincode': {
        const cleanPin = val.replace(/\D/g, '');
        if (cleanPin.length === 6) {
          return { value: cleanPin, confidence: Math.max(defaultConf, 96) };
        }
        return { value: val, confidence: 75 };
      }

      case 'ifsc_code': {
        if (PATTERNS.ifsc.test(val) || val.length === 11) {
          return { value: val.toUpperCase(), confidence: Math.max(defaultConf, 95) };
        }
        return { value: val.toUpperCase(), confidence: 75 };
      }

      case 'bank_account_number': {
        const cleanAcc = val.replace(/\D/g, '');
        if (cleanAcc.length >= 9) {
          return { value: cleanAcc, confidence: Math.max(defaultConf, 92) };
        }
        return { value: val, confidence: 75 };
      }

      default:
        return { value: val, confidence: defaultConf };
    }
  }

  public static async extractDocumentJSON(
    documentUrl: string,
    fileType?: string
  ): Promise<KimiExtractionResult> {
    const apiKey = this.apiKey;
    const nvidiaEndpoint = 'https://integrate.api.nvidia.com/v1/chat/completions';

    const systemPrompt = `You are a Senior AI Document Parser.
Analyze the uploaded document image/PDF and extract values for all 18 required government form fields.

Return ONLY valid JSON matching this schema:
{
  "full_name": "Full legal name",
  "father_name": "Father or husband name",
  "date_of_birth": "DD/MM/YYYY",
  "gender": "Male, Female, or Other",
  "aadhaar_number": "12-digit Aadhaar number",
  "pan_number": "10-character PAN format AAAAA9999A",
  "mobile_number": "10-digit phone number",
  "email": "Valid email address",
  "address": "Full residential address",
  "city": "City name",
  "state": "State name",
  "pincode": "6-digit pincode",
  "annual_income": "Declared annual income",
  "bank_account_number": "Bank account number",
  "ifsc_code": "Bank IFSC code",
  "occupation": "Profession/Occupation",
  "marital_status": "Marital status",
  "emergency_contact": "Emergency contact number"
}

If a field is not present in the document, set value as empty string "". Never invent or use fake values.`;

    try {
      const response = await fetch(nvidiaEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'moonshotai/kimi-k2.6-vision',
          messages: [
            { role: 'system', content: systemPrompt },
            {
              role: 'user',
              content: `Perform OCR extraction for uploaded document URL: ${documentUrl}`,
            },
          ],
          temperature: 0.1,
          max_tokens: 1024,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const rawContent = data.choices?.[0]?.message?.content || '';
        const cleanedJsonText = rawContent.replace(/```json/gi, '').replace(/```/g, '').trim();
        const parsed = JSON.parse(cleanedJsonText);
        return this.processSemanticOutput(parsed);
      }
    } catch (e) {
      console.warn('Kimi API call error:', e);
    }

    return this.getSemanticFallback();
  }

  private static processSemanticOutput(parsed: Record<string, any>): KimiExtractionResult {
    const normalized = normalizeOCRFields(parsed);

    const rawSchema: KimiStructuredSchema = {
      full_name: normalized.full_name || '',
      father_name: normalized.father_name || '',
      date_of_birth: normalized.date_of_birth || '',
      gender: normalized.gender || '',
      aadhaar_number: normalized.aadhaar_number || '',
      pan_number: normalized.pan_number || '',
      mobile_number: normalized.mobile_number || '',
      email: normalized.email || '',
      address: normalized.address || '',
      city: normalized.city || '',
      state: normalized.state || '',
      pincode: normalized.pincode || '',
      annual_income: normalized.annual_income || '',
      bank_account_number: normalized.bank_account_number || '',
      ifsc_code: normalized.ifsc_code || '',
      occupation: normalized.occupation || '',
      marital_status: normalized.marital_status || '',
      emergency_contact: normalized.emergency_contact || '',
    };

    return this.buildValidatedResult(rawSchema);
  }

  private static getSemanticFallback(): KimiExtractionResult {
    const rawSchema: KimiStructuredSchema = {
      full_name: '',
      father_name: '',
      date_of_birth: '',
      gender: '',
      aadhaar_number: '',
      pan_number: '',
      mobile_number: '',
      email: '',
      address: '',
      city: '',
      state: '',
      pincode: '',
      annual_income: '',
      bank_account_number: '',
      ifsc_code: '',
      occupation: '',
      marital_status: '',
      emergency_contact: '',
    };

    return this.buildValidatedResult(rawSchema);
  }

  private static buildValidatedResult(rawSchema: KimiStructuredSchema): KimiExtractionResult {
    const keys = Object.keys(REQUIRED_FIELDS_SCHEMA) as (keyof KimiStructuredSchema)[];
    const structured: Partial<KimiStructuredSchema> = {};
    const confidences: Record<keyof KimiStructuredSchema, number> = {} as any;
    const fields: ExtractedFieldDetail[] = [];

    keys.forEach((key, idx) => {
      const meta = REQUIRED_FIELDS_SCHEMA[key];
      const rawVal = rawSchema[key] || '';
      const validation = this.validateField(key, rawVal);

      structured[key] = validation.value;
      confidences[key] = validation.confidence;

      const isMissing = !validation.value || validation.value.trim() === '';
      const isLowConfidence = validation.confidence > 0 && validation.confidence < 80;

      fields.push({
        id: `field_${key}_${idx + 1}`,
        key,
        label: meta.label,
        value: validation.value,
        confidence: validation.confidence,
        isMissing,
        isLowConfidence,
        isRequired: meta.isRequired,
        category: meta.category,
      });
    });

    return {
      structured: structured as KimiStructuredSchema,
      confidences,
      fields,
      rawText: JSON.stringify(rawSchema),
    };
  }
}
