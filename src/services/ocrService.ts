// ============================================================
// OCR SERVICE
// Sends Cloudinary URLs to the backend /api/ocr route.
// The backend proxies the call to NVIDIA Kimi K2.6 Vision.
// The NVIDIA API key is NEVER present in this file.
// ============================================================

import { ExtractedField, FieldCategory } from '../types';

// ── Schema ────────────────────────────────────────────────

export interface CanonicalSchema {
  full_name: string;
  father_name: string;
  mother_name: string;
  date_of_birth: string;
  gender: string;
  marital_status: string;
  aadhaar_number: string;
  pan_number: string;
  passport_number: string;
  driving_license_number: string;
  voter_id: string;
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

export type CanonicalKey = keyof CanonicalSchema;

export interface FieldMeta {
  label: string;
  isRequired: boolean;
  category: FieldCategory;
}

// ── Field Schema (source of truth for labels & categories) ─

export const FIELD_SCHEMA: Record<CanonicalKey, FieldMeta> = {
  full_name:             { label: 'Full Legal Name',               isRequired: true,  category: 'PERSONAL' },
  father_name:           { label: 'Father / Husband Name',         isRequired: true,  category: 'PERSONAL' },
  mother_name:           { label: 'Mother Name',                   isRequired: false, category: 'PERSONAL' },
  date_of_birth:         { label: 'Date of Birth (DD/MM/YYYY)',    isRequired: true,  category: 'PERSONAL' },
  gender:                { label: 'Gender',                        isRequired: true,  category: 'PERSONAL' },
  marital_status:        { label: 'Marital Status',                isRequired: false, category: 'PERSONAL' },
  aadhaar_number:        { label: 'Aadhaar Number (12 Digits)',    isRequired: true,  category: 'IDENTIFICATION' },
  pan_number:            { label: 'PAN Number (10 Alphanumeric)',  isRequired: true,  category: 'IDENTIFICATION' },
  passport_number:       { label: 'Passport Number',               isRequired: false, category: 'IDENTIFICATION' },
  driving_license_number:{ label: 'Driving License Number',        isRequired: false, category: 'IDENTIFICATION' },
  voter_id:              { label: 'Voter ID (EPIC Number)',         isRequired: false, category: 'IDENTIFICATION' },
  mobile_number:         { label: 'Mobile Phone Number',           isRequired: true,  category: 'PERSONAL' },
  email:                 { label: 'Email Address',                 isRequired: true,  category: 'PERSONAL' },
  address:               { label: 'Permanent Residential Address', isRequired: true,  category: 'ADDRESS' },
  city:                  { label: 'City / Town',                   isRequired: true,  category: 'ADDRESS' },
  district:              { label: 'District',                      isRequired: false, category: 'ADDRESS' },
  state:                 { label: 'State / Province',             isRequired: true,  category: 'ADDRESS' },
  country:               { label: 'Country',                       isRequired: false, category: 'ADDRESS' },
  pincode:               { label: 'Pincode (6 Digits)',            isRequired: true,  category: 'ADDRESS' },
  bank_name:             { label: 'Bank Name',                     isRequired: false, category: 'FINANCIAL' },
  bank_account_number:   { label: 'Bank Account Number',          isRequired: true,  category: 'FINANCIAL' },
  ifsc_code:             { label: 'Bank IFSC Code',               isRequired: true,  category: 'FINANCIAL' },
  branch_name:           { label: 'Bank Branch Name',             isRequired: false, category: 'FINANCIAL' },
  annual_income:         { label: 'Annual Family Income',          isRequired: true,  category: 'EMPLOYMENT' },
  occupation:            { label: 'Occupation / Profession',       isRequired: true,  category: 'EMPLOYMENT' },
  emergency_contact:     { label: 'Emergency Contact Number',      isRequired: true,  category: 'PERSONAL' },
};

// ── Canonical Synonym Map ──────────────────────────────────
// Maps every possible OCR key variation to a canonical CanonicalKey.
// Covers: exact keys, aliases, abbreviations, common OCR mistakes,
// government form label variations, plural forms, S/O D/O W/O etc.

export const CANONICAL_SYNONYMS: Record<string, CanonicalKey> = {
  // ── Full Name ──────────────────────────────────────────
  full_name:              'full_name',
  fullname:               'full_name',
  'full name':            'full_name',
  name:                   'full_name',
  citizen_name:           'full_name',
  applicant_name:         'full_name',
  applicant:              'full_name',
  person_name:            'full_name',
  legal_name:             'full_name',
  holder_name:            'full_name',
  card_holder_name:       'full_name',
  name_of_applicant:      'full_name',
  'name of applicant':    'full_name',
  name_as_per_aadhaar:    'full_name',
  'name as per aadhaar':  'full_name',
  account_holder_name:    'full_name',
  'account holder name':  'full_name',
  beneficiary_name:       'full_name',
  'beneficiary name':     'full_name',
  employee_name:          'full_name',
  student_name:           'full_name',
  'student name':         'full_name',
  schooler_name:          'full_name',
  'schooler name':        'full_name',
  schooler:               'full_name',
  name_of_member:         'full_name',
  'name of member':       'full_name',
  member_name:            'full_name',
  'member name':          'full_name',

  // ── Father Name ────────────────────────────────────────
  father_name:            'father_name',
  father:                 'father_name',
  "father's_name":        'father_name',
  "father's name":        'father_name',
  fathername:             'father_name',
  guardian_name:          'father_name',
  'guardian name':        'father_name',
  parent_name:            'father_name',
  'parent name':          'father_name',
  's/o':                  'father_name',
  'son of':               'father_name',
  'd/o':                  'father_name',
  'daughter of':          'father_name',
  'w/o':                  'father_name',
  'wife of':              'father_name',
  'c/o':                  'father_name',
  'care of':              'father_name',
  husband_name:           'father_name',
  'husband name':         'father_name',
  'husband\'s name':      'father_name',
  father_husband_name:    'father_name',

  // ── Mother Name ────────────────────────────────────────
  mother_name:            'mother_name',
  mother:                 'mother_name',
  "mother's name":        'mother_name',
  "mother's_name":        'mother_name',
  mothername:             'mother_name',
  mata:                   'mother_name',
  mata_name:              'mother_name',

  // ── Date of Birth ──────────────────────────────────────
  date_of_birth:          'date_of_birth',
  dob:                    'date_of_birth',
  birth_date:             'date_of_birth',
  birthdate:              'date_of_birth',
  'date of birth':        'date_of_birth',
  'birth date':           'date_of_birth',
  'd.o.b':                'date_of_birth',
  'd.o.b.':               'date_of_birth',
  'date of birth (dd/mm/yyyy)': 'date_of_birth',
  year_of_birth:          'date_of_birth',

  // ── Gender ─────────────────────────────────────────────
  gender:                 'gender',
  sex:                    'gender',
  sex_gender:             'gender',

  // ── Marital Status ─────────────────────────────────────
  marital_status:         'marital_status',
  'marital status':       'marital_status',
  marriage_status:        'marital_status',
  'marriage status':      'marital_status',
  married:                'marital_status',
  single:                 'marital_status',

  // ── Aadhaar ────────────────────────────────────────────
  aadhaar_number:         'aadhaar_number',
  aadhaar:                'aadhaar_number',
  aadhaar_no:             'aadhaar_number',
  'aadhaar no':           'aadhaar_number',
  'aadhaar no.':          'aadhaar_number',
  aadhar:                 'aadhaar_number',
  aadhar_number:          'aadhaar_number',
  adhaar:                 'aadhaar_number',
  adhar:                  'aadhaar_number',
  uid_number:             'aadhaar_number',
  uid:                    'aadhaar_number',
  uidai_number:           'aadhaar_number',
  unique_id:              'aadhaar_number',
  'unique identification number': 'aadhaar_number',
  aadhaar_card_number:    'aadhaar_number',

  // ── PAN ────────────────────────────────────────────────
  pan_number:             'pan_number',
  pan:                    'pan_number',
  'pan no':               'pan_number',
  'pan no.':              'pan_number',
  pan_card_number:        'pan_number',
  permanent_account_number: 'pan_number',
  'permanent account number': 'pan_number',
  tax_id:                 'pan_number',
  income_tax_pan:         'pan_number',

  // ── Passport ───────────────────────────────────────────
  passport_number:        'passport_number',
  passport:               'passport_number',
  'passport no':          'passport_number',
  'passport no.':         'passport_number',
  passport_no:            'passport_number',

  // ── Driving License ────────────────────────────────────
  driving_license_number: 'driving_license_number',
  driving_licence_number: 'driving_license_number',
  dl_number:              'driving_license_number',
  'dl no':                'driving_license_number',
  'driving licence no':   'driving_license_number',
  'driving license no':   'driving_license_number',
  license_number:         'driving_license_number',

  // ── Voter ID ───────────────────────────────────────────
  voter_id:               'voter_id',
  'voter id':             'voter_id',
  epic_number:            'voter_id',
  'epic no':              'voter_id',
  voter_card_number:      'voter_id',
  election_card:          'voter_id',

  // ── Mobile ─────────────────────────────────────────────
  mobile_number:          'mobile_number',
  mobile:                 'mobile_number',
  'mobile no':            'mobile_number',
  'mobile no.':           'mobile_number',
  phone:                  'mobile_number',
  phone_number:           'mobile_number',
  'phone number':         'mobile_number',
  contact_number:         'mobile_number',
  'contact number':       'mobile_number',
  'contact no':           'mobile_number',
  cell:                   'mobile_number',
  cell_number:            'mobile_number',
  telephone:              'mobile_number',
  'tel no':               'mobile_number',
  'mobile phone':         'mobile_number',

  // ── Email ──────────────────────────────────────────────
  email:                  'email',
  email_address:          'email',
  'email address':        'email',
  'email id':             'email',
  'e-mail':               'email',
  'e-mail id':            'email',
  'e-mail address':       'email',
  electronic_mail:        'email',

  // ── Address ────────────────────────────────────────────
  address:                'address',
  residential_address:    'address',
  'residential address':  'address',
  permanent_address:      'address',
  'permanent address':    'address',
  current_address:        'address',
  'current address':      'address',
  house_address:          'address',
  'house address':        'address',
  communication_address:  'address',
  'communication address':'address',
  correspondence_address: 'address',
  mailing_address:        'address',
  street_address:         'address',
  'full address':         'address',

  // ── City ───────────────────────────────────────────────
  city:                   'city',
  town:                   'city',
  tehsil:                 'city',
  taluka:                 'city',
  taluk:                  'city',
  'urban local body':     'city',
  municipality:           'city',
  city_town:              'city',

  // ── District ───────────────────────────────────────────
  district:               'district',
  'district name':        'district',
  zilla:                  'district',

  // ── State ──────────────────────────────────────────────
  state:                  'state',
  province:               'state',
  'state name':           'state',
  'state/ut':             'state',
  'state / ut':           'state',
  pradesh:                'state',
  region:                 'state',

  // ── Country ────────────────────────────────────────────
  country:                'country',
  'country name':         'country',
  nationality:            'country',
  nation:                 'country',

  // ── Pincode ────────────────────────────────────────────
  pincode:                'pincode',
  pin:                    'pincode',
  'pin code':             'pincode',
  postal_code:            'pincode',
  'postal code':          'pincode',
  zip:                    'pincode',
  zip_code:               'pincode',
  'zip code':             'pincode',
  'post code':            'pincode',
  pin_no:                 'pincode',

  // ── Bank Name ──────────────────────────────────────────
  bank_name:              'bank_name',
  'bank name':            'bank_name',
  bank:                   'bank_name',
  'name of bank':         'bank_name',
  financial_institution:  'bank_name',

  // ── Bank Account Number ────────────────────────────────
  bank_account_number:    'bank_account_number',
  bank_account:           'bank_account_number',
  'bank account':         'bank_account_number',
  account_number:         'bank_account_number',
  'account number':       'bank_account_number',
  'account no':           'bank_account_number',
  'account no.':          'bank_account_number',
  'a/c number':           'bank_account_number',
  'a/c no':               'bank_account_number',
  savings_account:        'bank_account_number',
  'savings account':      'bank_account_number',
  'bank a/c':             'bank_account_number',

  // ── IFSC Code ──────────────────────────────────────────
  ifsc_code:              'ifsc_code',
  ifsc:                   'ifsc_code',
  'ifsc code':            'ifsc_code',
  'ifs code':             'ifsc_code',
  bank_code:              'ifsc_code',
  'bank code':            'ifsc_code',
  branch_code:            'ifsc_code',
  'branch code':          'ifsc_code',
  'rtgs/neft code':       'ifsc_code',

  // ── Branch Name ────────────────────────────────────────
  branch_name:            'branch_name',
  'branch name':          'branch_name',
  branch:                 'branch_name',
  'bank branch':          'branch_name',
  'bank branch name':     'branch_name',

  // ── Annual Income ──────────────────────────────────────
  annual_income:          'annual_income',
  'annual income':        'annual_income',
  income:                 'annual_income',
  yearly_income:          'annual_income',
  'yearly income':        'annual_income',
  family_income:          'annual_income',
  'family income':        'annual_income',
  gross_income:           'annual_income',
  'gross income':         'annual_income',
  total_income:           'annual_income',
  'total income':         'annual_income',
  'annual family income': 'annual_income',
  net_income:             'annual_income',
  salary:                 'annual_income',
  monthly_income:         'annual_income',

  // ── Occupation ─────────────────────────────────────────
  occupation:             'occupation',
  profession:             'occupation',
  job:                    'occupation',
  employment:             'occupation',
  designation:            'occupation',
  work:                   'occupation',
  'job title':            'occupation',
  job_title:              'occupation',
  'nature of work':       'occupation',
  nature_of_work:         'occupation',
  'nature of employment': 'occupation',
  'type of employment':   'occupation',
  'occupation/profession':'occupation',

  // ── Emergency Contact ──────────────────────────────────
  emergency_contact:      'emergency_contact',
  'emergency contact':    'emergency_contact',
  'emergency contact number': 'emergency_contact',
  emergency_contact_number: 'emergency_contact',
  'emergency no':         'emergency_contact',
  'emergency no.':        'emergency_contact',
  alternate_contact:      'emergency_contact',
  'alternate contact':    'emergency_contact',
  next_of_kin:            'emergency_contact',
  'next of kin':          'emergency_contact',
  guardian_contact:       'emergency_contact',
  'guardian contact':     'emergency_contact',
  nominee_contact:        'emergency_contact',
  'relative contact':     'emergency_contact',
};

// ── Field Value Patterns ───────────────────────────────────

const PATTERNS = {
  pan:    /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/,
  ifsc:   /^[A-Z]{4}0[A-Z0-9]{6}$/,
  mobile: /^(\+91[\-\s]?)?[0-9]{10}$/,
  email:  /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  dob:    /^\d{2}\/\d{2}\/\d{4}$/,
};

// ── Extraction Result ──────────────────────────────────────

export interface OCRExtractionResult {
  structured: CanonicalSchema;
  confidences: Record<CanonicalKey, number>;
  fields: ExtractedField[];
  rawOcrText: string;
  ocrDurationMs: number;
  overallConfidence: number;
}

// ── Normalization ──────────────────────────────────────────

/** Normalizes a raw OCR JSON response using the canonical synonym map */
export function normalizeOCRFields(rawJson: Record<string, any>): Partial<Record<CanonicalKey, string>> {
  const normalized: Partial<Record<CanonicalKey, string>> = {};

  Object.entries(rawJson).forEach(([rawKey, value]) => {
    if (value === null || value === undefined) return;

    const valStr = typeof value === 'string' ? value.trim() : String(value).trim();
    if (valStr === '' || valStr.toLowerCase() === 'null' || valStr.toLowerCase() === 'n/a') return;

    const cleanKey        = rawKey.toLowerCase().trim();
    const cleanSpaceKey   = cleanKey.replace(/_/g, ' ');
    const cleanUnderKey   = cleanKey.replace(/\s+/g, '_');

    const canonicalKey =
      CANONICAL_SYNONYMS[cleanKey] ||
      CANONICAL_SYNONYMS[cleanSpaceKey] ||
      CANONICAL_SYNONYMS[cleanUnderKey];

    if (canonicalKey && !normalized[canonicalKey]) {
      normalized[canonicalKey] = valStr;
    }
  });

  return normalized;
}

// ── Field Validator ────────────────────────────────────────

export function validateField(
  key: CanonicalKey,
  rawValue: string,
  defaultConf: number = 90
): { value: string; confidence: number } {
  if (!rawValue || typeof rawValue !== 'string') return { value: '', confidence: 0 };
  const val = rawValue.trim();
  if (val === '' || val.toLowerCase() === 'null' || val.toLowerCase() === 'n/a') return { value: '', confidence: 0 };

  switch (key) {
    case 'aadhaar_number': {
      const digits = val.replace(/\s+/g, '');
      if (digits.length === 12 && /^\d+$/.test(digits)) {
        const formatted = `${digits.slice(0, 4)} ${digits.slice(4, 8)} ${digits.slice(8, 12)}`;
        return { value: formatted, confidence: Math.max(defaultConf, 98) };
      }
      return { value: val, confidence: defaultConf };
    }

    case 'pan_number': {
      const clean = val.toUpperCase().replace(/\s+/g, '');
      if (PATTERNS.pan.test(clean)) return { value: clean, confidence: Math.max(defaultConf, 97) };
      return { value: clean, confidence: defaultConf };
    }

    case 'mobile_number':
    case 'emergency_contact': {
      const digits = val.replace(/[^\d+]/g, '');
      if (PATTERNS.mobile.test(val) || digits.length >= 10) return { value: val, confidence: Math.max(defaultConf, 96) };
      return { value: val, confidence: defaultConf };
    }

    case 'email': {
      if (PATTERNS.email.test(val)) return { value: val.toLowerCase(), confidence: Math.max(defaultConf, 98) };
      return { value: val, confidence: defaultConf };
    }

    case 'date_of_birth': {
      if (PATTERNS.dob.test(val) || !isNaN(Date.parse(val))) return { value: val, confidence: Math.max(defaultConf, 97) };
      return { value: val, confidence: defaultConf };
    }

    case 'gender': {
      const lower = val.toLowerCase();
      if (lower.startsWith('m')) return { value: 'Male',   confidence: Math.max(defaultConf, 98) };
      if (lower.startsWith('f')) return { value: 'Female', confidence: Math.max(defaultConf, 98) };
      if (lower === 'other')     return { value: 'Other',  confidence: Math.max(defaultConf, 98) };
      return { value: val, confidence: defaultConf };
    }

    case 'pincode': {
      const digits = val.replace(/\D/g, '');
      if (digits.length === 6) return { value: digits, confidence: Math.max(defaultConf, 97) };
      return { value: val, confidence: defaultConf };
    }

    case 'ifsc_code': {
      const clean = val.toUpperCase().replace(/\s+/g, '');
      if (PATTERNS.ifsc.test(clean) || clean.length === 11) return { value: clean, confidence: Math.max(defaultConf, 96) };
      return { value: clean, confidence: defaultConf };
    }

    case 'bank_account_number': {
      const digits = val.replace(/\D/g, '');
      if (digits.length >= 9) return { value: digits, confidence: Math.max(defaultConf, 95) };
      return { value: val, confidence: defaultConf };
    }

    case 'marital_status': {
      const lower = val.toLowerCase();
      if (lower.includes('single') || lower.includes('unmarried')) return { value: 'Single', confidence: Math.max(defaultConf, 98) };
      if (lower.includes('married'))   return { value: 'Married',   confidence: Math.max(defaultConf, 98) };
      if (lower.includes('divorced'))  return { value: 'Divorced',  confidence: Math.max(defaultConf, 98) };
      if (lower.includes('widowed'))   return { value: 'Widowed',   confidence: Math.max(defaultConf, 98) };
      return { value: val, confidence: defaultConf };
    }

    default:
      return { value: val, confidence: defaultConf };
  }
}

// ── OCR Service ────────────────────────────────────────────

export class OCRService {
  /**
   * Extracts structured data from a document URL.
   * Calls the backend /api/ocr placeholder route.
   */
  public static async extractDocumentJSON(
    documentUrl: string
  ): Promise<OCRExtractionResult> {
    const startTime = performance.now();

    let rawOcrText = '';
    let parsed: Record<string, any> = {};

    try {
      const response = await fetch('/api/ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentUrl }),
      });

      const durationMs = Math.round(performance.now() - startTime);

      if (response.ok) {
        const data = await response.json();
        rawOcrText = data.rawText || JSON.stringify(data);
        parsed = (data.parsed && typeof data.parsed === 'object') ? data.parsed : data;
        return OCRService.buildResult(parsed, rawOcrText, durationMs);
      }

      // Non-OK response: return empty result (not demo data)
      const errBody = await response.text().catch(() => '');
      console.warn('[OCRService] Non-OK response:', response.status, errBody);
      return OCRService.buildEmptyResult(Math.round(performance.now() - startTime));
    } catch (e) {
      console.warn('[OCRService] Network error:', e);
      return OCRService.buildEmptyResult(Math.round(performance.now() - startTime));
    }
  }

  /** Builds a validated OCRExtractionResult from parsed OCR JSON */
  private static buildResult(
    parsed: Record<string, any>,
    rawOcrText: string,
    durationMs: number
  ): OCRExtractionResult {
    const normalized = normalizeOCRFields(parsed);
    const keys = Object.keys(FIELD_SCHEMA) as CanonicalKey[];

    const structured = {} as CanonicalSchema;
    const confidences = {} as Record<CanonicalKey, number>;
    const fields: ExtractedField[] = [];

    let totalConf = 0;
    let filledCount = 0;

    keys.forEach((key, idx) => {
      const meta = FIELD_SCHEMA[key];
      const rawVal = normalized[key] || '';
      const { value, confidence } = validateField(key, rawVal);

      structured[key] = value;
      confidences[key] = confidence;

      if (value) {
        totalConf += confidence;
        filledCount++;
      }

      fields.push({
        id: `field_${key}_${idx + 1}`,
        key,
        label: meta.label,
        value,
        confidence,
        isMissing: !value,
        isLowConfidence: value ? confidence < 85 : false,
        isRequired: meta.isRequired,
        category: meta.category,
        source: value ? 'OCR' : 'DEFAULT',
      });
    });

    const overallConfidence = filledCount > 0 ? Math.round(totalConf / filledCount) : 0;

    return { structured, confidences, fields, rawOcrText, ocrDurationMs: durationMs, overallConfidence };
  }

  /**
   * Returns an empty result (all fields blank) when OCR fails.
   * Never returns hardcoded demo values.
   */
  public static buildEmptyResult(durationMs: number = 0): OCRExtractionResult {
    const keys = Object.keys(FIELD_SCHEMA) as CanonicalKey[];
    const structured = {} as CanonicalSchema;
    const confidences = {} as Record<CanonicalKey, number>;
    const fields: ExtractedField[] = [];

    keys.forEach((key, idx) => {
      const meta = FIELD_SCHEMA[key];
      structured[key] = '';
      confidences[key] = 0;
      fields.push({
        id: `field_${key}_${idx + 1}`,
        key,
        label: meta.label,
        value: '',
        confidence: 0,
        isMissing: true,
        isLowConfidence: false,
        isRequired: meta.isRequired,
        category: meta.category,
        source: 'DEFAULT',
      });
    });

    return {
      structured,
      confidences,
      fields,
      rawOcrText: '',
      ocrDurationMs: durationMs,
      overallConfidence: 0,
    };
  }
}
