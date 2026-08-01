import { ExtractedField } from '../types';

export interface KimiStructuredSchema {
  full_name: string;
  father_name: string;
  mother_name: string;
  date_of_birth: string;
  gender: string;
  aadhaar_number: string;
  pan_number: string;
  passport_number: string;
  driving_license_number: string;
  mobile_number: string;
  email: string;
  address: string;
  city: string;
  district: string;
  state: string;
  country: string;
  pincode: string;
  bank_name: string;
  bank_account_number: string;
  ifsc_code: string;
  branch_name: string;
  annual_income: string;
  occupation: string;
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
  rawOcrText: string;
  ocrDurationMs: number;
  overallConfidence: number;
}

export const REQUIRED_FIELDS_SCHEMA: Record<
  keyof KimiStructuredSchema,
  { label: string; isRequired: boolean; category: 'PERSONAL' | 'IDENTIFICATION' | 'ADDRESS' | 'TAX' | 'EMPLOYMENT' }
> = {
  full_name: { label: 'Full Legal Name', isRequired: true, category: 'PERSONAL' },
  father_name: { label: 'Father / Husband Name', isRequired: true, category: 'PERSONAL' },
  mother_name: { label: 'Mother Name', isRequired: false, category: 'PERSONAL' },
  date_of_birth: { label: 'Date of Birth (DD/MM/YYYY)', isRequired: true, category: 'PERSONAL' },
  gender: { label: 'Gender', isRequired: true, category: 'PERSONAL' },
  aadhaar_number: { label: 'Aadhaar Number (12 Digits)', isRequired: true, category: 'IDENTIFICATION' },
  pan_number: { label: 'PAN Number (10 Alphanumeric)', isRequired: true, category: 'IDENTIFICATION' },
  passport_number: { label: 'Passport Number', isRequired: false, category: 'IDENTIFICATION' },
  driving_license_number: { label: 'Driving License Number', isRequired: false, category: 'IDENTIFICATION' },
  mobile_number: { label: 'Mobile Phone Number', isRequired: true, category: 'PERSONAL' },
  email: { label: 'Email Address', isRequired: true, category: 'PERSONAL' },
  address: { label: 'Permanent Residential Address', isRequired: true, category: 'ADDRESS' },
  city: { label: 'City', isRequired: true, category: 'ADDRESS' },
  district: { label: 'District', isRequired: false, category: 'ADDRESS' },
  state: { label: 'State', isRequired: true, category: 'ADDRESS' },
  country: { label: 'Country', isRequired: false, category: 'ADDRESS' },
  pincode: { label: 'Pincode (6 Digits)', isRequired: true, category: 'ADDRESS' },
  bank_name: { label: 'Bank Name', isRequired: false, category: 'TAX' },
  bank_account_number: { label: 'Bank Account Number', isRequired: true, category: 'TAX' },
  ifsc_code: { label: 'Bank IFSC Code', isRequired: true, category: 'TAX' },
  branch_name: { label: 'Bank Branch Name', isRequired: false, category: 'TAX' },
  annual_income: { label: 'Annual Family Income', isRequired: true, category: 'TAX' },
  occupation: { label: 'Occupation / Profession', isRequired: true, category: 'PERSONAL' },
  emergency_contact: { label: 'Emergency Contact Number', isRequired: true, category: 'PERSONAL' },
};

/**
 * Synonym Dictionary mapping raw OCR key variations into canonical form keys
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

  // Mother Name
  mother_name: 'mother_name',
  mother: 'mother_name',
  "mother's_name": 'mother_name',

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

  // Passport
  passport: 'passport_number',
  passport_number: 'passport_number',
  passport_no: 'passport_number',

  // Driving License
  dl: 'driving_license_number',
  dl_number: 'driving_license_number',
  driving_license: 'driving_license_number',
  driving_licence: 'driving_license_number',
  license_number: 'driving_license_number',

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
  district: 'district',

  // State
  state: 'state',
  province: 'state',
  region: 'state',

  // Country
  country: 'country',
  nation: 'country',

  // Pincode
  pin: 'pincode',
  pin_code: 'pincode',
  zipcode: 'pincode',
  postal_code: 'pincode',
  pincode: 'pincode',
  zip: 'pincode',

  // Bank Name
  bank: 'bank_name',
  bank_name: 'bank_name',

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

  // Branch Name
  branch: 'branch_name',
  branch_name: 'branch_name',

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
};

/**
 * Step 5: Normalizes raw values (Aadhaar formatting, IFSC uppercase, clean phones, dates)
 */
export function normalizeOCRFields(rawJson: Record<string, any>): Record<string, any> {
  const normalized: Record<string, any> = {};

  Object.entries(rawJson).forEach(([rawKey, value]) => {
    if (value === null || value === undefined) return;

    const valStr = typeof value === 'string' ? value.trim() : String(value).trim();
    if (valStr === '' || valStr.toLowerCase() === 'null') return;

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
      }
    } else {
      normalized[cleanKey] = valStr;
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

  /**
   * Step 5: Normalize and Validate Individual Fields
   */
  public static validateField(
    key: keyof KimiStructuredSchema,
    rawValue: string,
    defaultConf: number = 95
  ): { value: string; confidence: number } {
    if (!rawValue || typeof rawValue !== 'string') {
      return { value: '', confidence: 0 };
    }

    const val = rawValue.trim();
    if (val === '' || val.toLowerCase() === 'null') {
      return { value: '', confidence: 0 };
    }

    // DEMO DATA GUARD: Reject fake values
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
          return { value: formatted, confidence: Math.max(defaultConf, 98) };
        }
        return { value: val, confidence: 75 };
      }

      case 'pan_number': {
        const cleanPan = val.toUpperCase().trim();
        if (PATTERNS.pan.test(cleanPan)) {
          return { value: cleanPan, confidence: Math.max(defaultConf, 97) };
        }
        return { value: cleanPan, confidence: 75 };
      }

      case 'mobile_number':
      case 'emergency_contact': {
        const cleanDigits = val.replace(/[^\d+]/g, '');
        if (PATTERNS.mobile.test(val) || cleanDigits.length >= 10) {
          return { value: val, confidence: Math.max(defaultConf, 96) };
        }
        return { value: val, confidence: 75 };
      }

      case 'email': {
        if (PATTERNS.email.test(val)) {
          return { value: val.toLowerCase(), confidence: Math.max(defaultConf, 98) };
        }
        return { value: val, confidence: 75 };
      }

      case 'date_of_birth': {
        if (PATTERNS.dob.test(val) || !isNaN(Date.parse(val))) {
          return { value: val, confidence: Math.max(defaultConf, 97) };
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
          return { value: cleanPin, confidence: Math.max(defaultConf, 97) };
        }
        return { value: val, confidence: 75 };
      }

      case 'ifsc_code': {
        if (PATTERNS.ifsc.test(val) || val.length === 11) {
          return { value: val.toUpperCase(), confidence: Math.max(defaultConf, 96) };
        }
        return { value: val.toUpperCase(), confidence: 75 };
      }

      case 'bank_account_number': {
        const cleanAcc = val.replace(/\D/g, '');
        if (cleanAcc.length >= 9) {
          return { value: cleanAcc, confidence: Math.max(defaultConf, 95) };
        }
        return { value: val, confidence: 75 };
      }

      default:
        return { value: val, confidence: defaultConf };
    }
  }

  /**
   * Production-Quality 10-Step OCR Extraction Pipeline
   */
  public static async extractDocumentJSON(
    documentUrl: string,
    fileType?: string
  ): Promise<KimiExtractionResult> {
    const startTime = performance.now();
    const apiKey = this.apiKey;
    const nvidiaEndpoint = 'https://integrate.api.nvidia.com/v1/chat/completions';

    // Step 4 System Prompt
    const systemPrompt = `You are an information extraction engine. Extract only information explicitly present in the OCR text. Never invent values. Return valid JSON only.

Schema:
{
  "full_name": null,
  "father_name": null,
  "mother_name": null,
  "dob": null,
  "gender": null,
  "aadhaar_number": null,
  "pan_number": null,
  "passport_number": null,
  "driving_license_number": null,
  "mobile_number": null,
  "email": null,
  "address": null,
  "city": null,
  "district": null,
  "state": null,
  "country": null,
  "postal_code": null,
  "bank_name": null,
  "bank_account_number": null,
  "ifsc_code": null,
  "branch_name": null,
  "annual_income": null,
  "occupation": null,
  "emergency_contact": null,
  "confidence": {}
}

For every field, if not found in the document, set value as null. Never guess.`;

    const requestBody = {
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
    };

    console.log('Sending to OCR', requestBody);

    let rawOcrText = '';
    let parsed: Record<string, any> = {};

    try {
      const response = await fetch(nvidiaEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(requestBody),
      });

      const durationMs = Math.round(performance.now() - startTime);

      if (response.ok) {
        const data = await response.json();
        console.log('OCR Raw Response', data);

        rawOcrText = data.choices?.[0]?.message?.content || '';
        const cleanedJsonText = rawOcrText.replace(/```json/gi, '').replace(/```/g, '').trim();

        try {
          parsed = JSON.parse(cleanedJsonText);
          console.log('Parsed JSON', parsed);
        } catch (parseError) {
          console.error('Parser Error:', parseError);
        }

        const keysWithValue = Object.keys(parsed).filter(
          (k) => parsed[k] !== null && parsed[k] !== undefined && parsed[k] !== '' && parsed[k] !== 'null'
        );

        // Step 9: Check if OCR returned empty
        if (keysWithValue.length === 0) {
          console.log('No information could be extracted from this document.');
        }

        // Step 2 & 8: Debug Logs
        console.log('Uploaded filename:', documentUrl.split('/').pop() || 'document');
        console.log('Cloudinary URL:', documentUrl);
        console.log('OCR duration:', `${durationMs}ms`);
        console.log('Raw OCR text:', rawOcrText);

        return this.processSemanticOutput(parsed, rawOcrText, durationMs);
      }
    } catch (e) {
      console.warn('Kimi API call error:', e);
    }

    const durationMs = Math.round(performance.now() - startTime);
    console.log('No information could be extracted from this document.');
    return this.getSemanticFallback(durationMs);
  }

  private static processSemanticOutput(
    parsed: Record<string, any>,
    rawOcrText: string,
    durationMs: number
  ): KimiExtractionResult {
    const normalized = normalizeOCRFields(parsed);
    console.log('Mapped Fields', normalized);

    if (Object.keys(normalized).length === 0) {
      console.log('Mapping failed.');
    }

    const rawSchema: KimiStructuredSchema = {
      full_name: normalized.full_name || '',
      father_name: normalized.father_name || '',
      mother_name: normalized.mother_name || '',
      date_of_birth: normalized.date_of_birth || normalized.dob || '',
      gender: normalized.gender || '',
      aadhaar_number: normalized.aadhaar_number || '',
      pan_number: normalized.pan_number || '',
      passport_number: normalized.passport_number || '',
      driving_license_number: normalized.driving_license_number || '',
      mobile_number: normalized.mobile_number || '',
      email: normalized.email || '',
      address: normalized.address || '',
      city: normalized.city || '',
      district: normalized.district || '',
      state: normalized.state || '',
      country: normalized.country || '',
      pincode: normalized.pincode || normalized.postal_code || '',
      bank_name: normalized.bank_name || '',
      bank_account_number: normalized.bank_account_number || '',
      ifsc_code: normalized.ifsc_code || '',
      branch_name: normalized.branch_name || '',
      annual_income: normalized.annual_income || '',
      occupation: normalized.occupation || '',
      emergency_contact: normalized.emergency_contact || '',
    };

    return this.buildValidatedResult(rawSchema, rawOcrText, durationMs);
  }

  private static getSemanticFallback(durationMs: number = 0): KimiExtractionResult {
    const rawSchema: KimiStructuredSchema = {
      full_name: '',
      father_name: '',
      mother_name: '',
      date_of_birth: '',
      gender: '',
      aadhaar_number: '',
      pan_number: '',
      passport_number: '',
      driving_license_number: '',
      mobile_number: '',
      email: '',
      address: '',
      city: '',
      district: '',
      state: '',
      country: '',
      pincode: '',
      bank_name: '',
      bank_account_number: '',
      ifsc_code: '',
      branch_name: '',
      annual_income: '',
      occupation: '',
      emergency_contact: '',
    };

    return this.buildValidatedResult(rawSchema, '', durationMs);
  }

  private static buildValidatedResult(
    rawSchema: KimiStructuredSchema,
    rawOcrText: string,
    durationMs: number
  ): KimiExtractionResult {
    const keys = Object.keys(REQUIRED_FIELDS_SCHEMA) as (keyof KimiStructuredSchema)[];
    const structured: Partial<KimiStructuredSchema> = {};
    const confidences: Record<keyof KimiStructuredSchema, number> = {} as any;
    const fields: ExtractedFieldDetail[] = [];

    let totalConf = 0;
    let countedFields = 0;

    keys.forEach((key, idx) => {
      const meta = REQUIRED_FIELDS_SCHEMA[key];
      const rawVal = rawSchema[key] || '';
      const validation = this.validateField(key, rawVal);

      structured[key] = validation.value;
      confidences[key] = validation.confidence;

      if (validation.value && validation.value.trim() !== '') {
        totalConf += validation.confidence;
        countedFields++;
      }

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

    const overallConfidence = countedFields > 0 ? Math.round(totalConf / countedFields) : 0;
    console.log('OCR confidence:', `${overallConfidence}%`);

    return {
      structured: structured as KimiStructuredSchema,
      confidences,
      fields,
      rawOcrText,
      ocrDurationMs: durationMs,
      overallConfidence,
    };
  }
}
