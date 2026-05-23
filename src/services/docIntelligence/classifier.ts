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
  driver_license: [
    [/PERMIS\s+DE\s+CONDUCERE/i, 0.45],
    [/DRIVING\s+LICEN[CS]E/i, 0.35],
    [/CATEGORI[AI]\s*(AM|A1|A2|A|B1|B|BE|C1|C|CE|D1|D)/i, 0.18],
    [/\bDRPCIV\b/i, 0.14],
    [/RESTRIC[ȚT]II/i, 0.1],
    [/VALABIL\s+P[ÂA]N[ĂA]/i, 0.1],
  ],
  vehicle_registration: [
    [/CERTIFICAT\s+DE\s+[ÎI]NMATRICULARE/i, 0.45],
    [/REGISTRATION\s+CERTIFICATE/i, 0.35],
    [/CARTE\s+DE\s+IDENTITATE\s+A\s+VEHICULULUI/i, 0.28],
    [/\bCIV\b/i, 0.15],
    [/NUM[ĂA]R\s+DE\s+[ÎI]NMATRICULARE/i, 0.16],
    [/MAS[ĂA]\s+MAXIM[ĂA]/i, 0.1],
    [/SERIE\s+[ȘS]ASIU/i, 0.14],
    [/\bVIN\b/i, 0.1],
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
  tax_decision: [
    [/DECIZIE\s+DE\s+IMPUNERE/i, 0.45],
    [/ANAF/i, 0.22],
    [/OBLIGA[ȚT]II\s+FISCALE/i, 0.22],
    [/IMPOZIT/i, 0.18],
    [/CONTRIBU[ȚT]II\s+SOCIALE/i, 0.14],
    [/FORMULAR\s+\d{3}/i, 0.1],
    [/COD\s+FISCAL/i, 0.12],
  ],
  payment_notice: [
    [/[ÎI]N[ȘS]TIIN[ȚT]ARE\s+DE\s+PLAT[ĂA]/i, 0.42],
    [/SOMA[ȚT]IE/i, 0.24],
    [/TERMEN\s+SCADENT/i, 0.18],
    [/SUM[ĂA]\s+DE\s+PLAT[ĂA]/i, 0.2],
    [/GHISEUL\.RO|GHI[ȘS]EUL\.RO/i, 0.12],
    [/CONT\s+IBAN/i, 0.14],
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
  marriage_certificate: [
    [/CERTIFICAT\s+DE\s+C[ĂA]S[ĂA]TORIE/i, 0.45],
    [/C[ĂA]S[ĂA]TORIE/i, 0.28],
    [/SO[ȚT]|SO[ȚT]IE/i, 0.12],
    [/STARE\s+CIVIL[ĂA]/i, 0.18],
    [/OFICIUL\s+ST[ĂA]RII\s+CIVILE/i, 0.16],
  ],
  student_card: [
    [/LEGITIMA[ȚT]IE\s+DE\s+STUDENT/i, 0.45],
    [/CARNET\s+DE\s+STUDENT/i, 0.35],
    [/\bSTUDENT\b/i, 0.2],
    [/UNIVERSITATEA/i, 0.18],
    [/FACULTATEA/i, 0.16],
    [/AN\s+UNIVERSITAR/i, 0.16],
    [/MATRICOL/i, 0.14],
  ],
  criminal_record: [
    [/CERTIFICAT\s+DE\s+CAZIER\s+JUDICIAR/i, 0.45],
    [/CAZIER\s+JUDICIAR/i, 0.35],
    [/INSPECTORATUL\s+GENERAL\s+AL\s+POLI[ȚT]IEI/i, 0.18],
    [/NU\s+ESTE\s+[ÎI]NSCRIS/i, 0.14],
    [/ANTECEDENTE\s+PENALE/i, 0.16],
  ],
  medical_certificate: [
    [/ADEVERIN[ȚT][ĂA]\s+MEDICAL[ĂA]/i, 0.42],
    [/CERTIFICAT\s+MEDICAL/i, 0.36],
    [/MEDIC\s+DE\s+FAMILIE/i, 0.18],
    [/APT\s+MEDICAL/i, 0.16],
    [/DIAGNOSTIC/i, 0.12],
    [/PARAF[ĂA]/i, 0.1],
  ],
  property_deed: [
    [/CONTRACT\s+DE\s+V[ÂA]NZARE[-\s]CUMP[ĂA]RARE/i, 0.45],
    [/ACT\s+DE\s+PROPRIETATE/i, 0.35],
    [/NOTAR\s+PUBLIC/i, 0.18],
    [/IMOBIL/i, 0.14],
    [/NR\.\s+CADASTRAL/i, 0.16],
    [/INTABULARE/i, 0.14],
  ],
  cadastral_extract: [
    [/EXTRAS\s+DE\s+CARTE\s+FUNCIAR[ĂA]/i, 0.48],
    [/CARTE\s+FUNCIAR[ĂA]/i, 0.28],
    [/\bANCPI\b/i, 0.18],
    [/\bOCPI\b/i, 0.18],
    [/NUM[ĂA]R\s+CADASTRAL/i, 0.14],
    [/PROPRIETAR/i, 0.1],
  ],
  rental_contract: [
    [/CONTRACT\s+DE\s+[ÎI]NCHIRIERE/i, 0.45],
    [/LOCATOR/i, 0.16],
    [/LOCATAR/i, 0.16],
    [/CHIRIE/i, 0.18],
    [/SPA[ȚT]IU\s+LOCATIV/i, 0.12],
  ],
  employment_contract: [
    [/CONTRACT\s+INDIVIDUAL\s+DE\s+MUNC[ĂA]/i, 0.45],
    [/\bCIM\b/i, 0.16],
    [/ANGAJATOR/i, 0.18],
    [/SALARIAT/i, 0.18],
    [/SALARIU\s+DE\s+BAZ[ĂA]/i, 0.14],
    [/REVISAL/i, 0.12],
  ],
  diploma: [
    [/DIPLOM[ĂA]/i, 0.28],
    [/ADEVERIN[ȚT][ĂA]\s+DE\s+STUDII/i, 0.35],
    [/BACALAUREAT/i, 0.2],
    [/LICEN[ȚT][ĂA]/i, 0.2],
    [/ABSOLVIRE/i, 0.16],
    [/MINISTERUL\s+EDUCA[ȚT]IEI/i, 0.16],
  ],
  bank_statement: [
    [/EXTRAS\s+DE\s+CONT/i, 0.45],
    [/CONT\s+CURENT/i, 0.18],
    [/\bIBAN\b/i, 0.18],
    [/SOLD\s+(INI[ȚT]IAL|FINAL)/i, 0.18],
    [/TRANZAC[ȚT]II/i, 0.14],
    [/BANCA|BANK/i, 0.1],
  ],
  insurance_policy: [
    [/POLI[ȚT][ĂA]\s+DE\s+ASIGURARE/i, 0.45],
    [/\bRCA\b/i, 0.22],
    [/\bCASCO\b/i, 0.2],
    [/ASIGURAT/i, 0.14],
    [/ASIGUR[ĂA]TOR/i, 0.14],
    [/VALABILITATE/i, 0.1],
  ],
  invoice: [
    [/FACTUR[ĂA]\s+(FISCAL[ĂA])?/i, 0.34],
    [/FURNIZOR/i, 0.14],
    [/CLIENT/i, 0.1],
    [/TOTAL\s+DE\s+PLAT[ĂA]/i, 0.18],
    [/\bTVA\b/i, 0.12],
    [/SERIE\s+FACTUR[ĂA]/i, 0.14],
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
    driver_license: 0,
    vehicle_registration: 0,
    utility_bill: 0,
    tax_decision: 0,
    payment_notice: 0,
    birth_certificate: 0,
    marriage_certificate: 0,
    student_card: 0,
    criminal_record: 0,
    medical_certificate: 0,
    property_deed: 0,
    cadastral_extract: 0,
    rental_contract: 0,
    employment_contract: 0,
    diploma: 0,
    bank_statement: 0,
    insurance_policy: 0,
    invoice: 0,
    unknown: 0,
  };
  const signals: Record<ClassifiedDocumentType, string[]> = {
    romanian_id: [],
    passport: [],
    driver_license: [],
    vehicle_registration: [],
    utility_bill: [],
    tax_decision: [],
    payment_notice: [],
    birth_certificate: [],
    marriage_certificate: [],
    student_card: [],
    criminal_record: [],
    medical_certificate: [],
    property_deed: [],
    cadastral_extract: [],
    rental_contract: [],
    employment_contract: [],
    diploma: [],
    bank_statement: [],
    insurance_policy: [],
    invoice: [],
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

  // A valid-looking CNP strongly biases toward Romanian ID, unless the text
  // already looks like a student card. Some student cards also print CNP-like
  // numbers, and treating those as identity cards is a bad false positive.
  if (CNP_BOOST_RE.test(rawText) && scores.student_card === 0) {
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
