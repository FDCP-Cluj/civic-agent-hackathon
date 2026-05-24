// Shared types for the client-side document intelligence pipeline.
// Mirrors V1's apps/api/app/services/document_intelligence/types.py but
// adapted for browser-only execution: no Pydantic, no server uploads.

export type ClassifiedDocumentType =
  | "romanian_id"
  | "passport"
  | "driver_license"
  | "vehicle_registration"
  | "utility_bill"
  | "tax_decision"
  | "payment_notice"
  | "birth_certificate"
  | "marriage_certificate"
  | "student_card"
  | "criminal_record"
  | "medical_certificate"
  | "property_deed"
  | "cadastral_extract"
  | "rental_contract"
  | "employment_contract"
  | "diploma"
  | "bank_statement"
  | "insurance_policy"
  | "invoice"
  | "unknown";

export type ClassificationResult = {
  documentType: ClassifiedDocumentType;
  confidence: number;
  matchedSignals: string[];
};

export type ExtractedFields = {
  firstName: string | null;
  lastName: string | null;
  cnp: string | null;
  address: string | null;
  addressStreet: string | null;
  addressNumber: string | null;
  addressBlock: string | null;
  addressStair: string | null;
  addressFloor: string | null;
  addressApartment: string | null;
  addressLocality: string | null;
  addressCounty: string | null;
  addressSector: string | null;
  addressCountry: string | null;
  birthDate: string | null;
  birthLocality: string | null;
  birthCounty: string | null;
  idCardSeries: string | null;
  idCardNumber: string | null;
  idCardIssuedBy: string | null;
  documentNumber: string | null;
  issueDate: string | null;
  expiryDate: string | null;
  amount: string | null;
  dueDate: string | null;
  iban: string | null;
  fiscalCode: string | null;
  vehiclePlate: string | null;
};

export type ImageQualityResult = {
  score: number; // 0..1
  blurVariance: number;
  contrastStd: number;
  brightnessMean: number;
  glareRatio: number;
  darkRatio: number;
  issues: string[];
};

export type ValidationIssue =
  | "blurry"
  | "low_contrast"
  | "too_dark"
  | "too_bright"
  | "glare"
  | "no_text"
  | "expected_type_mismatch"
  | "unknown_type";

export type DocumentValidationResult = {
  success: boolean;
  documentType: ClassifiedDocumentType;
  confidence: number;
  readable: boolean;
  issues: ValidationIssue[];
  extractedFields: ExtractedFields;
  rawText: string;
  qualityScore: number;
  rejectionReason: string | null;
  /** Data URL for UI preview (rasterized PDF page or original image). */
  previewUrl: string;
  sourceLabel: string;
  sourceKind: "image" | "pdf";
};
