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
   * Deterministic Direct Canonical Mapping:
   * Maps extracted OCR data directly to target form fields using canonical keys.
   * Format: field.value = extractedData[canonicalKey] ?? ""
   */
  public static mapValuesToDetectedTemplate(
    ocrValuesMap: Record<string, string>,
    targetTemplate: ExtractedField[]
  ): {
    updatedTemplate: ExtractedField[];
    directMappings: any[];
  } {
    const updatedTemplate: ExtractedField[] = [...targetTemplate];
    const directMappings: any[] = [];

    // Normalize ocrValuesMap keys for direct lookup
    const normalizedOcrMap: Record<string, string> = {};
    Object.entries(ocrValuesMap).forEach(([k, v]) => {
      if (v !== null && v !== undefined && String(v).trim() !== '' && String(v).trim().toLowerCase() !== 'null') {
        const valStr = String(v).trim();
        normalizedOcrMap[k] = valStr;
        normalizedOcrMap[k.toLowerCase()] = valStr;
        normalizedOcrMap[k.toLowerCase().replace(/[\s\-_]+/g, '_')] = valStr;

        const canonicalRes = CanonicalMappingEngine.mapOCRFieldKey(k);
        if (canonicalRes.canonicalKey) {
          normalizedOcrMap[canonicalRes.canonicalKey] = valStr;
        }
      }
    });

    updatedTemplate.forEach((field, idx) => {
      if (field.isEdited) return;

      const mappingRes = CanonicalMappingEngine.mapOCRFieldKey(field.label);
      const targetCanonicalKey = field.key || mappingRes.canonicalKey || field.label.toLowerCase().replace(/[\s\-_]+/g, '_');

      // Direct lookup by canonicalKey, field key, or field label
      const val =
        normalizedOcrMap[targetCanonicalKey] ||
        normalizedOcrMap[field.key] ||
        normalizedOcrMap[field.label.toLowerCase()] ||
        normalizedOcrMap[field.label.toLowerCase().replace(/[\s\-_]+/g, '_')];

      if (val && val.trim()) {
        directMappings.push({
          formLabel: field.label,
          canonicalKey: targetCanonicalKey,
          value: val.trim(),
        });

        updatedTemplate[idx] = {
          ...field,
          value: val.trim(),
          confidence: 95,
          isMissing: false,
          isLowConfidence: false,
          source: 'OCR',
        };
      }
    });

    return { updatedTemplate, directMappings };
  }
}
