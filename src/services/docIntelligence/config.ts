// Quality + classification thresholds and Romanian display labels.
// Mirrors V1 apps/api/app/services/document_intelligence/config.py.

import type { ClassifiedDocumentType } from "./types";

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export const ALLOWED_IMAGE_MIME = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

export const ALLOWED_PDF_MIME = new Set(["application/pdf", "application/x-pdf"]);

// Quality thresholds — same numeric targets as V1 but adapted to a pure
// Canvas2D analyzer instead of OpenCV. The variance/std outputs are in the
// same ballpark on identical inputs, so the thresholds carry over.
export const BLUR_VARIANCE_MIN = 80;
export const CONTRAST_STD_MIN = 35;
export const BRIGHTNESS_MIN = 45;
export const BRIGHTNESS_MAX = 220;
export const GLARE_RATIO_MAX = 0.12;
export const DARK_PIXEL_RATIO_MAX = 0.35;

export const MIN_QUALITY_SCORE = 0.45;
export const MIN_CONFIDENCE_FOR_AUTO_ACCEPT = 0.6;

// Human-readable labels for expected-type errors (Romanian UI).
export const CLASSIFIED_TYPE_LABELS_RO: Record<ClassifiedDocumentType, string> = {
  romanian_id: "cartea de identitate",
  passport: "pașaportul",
  driver_license: "permisul de conducere",
  vehicle_registration: "certificatul de înmatriculare",
  utility_bill: "factura de utilități",
  tax_decision: "decizia de impunere",
  payment_notice: "înștiințarea de plată",
  birth_certificate: "certificatul de naștere",
  marriage_certificate: "certificatul de căsătorie",
  student_card: "legitimația de student",
  criminal_record: "cazierul judiciar",
  medical_certificate: "adeverința medicală",
  property_deed: "actul de proprietate",
  cadastral_extract: "extrasul de carte funciară",
  rental_contract: "contractul de închiriere",
  employment_contract: "contractul de muncă",
  diploma: "diploma sau adeverința de studii",
  bank_statement: "extrasul de cont",
  insurance_policy: "polița de asigurare",
  invoice: "factura",
  unknown: "documentul încărcat",
};
