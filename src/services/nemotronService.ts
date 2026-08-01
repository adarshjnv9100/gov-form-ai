// ============================================================
// DOCUMENT RECOMMENDATION SERVICE
// Sends missing field data to the backend /api/nemotron placeholder route.
// ============================================================

// ── Types ──────────────────────────────────────────────────

export interface RecommendedDocumentItem {
  document: string;
  fills: string[];
  priority: number;
  reason: string;
  docTypeTag?: string;
}

export interface NemotronRecommendationResponse {
  completion_percentage: number;
  recommendations: RecommendedDocumentItem[];
}

export interface NemotronRequestPayload {
  missing_fields: string[];
  uploaded_documents: string[];
}

// ── Document Recommendation Map ───────────────────────────
// Maps every canonical field key to the optimal set of documents
// that can provide that field. Used by the fallback set-cover algorithm.

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

// ── Nemotron Service ───────────────────────────────────────

export class NemotronService {
  /**
   * Gets document recommendations for missing fields.
   * Calls backend /api/nemotron (never NVIDIA directly).
   * Falls back to a deterministic set-cover algorithm.
   */
  public static async getDocumentRecommendations(
    payload: NemotronRequestPayload
  ): Promise<NemotronRecommendationResponse> {
    const totalFields = Object.keys(FIELD_TO_DOCUMENTS).length;
    const missingCount = payload.missing_fields.length;
    const filledCount = totalFields - missingCount;
    const completionPercentage = Math.round((filledCount / totalFields) * 100);

    if (missingCount === 0) {
      return { completion_percentage: 100, recommendations: [] };
    }

    try {
      const response = await fetch('/api/nemotron', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const data = await response.json();
        if (data && Array.isArray(data.recommendations)) {
          return {
            completion_percentage: data.completion_percentage ?? completionPercentage,
            recommendations: data.recommendations,
          };
        }
      }
    } catch (e) {
      console.warn('[NemotronService] API call failed, using local set-cover fallback:', e);
    }

    return NemotronService.setcoverFallback(payload.missing_fields, completionPercentage);
  }

  /**
   * Greedy Set-Cover Algorithm:
   * Finds the minimum set of documents that covers the maximum missing fields.
   * Used as a fallback when the Nemotron API is unavailable.
   */
  private static setcoverFallback(
    missingFields: string[],
    completionPercentage: number
  ): NemotronRecommendationResponse {
    const remaining = new Set(missingFields);
    const recommendations: RecommendedDocumentItem[] = [];

    // Build a map: document → set of missing fields it can fill
    const docCoverage = new Map<string, { fills: Set<string>; docTypeTag: string; reason: string }>();

    for (const field of missingFields) {
      const docs = FIELD_TO_DOCUMENTS[field] || [];
      for (const doc of docs) {
        if (!docCoverage.has(doc.document)) {
          docCoverage.set(doc.document, { fills: new Set(), docTypeTag: doc.docTypeTag, reason: doc.reason });
        }
        docCoverage.get(doc.document)!.fills.add(field);
      }
    }

    let priority = 1;

    // Greedy: always pick the document that covers the most remaining fields
    while (remaining.size > 0) {
      let bestDoc = '';
      let bestFills: Set<string> = new Set();
      let bestDocTypeTag = '';
      let bestReason = '';

      for (const [doc, { fills, docTypeTag, reason }] of docCoverage.entries()) {
        const coverage = [...fills].filter((f) => remaining.has(f));
        if (coverage.length > bestFills.size) {
          bestDoc = doc;
          bestFills = new Set(coverage);
          bestDocTypeTag = docTypeTag;
          bestReason = reason;
        }
      }

      // No document covers any remaining field — stop
      if (!bestDoc || bestFills.size === 0) break;

      recommendations.push({
        document: bestDoc,
        fills: [...bestFills],
        priority: priority++,
        reason: bestReason,
        docTypeTag: bestDocTypeTag,
      });

      // Remove covered fields from remaining
      for (const f of bestFills) remaining.delete(f);
      docCoverage.delete(bestDoc);
    }

    return { completion_percentage: completionPercentage, recommendations };
  }
}
