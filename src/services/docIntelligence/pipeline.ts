// Top-level pipeline that walks a single image through every stage:
// quality → OCR → classify → extract → expected-type. All in-browser; the
// file's bytes never leave the device.
//
// PDF: first page is rasterized in scanMedia.ts, then processed like a photo.

import { classifyDocument } from "./classifier";
import { MAX_UPLOAD_BYTES, MIN_CONFIDENCE_FOR_AUTO_ACCEPT, MIN_QUALITY_SCORE } from "./config";
import { validateExpectedType } from "./expectedType";
import { extractFields } from "./fieldExtractor";
import { analyzeImageQuality } from "./imageQuality";
import { runOcr, type OcrProgress } from "./ocr";
import { inferFileMime, prepareScanMedia } from "./scanMedia";
import type { ClassifiedDocumentType, DocumentValidationResult, ValidationIssue } from "./types";

export type PipelineOptions = {
  expectedType?: ClassifiedDocumentType | null;
  onProgress?: (stage: string, progress: number) => void;
};

export type PipelineError = {
  code: "too_large" | "unsupported_type" | "decode_failed";
  message: string;
};

export async function validateDocument(
  file: File | Blob,
  options: PipelineOptions = {},
): Promise<DocumentValidationResult | { error: PipelineError }> {
  const { expectedType = null, onProgress } = options;

  // 1. file-level guards
  if (file.size > MAX_UPLOAD_BYTES) {
    return {
      error: {
        code: "too_large",
        message: `Fișierul depășește limita de ${Math.floor(MAX_UPLOAD_BYTES / 1024 / 1024)} MB.`,
      },
    };
  }

  const mime = "type" in file && file instanceof File ? inferFileMime(file) : "";
  if (!mime && file instanceof File) {
    return {
      error: {
        code: "unsupported_type",
        message: "Nu am recunoscut tipul fișierului. Folosește JPG, PNG, WebP sau PDF.",
      },
    };
  }

  onProgress?.("prepare", 0.02);

  let ocrBlob: Blob;
  let previewUrl = "";
  let sourceLabel = "";
  let sourceKind: "image" | "pdf" = "image";
  try {
    if (!(file instanceof File)) {
      return {
        error: {
          code: "unsupported_type",
          message: "Încarcă un fișier din dispozitiv (JPG, PNG sau PDF).",
        },
      };
    }
    const prepared = await prepareScanMedia(file);
    ocrBlob = prepared.ocrBlob;
    previewUrl = prepared.previewUrl;
    sourceLabel = prepared.sourceLabel;
    sourceKind = prepared.sourceKind;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Nu am putut pregăti fișierul.";
    return {
      error: {
        code: err instanceof Error && message.includes("HEIC") ? "unsupported_type" : "decode_failed",
        message,
      },
    };
  }

  onProgress?.("quality", 0.08);

  // 2. image quality
  let qualityScore = 0.5;
  const qualityIssues: string[] = [];
  try {
    const q = await analyzeImageQuality(ocrBlob);
    qualityScore = q.score;
    qualityIssues.push(...q.issues);
  } catch {
    return {
      error: {
        code: "decode_failed",
        message: "Nu am putut decoda imaginea. Încearcă JPG/PNG sau un PDF cu prima pagină lizibilă.",
      },
    };
  }

  onProgress?.("ocr", 0.2);

  // 3. OCR
  let rawText = "";
  let ocrFailedMessage: string | undefined;
  try {
    rawText = await runOcr(ocrBlob, (_status, p) => {
      onProgress?.("ocr", 0.2 + 0.6 * p);
    });
  } catch (err) {
    ocrFailedMessage = err instanceof Error ? err.message : "OCR eșuat";
    rawText = "";
  }

  onProgress?.("classify", 0.85);

  // 4. classification
  const cls = classifyDocument(rawText);

  // 5. field extraction
  const fields = extractFields(rawText, cls.documentType);

  // 6. expected type
  const expectedMessage = validateExpectedType(
    cls.documentType,
    expectedType ?? null,
    cls.confidence,
  );

  // 7. assemble result
  const readable = rawText.length >= 6 || cls.confidence >= 0.6;
  const issues: ValidationIssue[] = qualityIssues as ValidationIssue[];
  if (!rawText.trim()) issues.push("no_text");
  if (cls.documentType === "unknown") issues.push("unknown_type");
  if (expectedMessage) issues.push("expected_type_mismatch");

  const success =
    !expectedMessage &&
    cls.documentType !== "unknown" &&
    cls.confidence >= MIN_CONFIDENCE_FOR_AUTO_ACCEPT &&
    qualityScore >= MIN_QUALITY_SCORE;

  onProgress?.("done", 1);

  return {
    success,
    documentType: cls.documentType,
    confidence: cls.confidence,
    readable,
    issues,
    extractedFields: fields,
    rawText,
    qualityScore,
    rejectionReason: expectedMessage ?? ocrFailedMessage ?? null,
    previewUrl,
    sourceLabel,
    sourceKind,
  };
}
