// Barrel for the document intelligence service.
//
// Usage:
//   const result = await validateDocument(file, { expectedType: "romanian_id" });
//   if ("error" in result) { ... }
//   if (result.success) { ... result.extractedFields.cnp ... }

export { validateDocument } from "./pipeline";
export type { PipelineOptions, PipelineError } from "./pipeline";
export { classifyDocument } from "./classifier";
export { extractFields, isValidCNP } from "./fieldExtractor";
export { validateExpectedType } from "./expectedType";
export { analyzeImageQuality } from "./imageQuality";
export { runOcr, prefetchOcr, disposeOcr } from "./ocr";
export { CLASSIFIED_TYPE_LABELS_RO } from "./config";
export type {
  ClassifiedDocumentType,
  ClassificationResult,
  DocumentValidationResult,
  ExtractedFields,
  ImageQualityResult,
  ValidationIssue,
} from "./types";
