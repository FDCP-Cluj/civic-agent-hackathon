// Normalize uploads (PDF → PNG, MIME from extension) before OCR.

import * as pdfjsLib from "pdfjs-dist";
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { ALLOWED_IMAGE_MIME, ALLOWED_PDF_MIME } from "./config";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

export type PreparedScanMedia = {
  /** Bytes passed to quality + OCR (always a raster image). */
  ocrBlob: Blob;
  /** Preview in UI (data URL or blob URL). */
  previewUrl: string;
  sourceKind: "image" | "pdf";
  sourceLabel: string;
};

const EXT_MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  heic: "image/heic",
  heif: "image/heif",
  pdf: "application/pdf",
};

export function inferFileMime(file: File): string {
  if (file.type) return file.type;
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  return EXT_MIME[ext] ?? "";
}

export function isHeicMime(mime: string): boolean {
  return mime === "image/heic" || mime === "image/heif";
}

async function pdfFirstPageToPngBlob(pdfBytes: ArrayBuffer): Promise<Blob> {
  const copy = pdfBytes.slice(0);
  const doc = await pdfjsLib.getDocument({ data: copy }).promise;
  const page = await doc.getPage(1);
  const scale = Math.min(2.5, 2400 / Math.max(page.getViewport({ scale: 1 }).width, 1));
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement("canvas");
  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas indisponibil");
  await page.render({ canvasContext: ctx, viewport }).promise;
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob((b) => resolve(b), "image/png", 0.92),
  );
  if (!blob) throw new Error("Nu am putut converti PDF-ul în imagine.");
  return blob;
}

async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

/**
 * Turns an uploaded File into a raster image suitable for Canvas + Tesseract.
 */
export async function prepareScanMedia(file: File): Promise<PreparedScanMedia> {
  const mime = inferFileMime(file);

  if (isHeicMime(mime)) {
    throw new Error(
      "Format HEIC/HEIF nu este suportat în browser. Fă o poză nouă (JPG) sau exportă imaginea ca JPEG din Galerie.",
    );
  }

  if (ALLOWED_PDF_MIME.has(mime)) {
    const bytes = await file.arrayBuffer();
    const ocrBlob = await pdfFirstPageToPngBlob(bytes);
    const previewUrl = await blobToDataUrl(ocrBlob);
    return {
      ocrBlob,
      previewUrl,
      sourceKind: "pdf",
      sourceLabel: `${file.name} (pagina 1)`,
    };
  }

  if (!ALLOWED_IMAGE_MIME.has(mime)) {
    throw new Error(
      `Tip de fișier neacceptat (${mime || "necunoscut"}). Folosește JPG, PNG, WebP sau PDF.`,
    );
  }

  const previewUrl = await blobToDataUrl(file);
  return {
    ocrBlob: file,
    previewUrl,
    sourceKind: "image",
    sourceLabel: file.name,
  };
}
