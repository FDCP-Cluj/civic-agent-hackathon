// Expected-type mismatch detection with Romanian rejection messages.
// TS port of V1 apps/api/app/services/document_intelligence/expected_type.py.

import { CLASSIFIED_TYPE_LABELS_RO } from "./config";
import type { ClassifiedDocumentType } from "./types";

export function validateExpectedType(
  detected: ClassifiedDocumentType,
  expected: ClassifiedDocumentType | null,
  confidence: number,
): string | null {
  if (expected === null || expected === "unknown") return null;
  if (detected === expected) return null;

  if (detected === "unknown" && confidence < 0.5) {
    return `Nu am putut confirma că documentul este ${CLASSIFIED_TYPE_LABELS_RO[expected]}. Încercați o fotografie mai clară.`;
  }

  const uploadedLabel = CLASSIFIED_TYPE_LABELS_RO[detected];
  const expectedLabel = CLASSIFIED_TYPE_LABELS_RO[expected];
  return `Ați încărcat ${uploadedLabel}, dar acest pas necesită ${expectedLabel}.`;
}
