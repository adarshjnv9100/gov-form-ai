import { CANONICAL_SYNONYMS, KimiStructuredSchema } from './kimiService';

export interface MappingResult {
  rawKey: string;
  normalizedKey: string;
  canonicalKey: keyof KimiStructuredSchema | string | null;
  confidence: number;
  matchType: 'EXACT' | 'SYNONYM' | 'TYPO_CORRECTED' | 'FUZZY' | 'AI_SEMANTIC' | 'UNMAPPED';
  needsReview: boolean;
}

// Common OCR Typo Corrections
const OCR_TYPO_MAP: Record<string, string> = {
  moblle: 'mobile',
  moblle_number: 'mobile_number',
  aadhar: 'aadhaar',
  adhar: 'aadhaar',
  passprot: 'passport',
  ifcs: 'ifsc',
  acc0unt: 'account',
  lfsc: 'ifsc',
  ifs: 'ifsc',
  dob: 'date_of_birth',
  pancard: 'pan_number',
  pan: 'pan_number',
  aadhaarid: 'aadhaar_number',
  cellphone: 'mobile_number',
  tele: 'mobile_number',
};

/**
 * Calculates Levenshtein similarity ratio between two strings (0.0 to 1.0)
 */
export function calculateLevenshteinSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();

  if (s1 === s2) return 1.0;
  if (s1.length === 0 || s2.length === 0) return 0.0;

  const track = Array(s2.length + 1)
    .fill(null)
    .map(() => Array(s1.length + 1).fill(null));

  for (let i = 0; i <= s1.length; i += 1) track[0][i] = i;
  for (let j = 0; j <= s2.length; j += 1) track[j][0] = j;

  for (let j = 1; j <= s2.length; j += 1) {
    for (let i = 1; i <= s1.length; i += 1) {
      const indicator = s1[i - 1] === s2[j - 1] ? 0 : 1;
      track[j][i] = Math.min(
        track[j][i - 1] + 1,
        track[j - 1][i] + 1,
        track[j - 1][i - 1] + indicator
      );
    }
  }

  const distance = track[s2.length][s1.length];
  const maxLength = Math.max(s1.length, s2.length);
  return (maxLength - distance) / maxLength;
}

/**
 * Normalizes string: converts to lowercase, removes punctuation/spaces/underscores/dashes.
 */
export function normalizeKeyString(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[^\w\s]/gi, '')
    .replace(/[\s\-_]+/g, '')
    .trim();
}

export class CanonicalMappingEngine {
  /**
   * Intelligently resolves raw OCR field key into canonical form field using:
   * 1. Exact Match
   * 2. Synonym Database Match
   * 3. Typo Correction Match
   * 4. Fuzzy Levenshtein Match (>90% auto-map, 75-90% needs review)
   */
  public static mapOCRFieldKey(rawKey: string): MappingResult {
    if (!rawKey || typeof rawKey !== 'string') {
      return {
        rawKey: '',
        normalizedKey: '',
        canonicalKey: null,
        confidence: 0,
        matchType: 'UNMAPPED',
        needsReview: false,
      };
    }

    const cleanRaw = rawKey.trim();
    const normalizedKey = normalizeKeyString(cleanRaw);

    // 1. Exact Match on CANONICAL_SYNONYMS
    const cleanLower = cleanRaw.toLowerCase();
    if (CANONICAL_SYNONYMS[cleanLower]) {
      return {
        rawKey: cleanRaw,
        normalizedKey,
        canonicalKey: CANONICAL_SYNONYMS[cleanLower],
        confidence: 99,
        matchType: 'EXACT',
        needsReview: false,
      };
    }

    // 2. Typo Correction Check
    const typoFixed = OCR_TYPO_MAP[cleanLower] || OCR_TYPO_MAP[normalizedKey];
    if (typoFixed && CANONICAL_SYNONYMS[typoFixed]) {
      return {
        rawKey: cleanRaw,
        normalizedKey,
        canonicalKey: CANONICAL_SYNONYMS[typoFixed],
        confidence: 95,
        matchType: 'TYPO_CORRECTED',
        needsReview: false,
      };
    }

    // 3. Synonym Dictionary Match on Normalized String
    const synonymEntries = Object.entries(CANONICAL_SYNONYMS);
    for (const [synonym, canonical] of synonymEntries) {
      const normSyn = normalizeKeyString(synonym);
      if (normSyn === normalizedKey) {
        return {
          rawKey: cleanRaw,
          normalizedKey,
          canonicalKey: canonical,
          confidence: 96,
          matchType: 'SYNONYM',
          needsReview: false,
        };
      }
    }

    // 4. Fuzzy Similarity Matching (Levenshtein Distance)
    let bestMatchCanonical: keyof KimiStructuredSchema | null = null;
    let bestSimilarity = 0;

    for (const [synonym, canonical] of synonymEntries) {
      const sim = calculateLevenshteinSimilarity(normalizedKey, normalizeKeyString(synonym));
      if (sim > bestSimilarity) {
        bestSimilarity = sim;
        bestMatchCanonical = canonical;
      }
    }

    const similarityPercentage = Math.round(bestSimilarity * 100);

    if (bestMatchCanonical && similarityPercentage >= 90) {
      return {
        rawKey: cleanRaw,
        normalizedKey,
        canonicalKey: bestMatchCanonical,
        confidence: similarityPercentage,
        matchType: 'FUZZY',
        needsReview: false,
      };
    }

    if (bestMatchCanonical && similarityPercentage >= 75) {
      return {
        rawKey: cleanRaw,
        normalizedKey,
        canonicalKey: bestMatchCanonical,
        confidence: similarityPercentage,
        matchType: 'FUZZY',
        needsReview: true, // 75% - 90% similarity marked as Needs Review
      };
    }

    // Below 75% threshold -> Leave unmapped
    return {
      rawKey: cleanRaw,
      normalizedKey,
      canonicalKey: null,
      confidence: similarityPercentage,
      matchType: 'UNMAPPED',
      needsReview: false,
    };
  }
}
