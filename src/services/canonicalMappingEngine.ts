// ============================================================
// CANONICAL MAPPING ENGINE
// Maps raw OCR field keys to canonical CanonicalKey values.
// Matching strategies (in order):
//   1. Exact Match on CANONICAL_SYNONYMS
//   2. Typo Correction (OCR_TYPO_MAP)
//   3. Normalized Synonym Match
//   4. Jaro-Winkler Similarity (≥ 0.92 → auto-map)
//   5. Levenshtein Similarity (≥ 0.90 → auto-map, ≥ 0.75 → needs review)
//   6. Word Overlap Similarity
//   7. Unmapped
// ============================================================

import { CANONICAL_SYNONYMS, CanonicalKey } from './ocrService';
import { ExtractedField } from '../types';

// ── Types ──────────────────────────────────────────────────

export interface MappingResult {
  rawKey: string;
  normalizedKey: string;
  canonicalKey: CanonicalKey | null;
  confidence: number;
  matchType: 'EXACT' | 'SYNONYM' | 'TYPO_CORRECTED' | 'JARO_WINKLER' | 'LEVENSHTEIN' | 'WORD_OVERLAP' | 'UNMAPPED';
  needsReview: boolean;
}

// ── OCR Typo Map ───────────────────────────────────────────
// Common OCR misreads for government document field labels

const OCR_TYPO_MAP: Record<string, string> = {
  // Mobile
  'moblle':            'mobile',
  'moblle_number':     'mobile_number',
  'mobi1e':            'mobile',
  'moblie':            'mobile',
  'moblno':            'mobile_number',
  'cel1':              'cell',
  'tele':              'telephone',

  // Aadhaar
  'aadhar':            'aadhaar',
  'adhaar':            'aadhaar',
  'adhar':             'aadhaar',
  'aadhaarid':         'aadhaar_number',
  'aadharnumber':      'aadhaar_number',

  // PAN
  'pancard':           'pan_number',
  'pancardnumber':     'pan_number',
  'permanentaccountnumber': 'pan_number',

  // IFSC
  'ifcs':              'ifsc_code',
  'lfsc':              'ifsc_code',
  'ifs':               'ifsc_code',
  'ifsecode':          'ifsc_code',
  'ifscno':            'ifsc_code',

  // Account
  'acc0unt':           'account_number',
  'acct':              'account_number',
  'accno':             'bank_account_number',
  'accnumber':         'bank_account_number',

  // Passport
  'passprot':          'passport_number',
  'pasport':           'passport_number',
  'passportno':        'passport_number',

  // DOB
  'dob':               'date_of_birth',
  'd0b':               'date_of_birth',
  'dateofbirth':       'date_of_birth',

  // Father
  'fathername':        'father_name',
  's0':                's/o',
  'd0':                'd/o',

  // Pincode
  'pinc0de':           'pincode',
  'p1ncode':           'pincode',
  'postc0de':          'pincode',

  // Email
  'emai1':             'email',
  'ema1l':             'email',

  // Annual income
  'annualinc':         'annual_income',
  'annualincome':      'annual_income',
  'annincome':         'annual_income',

  // Address
  'addr':              'address',
  'adress':            'address',
  'addres':            'address',
};

// ── String Normalizer ──────────────────────────────────────

export function normalizeKeyString(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^\w\s]/gi, '')  // Remove punctuation
    .replace(/[\s\-_.]+/g, '') // Remove spaces, dashes, underscores, dots
    .trim();
}

// ── Levenshtein Similarity ─────────────────────────────────

export function levenshteinSimilarity(a: string, b: string): number {
  const s1 = a.toLowerCase().trim();
  const s2 = b.toLowerCase().trim();
  if (s1 === s2) return 1.0;
  if (!s1.length || !s2.length) return 0.0;

  const track = Array.from({ length: s2.length + 1 }, (_, i) =>
    Array.from({ length: s1.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );

  for (let j = 1; j <= s2.length; j++) {
    for (let i = 1; i <= s1.length; i++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      track[j][i] = Math.min(track[j][i - 1] + 1, track[j - 1][i] + 1, track[j - 1][i - 1] + cost);
    }
  }

  const dist = track[s2.length][s1.length];
  return (Math.max(s1.length, s2.length) - dist) / Math.max(s1.length, s2.length);
}

// ── Jaro-Winkler Similarity ────────────────────────────────

export function jaroWinklerSimilarity(s1: string, s2: string): number {
  s1 = s1.toLowerCase().trim();
  s2 = s2.toLowerCase().trim();
  if (s1 === s2) return 1.0;
  if (!s1.length || !s2.length) return 0.0;

  const matchDist = Math.max(Math.floor(Math.max(s1.length, s2.length) / 2) - 1, 0);
  const s1Matches = new Array(s1.length).fill(false);
  const s2Matches = new Array(s2.length).fill(false);

  let matches = 0;
  let transpositions = 0;

  for (let i = 0; i < s1.length; i++) {
    const start = Math.max(0, i - matchDist);
    const end   = Math.min(i + matchDist + 1, s2.length);
    for (let j = start; j < end; j++) {
      if (!s2Matches[j] && s1[i] === s2[j]) {
        s1Matches[i] = true;
        s2Matches[j] = true;
        matches++;
        break;
      }
    }
  }

  if (matches === 0) return 0.0;

  let k = 0;
  for (let i = 0; i < s1.length; i++) {
    if (s1Matches[i]) {
      while (!s2Matches[k]) k++;
      if (s1[i] !== s2[k]) transpositions++;
      k++;
    }
  }

  const jaro = (matches / s1.length + matches / s2.length + (matches - transpositions / 2) / matches) / 3;

  // Winkler prefix bonus
  let prefix = 0;
  for (let i = 0; i < Math.min(4, Math.min(s1.length, s2.length)); i++) {
    if (s1[i] === s2[i]) prefix++;
    else break;
  }

  return jaro + prefix * 0.1 * (1 - jaro);
}

// ── Word Overlap Similarity ────────────────────────────────

function wordOverlapSimilarity(a: string, b: string): number {
  const tokenize = (s: string) => new Set(s.toLowerCase().split(/[\s_\-./]+/).filter((t) => t.length > 1));
  const setA = tokenize(a);
  const setB = tokenize(b);
  if (!setA.size || !setB.size) return 0;
  const intersection = new Set([...setA].filter((w) => setB.has(w)));
  return intersection.size / Math.max(setA.size, setB.size);
}

export type DocClassificationType = 'APPLICATION_FORM' | 'SUPPORTING_DOCUMENT';

// ── Canonical Mapping Engine ───────────────────────────────

export class CanonicalMappingEngine {
  /**
   * Stage 1: Classifies an uploaded document into APPLICATION_FORM or SUPPORTING_DOCUMENT.
   * APPLICATION_FORM: mostly blank form containing labels and empty input fields.
   * SUPPORTING_DOCUMENT: contains populated values (Aadhaar, Worker Card, PAN, Passport, Bank Passbook, etc.)
   */
  public static classifyDocument(
    rawFieldsMap: Record<string, any>,
    hintDocType?: string
  ): DocClassificationType {
    if (hintDocType === 'GOVERNMENT_FORM' || hintDocType === 'APPLICATION_FORM') {
      return 'APPLICATION_FORM';
    }
    if (
      hintDocType === 'AADHAAR' ||
      hintDocType === 'PAN' ||
      hintDocType === 'PASSPORT' ||
      hintDocType === 'PASSBOOK' ||
      hintDocType === 'SUPPORTING_DOCUMENT'
    ) {
      return 'SUPPORTING_DOCUMENT';
    }

    const entries = Object.entries(rawFieldsMap);
    if (entries.length === 0) return 'APPLICATION_FORM';

    let populatedCount = 0;
    entries.forEach(([_, val]) => {
      if (val !== null && val !== undefined) {
        const strVal = String(val).trim();
        if (strVal !== '' && strVal.toLowerCase() !== 'null' && strVal.toLowerCase() !== 'n/a') {
          populatedCount++;
        }
      }
    });

    const populatedRatio = populatedCount / entries.length;
    return populatedRatio < 0.4 ? 'APPLICATION_FORM' : 'SUPPORTING_DOCUMENT';
  }

  /**
   * Stage 3: Map OCR field keys using semantic similarity & fuzzy matching.
   */
  public static mapOCRFieldKey(rawKey: string): MappingResult {
    if (!rawKey || typeof rawKey !== 'string') {
      return { rawKey: '', normalizedKey: '', canonicalKey: null, confidence: 0, matchType: 'UNMAPPED', needsReview: false };
    }

    const cleanRaw     = rawKey.trim();
    const cleanLower   = cleanRaw.toLowerCase();
    const normalizedKey = normalizeKeyString(cleanRaw);

    // ── 1. Exact Match ────────────────────────────────────
    if (CANONICAL_SYNONYMS[cleanLower]) {
      return { rawKey: cleanRaw, normalizedKey, canonicalKey: CANONICAL_SYNONYMS[cleanLower], confidence: 99, matchType: 'EXACT', needsReview: false };
    }
    const spaceVariant = cleanLower.replace(/_/g, ' ');
    const underVariant = cleanLower.replace(/\s+/g, '_');
    if (CANONICAL_SYNONYMS[spaceVariant]) {
      return { rawKey: cleanRaw, normalizedKey, canonicalKey: CANONICAL_SYNONYMS[spaceVariant], confidence: 99, matchType: 'EXACT', needsReview: false };
    }
    if (CANONICAL_SYNONYMS[underVariant]) {
      return { rawKey: cleanRaw, normalizedKey, canonicalKey: CANONICAL_SYNONYMS[underVariant], confidence: 99, matchType: 'EXACT', needsReview: false };
    }

    // ── 2. Typo Correction ────────────────────────────────
    const typoFixed = OCR_TYPO_MAP[cleanLower] || OCR_TYPO_MAP[normalizedKey];
    if (typoFixed) {
      const corrected = CANONICAL_SYNONYMS[typoFixed] || CANONICAL_SYNONYMS[typoFixed.replace(/_/g, ' ')];
      if (corrected) {
        return { rawKey: cleanRaw, normalizedKey, canonicalKey: corrected, confidence: 95, matchType: 'TYPO_CORRECTED', needsReview: false };
      }
    }

    // ── 3. Normalized Synonym & Semantic Match ────────────
    const synonymEntries = Object.entries(CANONICAL_SYNONYMS);
    for (const [synonym, canonical] of synonymEntries) {
      if (normalizeKeyString(synonym) === normalizedKey) {
        return { rawKey: cleanRaw, normalizedKey, canonicalKey: canonical, confidence: 96, matchType: 'SYNONYM', needsReview: false };
      }
    }

    // ── 4. Jaro-Winkler Similarity ───────────────────────
    let bestJW = 0;
    let bestJWCanonical: CanonicalKey | null = null;
    for (const [synonym, canonical] of synonymEntries) {
      const sim = jaroWinklerSimilarity(normalizedKey, normalizeKeyString(synonym));
      if (sim > bestJW) { bestJW = sim; bestJWCanonical = canonical; }
    }
    if (bestJWCanonical && bestJW >= 0.92) {
      return { rawKey: cleanRaw, normalizedKey, canonicalKey: bestJWCanonical, confidence: Math.round(bestJW * 100), matchType: 'JARO_WINKLER', needsReview: false };
    }

    // ── 5. Levenshtein Similarity ─────────────────────────
    let bestLev = 0;
    let bestLevCanonical: CanonicalKey | null = null;
    for (const [synonym, canonical] of synonymEntries) {
      const sim = levenshteinSimilarity(normalizedKey, normalizeKeyString(synonym));
      if (sim > bestLev) { bestLev = sim; bestLevCanonical = canonical; }
    }
    const levPct = Math.round(bestLev * 100);
    if (bestLevCanonical && levPct >= 90) {
      return { rawKey: cleanRaw, normalizedKey, canonicalKey: bestLevCanonical, confidence: levPct, matchType: 'LEVENSHTEIN', needsReview: false };
    }
    if (bestLevCanonical && levPct >= 75) {
      return { rawKey: cleanRaw, normalizedKey, canonicalKey: bestLevCanonical, confidence: levPct, matchType: 'LEVENSHTEIN', needsReview: true };
    }

    // ── 6. Word Overlap ───────────────────────────────────
    let bestWO = 0;
    let bestWOCanonical: CanonicalKey | null = null;
    for (const [synonym, canonical] of synonymEntries) {
      const sim = wordOverlapSimilarity(cleanRaw, synonym);
      if (sim > bestWO) { bestWO = sim; bestWOCanonical = canonical; }
    }
    if (bestWOCanonical && bestWO >= 0.5) {
      return { rawKey: cleanRaw, normalizedKey, canonicalKey: bestWOCanonical, confidence: Math.round(bestWO * 100), matchType: 'WORD_OVERLAP', needsReview: true };
    }

    // ── 7. Unmapped ───────────────────────────────────────
    return { rawKey: cleanRaw, normalizedKey, canonicalKey: null, confidence: 0, matchType: 'UNMAPPED', needsReview: false };
  }

  /**
   * Type Safety Guardrails: Rejects mismatched cross-category mappings.
   * Never map Phone/Email/DOB/Address/School Name -> Person Name, etc.
   */
  public static isTypeIncompatible(
    rawOcrKey: string,
    ocrValue: string,
    targetLabel: string
  ): { incompatible: boolean; reason?: string } {
    const ocrLower = rawOcrKey.toLowerCase();
    const targetLower = targetLabel.toLowerCase();
    const valLower = ocrValue.toLowerCase();

    // 1. Phone / Mobile vs Name / DOB / Address
    const isPhone = ocrLower.includes('phone') || ocrLower.includes('mobile') || ocrLower.includes('contact') || /^\+?\d{10,12}$/.test(ocrValue.replace(/[\s\-]/g, ''));
    if (isPhone && (targetLower.includes('father') || targetLower.includes('parent name') || targetLower.includes('student name') || targetLower.includes('applicant name') || targetLower.includes('dob') || targetLower.includes('date of birth'))) {
      if (!targetLower.includes('phone') && !targetLower.includes('mobile') && !targetLower.includes('contact')) {
        return { incompatible: true, reason: 'Forbidden cross-category mapping: Phone number cannot map to Name or DOB field' };
      }
    }

    // 2. Email vs Name / Phone / DOB / Address
    const isEmail = ocrLower.includes('email') || valLower.includes('@');
    if (isEmail && (targetLower.includes('father') || targetLower.includes('parent name') || targetLower.includes('student name') || targetLower.includes('phone') || targetLower.includes('dob'))) {
      if (!targetLower.includes('email') && !targetLower.includes('e-mail')) {
        return { incompatible: true, reason: 'Forbidden cross-category mapping: Email cannot map to Name or Phone or DOB field' };
      }
    }

    // 3. DOB / Date vs Name / Phone / Email / Address
    const isDate = ocrLower.includes('dob') || ocrLower.includes('date_of_birth') || ocrLower.includes('birth_date');
    if (isDate && (targetLower.includes('name') || targetLower.includes('phone') || targetLower.includes('email') || targetLower.includes('address'))) {
      if (!targetLower.includes('dob') && !targetLower.includes('date of birth') && !targetLower.includes('birth')) {
        return { incompatible: true, reason: 'Forbidden cross-category mapping: Date of Birth cannot map to Name, Phone, or Email field' };
      }
    }

    // 4. Address vs Name / Phone / Email
    const isAddress = ocrLower.includes('address') || ocrLower.includes('residence');
    if (isAddress && (targetLower.includes('name') || targetLower.includes('phone') || targetLower.includes('email'))) {
      if (!targetLower.includes('address') && !targetLower.includes('residence')) {
        return { incompatible: true, reason: 'Forbidden cross-category mapping: Address cannot map to Person Name, Phone, or Email field' };
      }
    }

    // 5. School Name / Institution / Bank Name vs Person Full Name / Father Name
    const isInstitution = ocrLower.includes('school') || ocrLower.includes('college') || ocrLower.includes('university') || ocrLower.includes('bank_name');
    if (isInstitution && (targetLower.includes('student name') || targetLower.includes('full name') || targetLower.includes('father name') || targetLower.includes('parent name') || targetLower.includes('applicant name'))) {
      if (!targetLower.includes('school') && !targetLower.includes('college') && !targetLower.includes('bank')) {
        return { incompatible: true, reason: 'Forbidden cross-category mapping: School/Institution/Bank name cannot map to Person Name field' };
      }
    }

    return { incompatible: false };
  }

  /**
   * Calls Gemini AI Decision Engine (/api/verify-semantic-map) to verify semantic equivalence.
   */
  public static async verifySemanticEquivalenceWithGemini(
    ocrField: string,
    ocrValue: string,
    formLabel: string
  ): Promise<{ match: boolean; confidence: number; reason: string }> {
    try {
      const response = await fetch('/api/verify-semantic-map', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ocrField, ocrValue, formLabel }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data && data.success) {
          return {
            match: Boolean(data.match),
            confidence: typeof data.confidence === 'number' ? data.confidence : (data.match ? 90 : 20),
            reason: String(data.reason || ''),
          };
        }
      }
    } catch (e) {
      console.warn('[CanonicalMappingEngine] Call to /api/verify-semantic-map failed:', e);
    }
    return { match: false, confidence: 0, reason: 'API call failed or unavailable' };
  }

  /**
   * Stage 4: Maps OCR values to detected application form template field labels using strict semantic verification.
   * Rules:
   *   1. Minimum 80% similarity threshold (below 80% -> DO NOT map).
   *   2. Type safety checks (reject Phone -> Father Name, Email -> Father Name, DOB -> Parent Name, etc.).
   *   3. Gemini AI decision engine verification (only map when match == true AND confidence >= 85%).
   *   4. Default blank state if no confident match exists.
   */
  public static async mapValuesToDetectedTemplate(
    ocrValuesMap: Record<string, string>,
    targetTemplate: ExtractedField[]
  ): Promise<{
    updatedTemplate: ExtractedField[];
    acceptedMappings: any[];
    rejectedMappings: any[];
  }> {
    const updatedTemplate: ExtractedField[] = [...targetTemplate];
    const acceptedMappings: any[] = [];
    const rejectedMappings: any[] = [];

    const ocrEntries = Object.entries(ocrValuesMap);

    for (const [rawOcrKey, ocrValue] of ocrEntries) {
      if (!ocrValue || typeof ocrValue !== 'string' || !ocrValue.trim() || ocrValue.trim().toLowerCase() === 'null') {
        continue;
      }

      const val = ocrValue.trim();
      const mappingRes = CanonicalMappingEngine.mapOCRFieldKey(rawOcrKey);
      const canonicalKey = mappingRes.canonicalKey;

      for (let idx = 0; idx < updatedTemplate.length; idx++) {
        const field = updatedTemplate[idx];
        if (field.isEdited) continue;

        const targetLabelLower = field.label.toLowerCase();
        const targetKeyLower = field.key.toLowerCase();
        const cleanOcrKeyLower = rawOcrKey.toLowerCase();

        // Calculate string similarity score
        let similarityScore = 0;

        if (targetKeyLower === canonicalKey || targetLabelLower === cleanOcrKeyLower) {
          similarityScore = 0.99;
        } else if (canonicalKey === 'full_name' && (targetLabelLower.includes('student name') || targetLabelLower.includes('schooler name') || targetLabelLower.includes('applicant name') || targetLabelLower.includes('member name'))) {
          similarityScore = 0.95;
        } else if (canonicalKey === 'father_name' && (targetLabelLower.includes('parent name') || targetLabelLower.includes('father name') || targetLabelLower.includes('guardian name'))) {
          similarityScore = 0.95;
        } else if (canonicalKey === 'mobile_number' && (targetLabelLower.includes('parent phone') || targetLabelLower.includes('mobile number') || targetLabelLower.includes('contact phone') || targetLabelLower.includes('phone number'))) {
          similarityScore = 0.95;
        } else if (canonicalKey === 'email' && (targetLabelLower.includes('parent email') || targetLabelLower.includes('email address') || targetLabelLower.includes('e-mail'))) {
          similarityScore = 0.95;
        } else if (canonicalKey === 'address' && (targetLabelLower.includes('residential address') || targetLabelLower.includes('permanent address') || targetLabelLower.includes('address'))) {
          similarityScore = 0.95;
        } else {
          similarityScore = jaroWinklerSimilarity(normalizeKeyString(field.label), normalizeKeyString(rawOcrKey));
        }

        // Rule 1: Below 80% similarity threshold -> DO NOT map automatically
        if (similarityScore < 0.80) {
          rejectedMappings.push({
            ocrField: rawOcrKey,
            ocrValue: val,
            formLabel: field.label,
            similarityScore: `${Math.round(similarityScore * 100)}%`,
            geminiConfidence: 'N/A (Skipped due to low similarity)',
            reasonForRejection: 'Below 80% semantic similarity threshold',
          });
          continue;
        }

        // Rule 2: Hard Type Safety Guardrails
        const typeCheck = CanonicalMappingEngine.isTypeIncompatible(rawOcrKey, val, field.label);
        if (typeCheck.incompatible) {
          rejectedMappings.push({
            ocrField: rawOcrKey,
            ocrValue: val,
            formLabel: field.label,
            similarityScore: `${Math.round(similarityScore * 100)}%`,
            geminiConfidence: 'N/A (Type incompatible)',
            reasonForRejection: typeCheck.reason || 'Forbidden cross-category mapping',
          });
          continue;
        }

        // Rule 3: Query Gemini AI Decision Engine for Semantic Equivalence Verification
        const geminiVerification = await CanonicalMappingEngine.verifySemanticEquivalenceWithGemini(
          rawOcrKey,
          val,
          field.label
        );

        // Rule 4: Auto-map ONLY when match === true AND confidence >= 85%
        if (geminiVerification.match && geminiVerification.confidence >= 85) {
          acceptedMappings.push({
            ocrField: rawOcrKey,
            ocrValue: val,
            formLabel: field.label,
            similarityScore: `${Math.round(similarityScore * 100)}%`,
            geminiConfidence: `${geminiVerification.confidence}%`,
            matchReason: geminiVerification.reason || 'Gemini verified semantic equivalence',
          });

          updatedTemplate[idx] = {
            ...field,
            value: val,
            confidence: geminiVerification.confidence,
            isMissing: false,
            isLowConfidence: geminiVerification.confidence < 85,
            source: 'OCR',
          };
          break; // Stop evaluating other fields for this OCR entry
        } else {
          rejectedMappings.push({
            ocrField: rawOcrKey,
            ocrValue: val,
            formLabel: field.label,
            similarityScore: `${Math.round(similarityScore * 100)}%`,
            geminiConfidence: `${geminiVerification.confidence}%`,
            reasonForRejection: geminiVerification.reason || 'Gemini confidence < 85% or semantic mismatch',
          });
        }
      }
    }

    return { updatedTemplate, acceptedMappings, rejectedMappings };
  }
}
