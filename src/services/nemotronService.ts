// ============================================================
// DOCUMENT RECOMMENDATION SERVICE
// Sends missing field data to the backend /api/nemotron placeholder route.
// ============================================================

// ── Types ──────────────────────────────────────────────────

export interface RecommendedDocumentItem {
  document: string;
  fills: string[];
  priority?: number;
  reason: string;
  docTypeTag?: string;
  coveragePercentage?: number;
}

export interface NemotronRecommendationResponse {
  success?: boolean;
  completion_percentage: number;
  recommendations: RecommendedDocumentItem[];
  error?: string;
}

export interface NemotronRequestPayload {
  missing_fields: string[];
  uploaded_documents: string[];
}

// In-memory cache for missing fields recommendations
const recommendationCache = new Map<string, NemotronRecommendationResponse>();

// ── Document Recommendation Map (Fallback Reference) ───────────────────────────
const FIELD_TO_DOCUMENTS: Record<string, { document: string; docTypeTag: string; reason: string }[]> = {
  full_name: [
    { document: 'Aadhaar Card',    docTypeTag: 'AADHAAR',       reason: 'Contains full legal name as registered with UIDAI.' },
    { document: 'PAN Card',        docTypeTag: 'PAN',           reason: 'Contains name as registered with Income Tax Dept.' },
    { document: 'Passport',        docTypeTag: 'PASSPORT',      reason: 'Contains legal name as per passport record.' },
    { document: 'Voter ID',        docTypeTag: 'VOTER_ID',      reason: 'Contains name as per electoral roll.' },
  ],
  father_name: [
    { document: 'Aadhaar Card',    docTypeTag: 'AADHAAR',       reason: 'Contains father/guardian name in address fields.' },
    { document: 'PAN Card',        docTypeTag: 'PAN',           reason: "Contains father's name on the card." },
    { document: 'Passport',        docTypeTag: 'PASSPORT',      reason: "Contains father's name in personal details." },
    { document: 'Birth Certificate', docTypeTag: 'BIRTH_CERT',  reason: "Contains father's name as registered at birth." },
  ],
  mother_name: [
    { document: 'Birth Certificate', docTypeTag: 'BIRTH_CERT',  reason: "Contains mother's name as registered at birth." },
    { document: 'Aadhaar Card',    docTypeTag: 'AADHAAR',       reason: "May contain mother's name in family details." },
  ],
  date_of_birth: [
    { document: 'Birth Certificate', docTypeTag: 'BIRTH_CERT',  reason: 'Official government proof of date of birth.' },
    { document: 'Aadhaar Card',    docTypeTag: 'AADHAAR',       reason: 'Contains verified DOB from UIDAI records.' },
    { document: 'PAN Card',        docTypeTag: 'PAN',           reason: 'Contains DOB as registered with Income Tax Dept.' },
    { document: 'Passport',        docTypeTag: 'PASSPORT',      reason: 'Contains DOB as verified by passport authority.' },
    { document: 'School Certificate', docTypeTag: 'SCHOOL_CERT', reason: '10th marksheet is accepted DOB proof.' },
  ],
  gender: [
    { document: 'Aadhaar Card',    docTypeTag: 'AADHAAR',       reason: 'Contains gender as registered with UIDAI.' },
    { document: 'Passport',        docTypeTag: 'PASSPORT',      reason: 'Contains gender as verified by passport authority.' },
    { document: 'Birth Certificate', docTypeTag: 'BIRTH_CERT',  reason: 'Contains gender at birth.' },
  ],
  marital_status: [
    { document: 'Marriage Certificate', docTypeTag: 'MARRIAGE_CERT', reason: 'Official proof of marriage status.' },
    { document: 'Family ID Card',  docTypeTag: 'FAMILY_ID',     reason: 'Contains marital status of all family members.' },
    { document: 'Aadhaar Card',    docTypeTag: 'AADHAAR',       reason: 'May contain marital status in address metadata.' },
  ],
  aadhaar_number: [
    { document: 'Aadhaar Card',    docTypeTag: 'AADHAAR',       reason: 'Primary document containing the 12-digit Aadhaar UID.' },
  ],
  pan_number: [
    { document: 'PAN Card',        docTypeTag: 'PAN',           reason: 'Primary document containing the 10-character PAN.' },
    { document: 'Income Tax Return (ITR)', docTypeTag: 'ITR',   reason: 'ITR acknowledgement contains PAN number.' },
    { document: 'Form 16',         docTypeTag: 'FORM_16',       reason: 'Contains employee PAN number.' },
  ],
  passport_number: [
    { document: 'Passport',        docTypeTag: 'PASSPORT',      reason: 'Primary document containing passport number.' },
  ],
  driving_license_number: [
    { document: 'Driving Licence', docTypeTag: 'DL',            reason: 'Primary document containing DL number.' },
  ],
  voter_id: [
    { document: 'Voter ID Card',   docTypeTag: 'VOTER_ID',      reason: 'Primary document containing EPIC voter ID number.' },
  ],
  mobile_number: [
    { document: 'Bank Statement',  docTypeTag: 'BANK_STMT',     reason: 'Bank statement header contains registered mobile number.' },
    { document: 'Aadhaar Card',    docTypeTag: 'AADHAAR',       reason: 'Aadhaar is linked to registered mobile number.' },
  ],
  email: [
    { document: 'Bank Statement',  docTypeTag: 'BANK_STMT',     reason: 'Bank statement may contain registered email.' },
    { document: 'Salary Slip',     docTypeTag: 'SALARY_SLIP',   reason: 'Salary slip may contain official email.' },
  ],
  address: [
    { document: 'Aadhaar Card',    docTypeTag: 'AADHAAR',       reason: 'Contains verified permanent address from UIDAI.' },
    { document: 'Passport',        docTypeTag: 'PASSPORT',      reason: 'Contains address as verified by passport authority.' },
    { document: 'Driving Licence', docTypeTag: 'DL',            reason: 'Contains address as verified by RTO.' },
    { document: 'Electricity Bill', docTypeTag: 'UTILITY_BILL', reason: 'Accepted address proof for residential address.' },
    { document: 'Water Bill',      docTypeTag: 'UTILITY_BILL',  reason: 'Accepted address proof for residential address.' },
    { document: 'Gas Bill',        docTypeTag: 'UTILITY_BILL',  reason: 'Accepted address proof for residential address.' },
    { document: 'Rental Agreement', docTypeTag: 'RENT_AGREE',   reason: 'Rental agreement is accepted residential address proof.' },
  ],
  city: [
    { document: 'Aadhaar Card',    docTypeTag: 'AADHAAR',       reason: 'Address on Aadhaar includes city/town.' },
    { document: 'Electricity Bill', docTypeTag: 'UTILITY_BILL', reason: 'Utility bill contains city in billing address.' },
    { document: 'Passport',        docTypeTag: 'PASSPORT',      reason: 'Passport contains city in address fields.' },
  ],
  district: [
    { document: 'Aadhaar Card',    docTypeTag: 'AADHAAR',       reason: 'Aadhaar address includes district name.' },
    { document: 'Domicile Certificate', docTypeTag: 'DOMICILE', reason: 'Official proof containing district.' },
  ],
  state: [
    { document: 'Aadhaar Card',    docTypeTag: 'AADHAAR',       reason: 'Aadhaar address includes state.' },
    { document: 'Domicile Certificate', docTypeTag: 'DOMICILE', reason: 'Official proof containing state of domicile.' },
    { document: 'Voter ID Card',   docTypeTag: 'VOTER_ID',      reason: 'Voter ID contains state of electoral roll.' },
  ],
  pincode: [
    { document: 'Aadhaar Card',    docTypeTag: 'AADHAAR',       reason: 'Aadhaar address contains 6-digit pincode.' },
    { document: 'Electricity Bill', docTypeTag: 'UTILITY_BILL', reason: 'Billing address on utility bill includes pincode.' },
    { document: 'Passport',        docTypeTag: 'PASSPORT',      reason: 'Passport address contains pincode.' },
  ],
  bank_account_number: [
    { document: 'Bank Passbook',   docTypeTag: 'BANK_PASSBOOK', reason: 'Front page of passbook contains account number.' },
    { document: 'Cancelled Cheque', docTypeTag: 'CANCELLED_CHEQUE', reason: 'Account number printed on the cheque leaf.' },
    { document: 'Bank Statement',  docTypeTag: 'BANK_STMT',     reason: 'Bank statement header contains account number.' },
  ],
  ifsc_code: [
    { document: 'Bank Passbook',   docTypeTag: 'BANK_PASSBOOK', reason: 'Passbook contains IFSC code of the branch.' },
    { document: 'Cancelled Cheque', docTypeTag: 'CANCELLED_CHEQUE', reason: 'IFSC code printed on the cheque leaf.' },
    { document: 'Bank Statement',  docTypeTag: 'BANK_STMT',     reason: 'Bank statement contains branch IFSC code.' },
  ],
  bank_name: [
    { document: 'Bank Passbook',   docTypeTag: 'BANK_PASSBOOK', reason: 'Passbook cover contains bank name.' },
    { document: 'Cancelled Cheque', docTypeTag: 'CANCELLED_CHEQUE', reason: 'Bank name is printed on the cheque.' },
  ],
  branch_name: [
    { document: 'Bank Passbook',   docTypeTag: 'BANK_PASSBOOK', reason: 'Passbook contains branch name and address.' },
    { document: 'Cancelled Cheque', docTypeTag: 'CANCELLED_CHEQUE', reason: 'Branch name printed on cheque leaf.' },
  ],
  annual_income: [
    { document: 'Income Certificate', docTypeTag: 'INCOME_CERT', reason: 'Official government proof of annual family income.' },
    { document: 'Salary Slip',     docTypeTag: 'SALARY_SLIP',   reason: 'Monthly salary slip indicates gross annual income.' },
    { document: 'Income Tax Return (ITR)', docTypeTag: 'ITR',   reason: 'ITR acknowledgement contains declared annual income.' },
    { document: 'Form 16',         docTypeTag: 'FORM_16',       reason: 'Form 16 contains gross salary and tax details.' },
  ],
  occupation: [
    { document: 'Employer ID Card', docTypeTag: 'EMPLOYER_ID',  reason: 'Employer ID contains designation and workplace.' },
    { document: 'Salary Slip',     docTypeTag: 'SALARY_SLIP',   reason: 'Salary slip contains designation and employer name.' },
    { document: 'Employment Letter', docTypeTag: 'EMPLOYMENT_LETTER', reason: 'Employment offer/confirmation letter.' },
    { document: 'Income Tax Return (ITR)', docTypeTag: 'ITR',   reason: 'ITR contains nature of employment/profession.' },
  ],
  emergency_contact: [
    { document: 'Family ID Card',  docTypeTag: 'FAMILY_ID',     reason: 'Family ID lists all family members with contact.' },
    { document: 'Marriage Certificate', docTypeTag: 'MARRIAGE_CERT', reason: 'Spouse contact details available.' },
    { document: 'Nominee Form',    docTypeTag: 'NOMINEE_FORM',  reason: 'Nominee form contains emergency contact details.' },
  ],
};

// ── Document Recommendation Service (Gemini AI) ──────────────────────────────

export class NemotronService {
  /**
   * Clears the recommendation cache.
   */
  public static clearCache(): void {
    recommendationCache.clear();
  }

  /**
   * Gets document recommendations for missing fields using Gemini API.
   * Caches recommendations based on missing fields list.
   */
  public static async getDocumentRecommendations(
    payload: NemotronRequestPayload
  ): Promise<NemotronRecommendationResponse> {
    const missingFields = payload.missing_fields || [];
    const missingCount = missingFields.length;

    if (missingCount === 0) {
      return { success: true, completion_percentage: 100, recommendations: [] };
    }

    // Cache key based on sorted missing fields
    const cacheKey = [...missingFields].sort().join(',');
    if (recommendationCache.has(cacheKey)) {
      console.log('[Audit Log] Recommendation returned from cache for missing fields:', cacheKey);
      return recommendationCache.get(cacheKey)!;
    }

    // Audit Logs: Missing fields & Gemini request
    console.log('==================== GEMINI AI DOCUMENT RECOMMENDATION ====================');
    console.log('[Audit Log] Missing fields:', JSON.stringify(missingFields, null, 2));
    console.log('[Audit Log] Gemini request:', JSON.stringify(payload, null, 2));

    try {
      const response = await fetch('/api/recommend-documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const data = await response.json();
        console.log('[Audit Log] Gemini response:', JSON.stringify(data, null, 2));

        if (data && data.success && Array.isArray(data.documents)) {
          const totalCount = missingFields.length;
          const recs: RecommendedDocumentItem[] = data.documents.map((doc: any, idx: number) => {
            const fillsArr = Array.isArray(doc.fills) ? doc.fills : [];
            const fillsCount = fillsArr.length;
            const coverage = Math.round((fillsCount / Math.max(totalCount, 1)) * 100);
            return {
              document: doc.document || doc.title || 'Government Document',
              fills: fillsArr,
              priority: idx + 1,
              reason: doc.reason || `Provides required form details.`,
              coveragePercentage: coverage > 0 ? coverage : 18,
              docTypeTag: (doc.document || '').toUpperCase().replace(/\s+/g, '_'),
            };
          });

          // Compute remaining missing fields
          const coveredSet = new Set(recs.flatMap((r) => r.fills));
          const remainingMissing = missingFields.filter((f) => !coveredSet.has(f));

          // Audit Logs
          console.log('[Audit Log] Suggested documents:', JSON.stringify(recs.map((r) => r.document), null, 2));
          console.log('[Audit Log] Coverage percentage:', `${data.completion_percentage}%`);
          console.log('[Audit Log] Remaining missing fields:', JSON.stringify(remainingMissing, null, 2));
          console.log('========================================================================');

          const result: NemotronRecommendationResponse = {
            success: true,
            completion_percentage: data.completion_percentage || 75,
            recommendations: recs,
          };

          recommendationCache.set(cacheKey, result);
          return result;
        }
      }
    } catch (e: any) {
      console.error('[NemotronService] Gemini API call failed:', e);
    }

    // Fallback handling if Gemini API fails
    const fallbackMessage = 'Unable to generate AI document recommendations. Please upload any government document containing the missing information.';
    console.warn('[NemotronService] Failure handling triggered:', fallbackMessage);

    const fallbackResult: NemotronRecommendationResponse = {
      success: false,
      completion_percentage: 50,
      recommendations: [],
      error: fallbackMessage,
    };

    return fallbackResult;
  }
}
