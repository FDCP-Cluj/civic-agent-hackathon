// Client-side image quality heuristics — pure Canvas2D, no WASM. Inspired by
// V1's image_quality.py (OpenCV-based) but rewritten for the browser. We
// keep the same threshold constants so the pass/fail behaviour is
// comparable on equivalent inputs.

import {
  BLUR_VARIANCE_MIN,
  BRIGHTNESS_MAX,
  BRIGHTNESS_MIN,
  CONTRAST_STD_MIN,
  DARK_PIXEL_RATIO_MAX,
  GLARE_RATIO_MAX,
} from "./config";
import type { ImageQualityResult } from "./types";

const MAX_ANALYSIS_DIM = 720; // downscale before analysis for speed

/** Loads an image source into an HTMLImageElement, awaiting decode. */
export async function loadImage(src: string | Blob): Promise<HTMLImageElement> {
  const url = typeof src === "string" ? src : URL.createObjectURL(src);
  try {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = url;
    await img.decode();
    return img;
  } finally {
    if (typeof src !== "string") {
      // Defer revocation so callers can re-read the same blob URL.
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    }
  }
}

function drawToCanvas(img: HTMLImageElement): {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
} {
  const ratio = Math.min(1, MAX_ANALYSIS_DIM / Math.max(img.width, img.height));
  const width = Math.max(1, Math.round(img.width * ratio));
  const height = Math.max(1, Math.round(img.height * ratio));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas 2D context unavailable");
  ctx.drawImage(img, 0, 0, width, height);
  return { canvas, ctx, width, height };
}

/**
 * Approximates OpenCV's Laplacian-variance blur metric. We convolve the
 * luminance channel with the classic 3x3 Laplacian kernel
 * [[0,1,0],[1,-4,1],[0,1,0]] and report the variance of the response.
 * Lower variance = blurrier image.
 */
function laplacianVariance(lum: Float32Array, w: number, h: number): number {
  if (w < 3 || h < 3) return 0;
  const responses: number[] = [];
  let sum = 0;
  let count = 0;
  for (let y = 1; y < h - 1; y += 1) {
    for (let x = 1; x < w - 1; x += 1) {
      const i = y * w + x;
      const v = -4 * lum[i] + lum[i - 1] + lum[i + 1] + lum[i - w] + lum[i + w];
      responses.push(v);
      sum += v;
      count += 1;
    }
  }
  const mean = sum / count;
  let varSum = 0;
  for (const r of responses) varSum += (r - mean) ** 2;
  return varSum / count;
}

export async function analyzeImageQuality(src: string | Blob): Promise<ImageQualityResult> {
  const img = await loadImage(src);
  const { ctx, width, height } = drawToCanvas(img);
  const { data } = ctx.getImageData(0, 0, width, height);

  const total = width * height;
  const lum = new Float32Array(total);

  let brightnessSum = 0;
  let glareCount = 0;
  let darkCount = 0;

  for (let i = 0; i < total; i += 1) {
    const r = data[i * 4];
    const g = data[i * 4 + 1];
    const b = data[i * 4 + 2];
    const y = 0.299 * r + 0.587 * g + 0.114 * b;
    lum[i] = y;
    brightnessSum += y;
    if (y > 240) glareCount += 1;
    if (y < 35) darkCount += 1;
  }

  const brightnessMean = brightnessSum / total;
  let contrastVar = 0;
  for (let i = 0; i < total; i += 1) {
    contrastVar += (lum[i] - brightnessMean) ** 2;
  }
  const contrastStd = Math.sqrt(contrastVar / total);
  const glareRatio = glareCount / total;
  const darkRatio = darkCount / total;
  const blurVariance = laplacianVariance(lum, width, height);

  const issues: string[] = [];
  if (blurVariance < BLUR_VARIANCE_MIN) issues.push("blurry");
  if (contrastStd < CONTRAST_STD_MIN) issues.push("low_contrast");
  if (brightnessMean < BRIGHTNESS_MIN) issues.push("too_dark");
  if (brightnessMean > BRIGHTNESS_MAX) issues.push("too_bright");
  if (glareRatio > GLARE_RATIO_MAX) issues.push("glare");
  if (darkRatio > DARK_PIXEL_RATIO_MAX) issues.push("too_dark");

  // Compose a 0..1 score from sub-metrics. Each metric clamps independently
  // then they're averaged. The thresholds map to 0.5 — anything beyond is
  // softer points toward 1.
  const score = average(
    clamp(blurVariance / (BLUR_VARIANCE_MIN * 2)),
    clamp(contrastStd / (CONTRAST_STD_MIN * 2)),
    clamp(brightnessHealth(brightnessMean)),
    clamp(1 - glareRatio / GLARE_RATIO_MAX),
    clamp(1 - darkRatio / DARK_PIXEL_RATIO_MAX),
  );

  return {
    score,
    blurVariance,
    contrastStd,
    brightnessMean,
    glareRatio,
    darkRatio,
    issues,
  };
}

function clamp(n: number): number {
  if (!Number.isFinite(n)) return 0;
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

function average(...nums: number[]): number {
  if (nums.length === 0) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function brightnessHealth(mean: number): number {
  // Returns 1 when mean is at the middle of the acceptable range, falling
  // off toward the edges.
  const target = (BRIGHTNESS_MIN + BRIGHTNESS_MAX) / 2;
  const span = (BRIGHTNESS_MAX - BRIGHTNESS_MIN) / 2;
  return 1 - Math.abs(mean - target) / span;
}
