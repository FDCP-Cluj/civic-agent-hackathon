// Keyword/regex weighted classifier — direct TS port of V1
// apps/api/app/services/document_intelligence/classifier.py.
//
// All matching is local. No model weights, no network. Confidence is
// calibrated to the same 0.15 / 0.45 / 0.98 cut-offs as V1.

import type { ClassificationResult, ClassifiedDocumentType } from "./types";

type Signal = [RegExp, number];

const SIGNALS: Record<Exclude<ClassifiedDocumentType, "unknown">, Signal[]> = {
  romanian_id: [
    [/CARTE\s+DE\s+IDENTITATE/i, 0.35],
    [/\bCNP\b/i, 0.2],
    [/\bSERIA\b/i, 0.15],
    [/\bROMANIA\b/i, 0.1],
    [/\bROUMANIE\b/i, 0.1],
    [/IDENTITY\s+CARD/i, 0.15],
    [/\bC\.I\.\b/i, 0.1],
    [/DOMICILIU/i, 0.08],
    [/NATIONALITATE/i, 0.08],
  ],
  passport: [
    [/\bPASSPORT\b/i, 0.35],
    [/\bPASAPORT\b/i, 0.35],
    [/PASSEPORT/i, 0.3],
    [/\bMRZ\b/i, 0.15],
    [/P<[A-Z]{3}/, 0.25],
    [/TYPE\s+P/i, 0.1],
  ],
  utility_bill: [
    [/FACTURA/i, 0.2],
    [/UTILITAT/i, 0.2],
    [/\bKWH\b/i, 0.15],
    [/\bMWH\b/i, 0.15],
    [/ENERGIE/i, 0.12],
    [/GAZE/i, 0.1],
    [/AP[AĂ]\s*CANAL/i, 0.15],
    [/FURNIZOR/i, 0.1],
    [/SCADENT/i, 0.08],
    [/CONSUM/i, 0.08],
    [/E\.ON/i, 0.1],
    [/ENEL/i, 0.1],
    [/DIGI/i, 0.08],
  ],
  birth_certificate: [
    [/CERTIFICAT/i, 0.15],
    [/NASTERE/i, 0.25],
    [/NAȘTERE/i, 0.25],
    [/NĂSCUT/i, 0.15],
    [/NĂSCUTĂ/i, 0.15],
    [/REGISTRU/i, 0.1],
    [/STARE\s+CIVIL/i, 0.2],
    [/EXTRAS/i, 0.08],
    [/MUNICIPIUL/i, 0.05],
  ],
};

const CNP_BOOST_RE = /(?<!\d)([1-9]\d{12})(?!\d)/;

export function classifyDocument(rawText: string): ClassificationResult {
  if (!rawText.trim()) {
    return { documentType: "unknown", confidence: 0, matchedSignals: [] };
  }

  const text = rawText.toUpperCase();
  const scores: Record<ClassifiedDocumentType, number> = {
    romanian_id: 0,
    passport: 0,
    utility_bill: 0,
    birth_certificate: 0,
    unknown: 0,
  };
  const signals: Record<ClassifiedDocumentType, string[]> = {
    romanian_id: [],
    passport: [],
    utility_bill: [],
    birth_certificate: [],
    unknown: [],
  };

  for (const [docType, patterns] of Object.entries(SIGNALS) as [
    Exclude<ClassifiedDocumentType, "unknown">,
    Signal[],
  ][]) {
    for (const [pattern, weight] of patterns) {
      if (pattern.test(text)) {
        scores[docType] += weight;
        signals[docType].push(pattern.source);
      }
    }
  }

  // A valid-looking CNP strongly biases toward Romanian ID.
  if (CNP_BOOST_RE.test(rawText)) {
    scores.romanian_id += 0.25;
    signals.romanian_id.push("CNP_PATTERN");
  }

  const ranked = (Object.keys(scores) as ClassifiedDocumentType[])
    .filter((k) => k !== "unknown")
    .sort((a, b) => scores[b] - scores[a]);
  const bestType = ranked[0];
  const bestScore = scores[bestType];

  if (bestScore < 0.15) {
    return {
      documentType: "unknown",
      confidence: Math.min(0.4, bestScore),
      matchedSignals: [],
    };
  }

  return {
    documentType: bestType,
    confidence: Math.min(0.98, 0.45 + bestScore),
    matchedSignals: signals[bestType].slice(0, 8),
  };
}
