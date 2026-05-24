// Tesseract.js wrapper. Loads worker + language data lazily, caches the
// worker for subsequent scans, exposes a prefetch hook so screens that
// expect a scan soon can warm the WASM/lang downloads in the background.

import { createWorker, type Worker } from "tesseract.js";

const LANGS = "ron+eng";

let workerPromise: Promise<Worker> | null = null;
let ocrProgressSink: OcrProgress | undefined;

async function getWorker(): Promise<Worker> {
  if (!workerPromise) {
    workerPromise = createWorker(LANGS, 1, {
      logger: (message) => {
        if (message.status === "recognizing text" && typeof message.progress === "number") {
          ocrProgressSink?.("recognizing", message.progress);
        }
      },
    }).catch((err) => {
      workerPromise = null;
      throw err;
    });
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
  ocrProgressSink = onProgress;
  onProgress?.("loading", 0);

  let worker: Worker;
  try {
    worker = await getWorker();
  } catch (err) {
    console.warn("OCR worker init failed:", err);
    ocrProgressSink = undefined;
    throw new Error(
      "Motorul OCR nu s-a încărcat. Verifică conexiunea la internet (prima rulare descarcă limba română) și reîncarcă pagina.",
    );
  }

  const image: Blob | string =
    src instanceof Blob ? URL.createObjectURL(src) : src;

  try {
    onProgress?.("recognizing", 0.05);
    const { data } = await worker.recognize(image);
    onProgress?.("recognizing", 1);
    return (data.text ?? "").trim();
  } catch (err) {
    console.warn("OCR failure:", err);
    throw new Error("Nu am putut citi textul din imagine. Încearcă o fotografie mai clară.");
  } finally {
    if (src instanceof Blob && typeof image === "string") {
      URL.revokeObjectURL(image);
    }
    ocrProgressSink = undefined;
  }
}

export async function disposeOcr(): Promise<void> {
  if (workerPromise) {
    const w = await workerPromise;
    await w.terminate();
    workerPromise = null;
  }
}
