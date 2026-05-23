// Tesseract.js wrapper. Loads worker + language data lazily, caches the
// worker for subsequent scans, exposes a prefetch hook so screens that
// expect a scan soon can warm the WASM/lang downloads in the background.

import { createWorker, type Worker } from "tesseract.js";

const LANGS = "ron+eng";

let workerPromise: Promise<Worker> | null = null;

async function getWorker(): Promise<Worker> {
  if (!workerPromise) {
    workerPromise = createWorker(LANGS);
  }
  return workerPromise;
}

/** Optional warm-up — call when the user is about to scan. */
export function prefetchOcr(): void {
  // Fire-and-forget; errors here just mean we'll initialize on first use.
  void getWorker().catch(() => {
    workerPromise = null;
  });
}

export type OcrProgress = (status: string, progress: number) => void;

export async function runOcr(src: Blob | string, onProgress?: OcrProgress): Promise<string> {
  const worker = await getWorker();
  if (onProgress) {
    // Tesseract v5's worker emits progress via the logger param at create
    // time; for simplicity we just report the start/end here.
    onProgress("ocr_start", 0);
  }
  try {
    const { data } = await worker.recognize(src);
    onProgress?.("ocr_done", 1);
    return (data.text ?? "").trim();
  } catch (err) {
    // Tesseract failures shouldn't crash the page — return empty text and
    // let downstream code surface a generic "couldn't read" message.
    console.warn("OCR failure:", err);
    onProgress?.("ocr_error", 1);
    return "";
  }
}

export async function disposeOcr(): Promise<void> {
  if (workerPromise) {
    const w = await workerPromise;
    await w.terminate();
    workerPromise = null;
  }
}
