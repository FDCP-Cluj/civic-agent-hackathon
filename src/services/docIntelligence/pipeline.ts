// Top-level pipeline that walks a single image through every stage:
// quality → OCR → classify → extract → expected-type. All in-browser; the
// file's bytes never leave the device.
//
// Mirrors the V1 pipeline.py flow, minus the PDF branch (PDF support can
// be re-added later by rendering page 1 to a canvas before passing it in).

import { classifyDocument } from "./classifier";
import {
  ALLOWED_IMAGE_MIME,
  ALLOWED_PDF_MIME,
  MAX_UPLOAD_BYTES,
  MIN_CONFIDENCE_FOR_AUTO_ACCEPT,
  MIN_QUALITY_SCORE,
} from "./config";
import { validateExpectedType } from "./expectedType";
import { extractFields } from "./fieldExtractor";
import { analyzeImageQuality } from "./imageQuality";
import { runOcr, type OcrProgress } from "./ocr";
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

  const mime = "type" in file ? file.type : "";
  if (mime && !ALLOWED_IMAGE_MIME.has(mime) && !ALLOWED_PDF_MIME.has(mime)) {
    return {
      error: {
        code: "unsupported_type",
        message: `Tipul de fișier ${mime || "necunoscut"} nu este acceptat. Folosiți JPG, PNG sau PDF.`,
      },
    };
  }
  if (ALLOWED_PDF_MIME.has(mime)) {
    // PDF pipeline not yet wired client-side; surface a friendly error so
    // the UI can fall back to "save without validation".
    return {
      error: {
        code: "unsupported_type",
        message:
          "PDF-urile nu sunt încă validate local. Atașează o fotografie pentru a rula verificarea.",
      },
    };
  }

  onProgress?.("quality", 0.05);

  // 2. image quality
  let qualityScore = 0.5;
  const qualityIssues: string[] = [];
  try {
    const q = await analyzeImageQuality(file);
    qualityScore = q.score;
    qualityIssues.push(...q.issues);
  } catch {
    return {
      error: {
        code: "decode_failed",
        message: "Nu am putut decoda imaginea. Încearcă din nou cu un alt format.",
      },
    };
  }

  onProgress?.("ocr", 0.25);

  // 3. OCR
  const rawText = await runOcr(file, (_status, p) => {
    onProgress?.("ocr", 0.25 + 0.55 * p);
  });

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
    rejectionReason: expectedMessage,
  };
}
