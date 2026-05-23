// Regex-based field extraction — TS port of V1
// apps/api/app/services/document_intelligence/field_extractor.py,
// with an added control-digit validator for CNP (which the Python version
// didn't have — bonus accuracy for free).

import type { ClassifiedDocumentType, ExtractedFields } from "./types";

const CNP_RE = /(?<!\d)([1-9]\d{12})(?!\d)/;
const DATE_RE = /\b(\d{2})[./-](\d{2})[./-](\d{4})\b/;
const IBAN_RE = /\bRO\d{2}(?:\s?[A-Z0-9]){10,30}\b/i;
const AMOUNT_RE =
  /(?:TOTAL(?:\s+DE\s+PLAT[ĂA])?|SUM[ĂA]\s+DE\s+PLAT[ĂA]|VALOARE|SOLD(?:\s+FINAL)?|CHIRIE|SALARIU)\s*:?\s*([0-9]{1,3}(?:[.\s][0-9]{3})*(?:[,.][0-9]{2})?\s*(?:RON|LEI|EUR)?)/i;
const FISCAL_CODE_RE =
  /(?:CUI|CIF|COD\s+FISCAL|COD\s+DE\s+IDENTIFICARE\s+FISCAL[ĂA])\s*:?\s*(RO?\s*)?(\d{2,13})/i;
const VEHICLE_PLATE_RE = /\b([A-Z]{1,2}\s?\d{2,3}\s?[A-Z]{3})\b/;
const ADDRESS_HINTS =
  /(?:DOMICILIU|ADRES[ĂA]|ADDRESS|SEDIU|IMOBIL|STR\.|STRADA|BD\.|BULEVARD|MUN\.|MUNICIPIUL|JUD\.|JUDET)/i;

const CNP_WEIGHTS = [2, 7, 9, 1, 4, 6, 3, 5, 8, 2, 7, 9];

/** Validates the 13th digit using the official Romanian CNP formula. */
export function isValidCNP(cnp: string): boolean {
  if (!/^\d{13}$/.test(cnp)) return false;
  let sum = 0;
  for (let i = 0; i < 12; i += 1) {
    sum += Number(cnp[i]) * CNP_WEIGHTS[i];
  }
  const remainder = sum % 11;
  const control = remainder === 10 ? 1 : remainder;
  return control === Number(cnp[12]);
}

export function extractFields(
  rawText: string,
  documentType: ClassifiedDocumentType,
): ExtractedFields {
  const empty: ExtractedFields = {
    firstName: null,
    lastName: null,
    cnp: null,
    address: null,
    birthDate: null,
    documentNumber: null,
    issueDate: null,
    expiryDate: null,
    amount: null,
    dueDate: null,
    iban: null,
    fiscalCode: null,
    vehiclePlate: null,
  };
  if (!rawText.trim()) return empty;

  const lines = rawText
    .split(/\r?\n/)
    .map((ln) => ln.trim())
    .filter(Boolean);

  const fields: ExtractedFields = { ...empty };

  const cnpMatch = CNP_RE.exec(rawText);
  if (cnpMatch && isValidCNP(cnpMatch[1])) {
    fields.cnp = cnpMatch[1];
  }

  if (canContainBirthDate(documentType)) {
    fields.birthDate =
      findDateNear(lines, /(DATA\s+NA[ȘS]TERII|N[ĂA]SCUT|BIRTH\s+DATE|DATE\s+OF\s+BIRTH)/i) ??
      inferBirthDateFromCnp(fields.cnp) ??
      firstDate(rawText);
  }
  fields.issueDate = findDateNear(lines, /(EMIS|ELIBERAT|DATA\s+EMITERII|ISSUED|ÎNTOCMIT)/i);
  fields.expiryDate = findDateNear(
    lines,
    /(VALABIL|EXPIR[ĂA]|EXPIRY|VALID\s+UNTIL|P[ÂA]N[ĂA]\s+LA)/i,
  );
  fields.dueDate = findDateNear(lines, /(SCADENT|TERMEN|DUE\s+DATE|PLAT[ĂA]\s+P[ÂA]N[ĂA])/i);
  fields.address = extractAddress(lines);
  const [first, last] = extractName(lines, documentType);
  fields.firstName = first;
  fields.lastName = last;
  fields.documentNumber = extractDocumentNumber(lines, documentType);
  fields.amount = extractAmount(rawText);
  fields.iban = normalizeIban(IBAN_RE.exec(rawText)?.[0] ?? null);
  fields.fiscalCode = extractFiscalCode(rawText);
  fields.vehiclePlate = VEHICLE_PLATE_RE.exec(rawText)?.[1]?.replace(/\s+/g, " ") ?? null;

  return fields;
}

function extractAddress(lines: string[]): string | null {
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (!ADDRESS_HINTS.test(line)) continue;
    const chunk: string[] = [line];
    for (const nxt of lines.slice(i + 1, i + 4)) {
      if (nxt.length > 5 && !CNP_RE.test(nxt)) {
        chunk.push(nxt);
      } else {
        break;
      }
    }
    const joined = chunk
      .join(" ")
      .replace(/^(DOMICILIU|ADRESA|ADDRESS)\s*:?\s*/i, "")
      .trim();
    return joined ? joined.slice(0, 500) : null;
  }
  return null;
}

function extractName(
  lines: string[],
  documentType: ClassifiedDocumentType,
): [string | null, string | null] {
  const nameBearingTypes: ClassifiedDocumentType[] = [
    "romanian_id",
    "passport",
    "driver_license",
    "birth_certificate",
    "marriage_certificate",
    "student_card",
    "criminal_record",
    "medical_certificate",
    "diploma",
    "employment_contract",
    "rental_contract",
  ];
  if (!nameBearingTypes.includes(documentType)) {
    return [null, null];
  }

  const skip =
    /CARTE|IDENTITATE|ROMANIA|CNP|SERIA|DOMICILIU|PASSPORT|PASAPORT|CERTIFICAT|REGISTRU|STARE|CIVIL|PERMIS|STUDENT|UNIVERSITATE|FACULTATE|CONTRACT|ADEVERIN|DIPLOM/i;

  const candidates: string[] = [];
  for (const line of lines.slice(0, 20)) {
    if (skip.test(line) || CNP_RE.test(line)) continue;
    if (
      /^[A-ZĂÂÎȘȚ][A-ZĂÂÎȘȚa-zăâîșț\-\s]{2,}$/.test(line) &&
      line.split(/\s+/).length >= 2 &&
      line.split(/\s+/).length <= 4
    ) {
      candidates.push(line);
    }
  }

  if (candidates.length === 0) return [null, null];

  const parts = candidates[0].split(/\s+/);
  if (parts.length >= 2) {
    return [titleCase(parts[0]), titleCase(parts.slice(1).join(" "))];
  }
  if (parts.length === 1) {
    return [null, titleCase(parts[0])];
  }
  return [null, null];
}

function canContainBirthDate(documentType: ClassifiedDocumentType): boolean {
  return [
    "romanian_id",
    "passport",
    "driver_license",
    "birth_certificate",
    "student_card",
    "criminal_record",
    "medical_certificate",
    "diploma",
  ].includes(documentType);
}

function firstDate(text: string): string | null {
  const match = DATE_RE.exec(text);
  return match ? normalizeDate(match) : null;
}

function findDateNear(lines: string[], hint: RegExp): string | null {
  for (let i = 0; i < lines.length; i += 1) {
    if (!hint.test(lines[i])) continue;
    const nearby = [lines[i], lines[i + 1], lines[i + 2]].filter(Boolean).join(" ");
    const match = DATE_RE.exec(nearby);
    if (match) return normalizeDate(match);
  }
  return null;
}

function normalizeDate(match: RegExpExecArray): string {
  const [, d, m, y] = match;
  return `${y}-${m}-${d}`;
}

function inferBirthDateFromCnp(cnp: string | null): string | null {
  if (!cnp || !isValidCNP(cnp)) return null;
  const sexCentury = Number(cnp[0]);
  const yearPrefix =
    sexCentury === 1 || sexCentury === 2
      ? "19"
      : sexCentury === 5 || sexCentury === 6
        ? "20"
        : null;
  if (!yearPrefix) return null;
  return `${yearPrefix}${cnp.slice(1, 3)}-${cnp.slice(3, 5)}-${cnp.slice(5, 7)}`;
}

function extractDocumentNumber(
  lines: string[],
  documentType: ClassifiedDocumentType,
): string | null {
  const patterns = [
    /(?:SERIA|SERIE)\s*([A-Z]{1,3})\s*(?:NR\.?|NUM[ĂA]R)?\s*([A-Z0-9]{3,12})/i,
    /(?:NR\.?|NUM[ĂA]R|NO\.?|DOCUMENT\s+NO\.?|PERMIS\s+NR\.?|LEGITIMA[ȚT]IE\s+NR\.?)\s*:?\s*([A-Z0-9][A-Z0-9\s./-]{2,24})/i,
  ];
  for (const line of lines.slice(0, 30)) {
    for (const pattern of patterns) {
      const match = pattern.exec(line);
      if (!match) continue;
      const value = match.slice(1).filter(Boolean).join(" ").trim();
      if (value && !DATE_RE.test(value)) return value.replace(/\s+/g, " ").slice(0, 40);
    }
  }
  if (documentType === "passport") {
    const mrz = lines.find((line) => /^P<[A-Z0-9<]+/.test(line));
    const next = mrz ? lines[lines.indexOf(mrz) + 1] : null;
    const passportNo = next?.replace(/</g, " ").trim().split(/\s+/)[0];
    return passportNo && passportNo.length >= 6 ? passportNo : null;
  }
  return null;
}

function extractAmount(text: string): string | null {
  const labelled = AMOUNT_RE.exec(text)?.[1];
  if (labelled) return labelled.replace(/\s+/g, " ").trim();
  const generic = /\b([0-9]{1,3}(?:[.\s][0-9]{3})*(?:[,.][0-9]{2})\s*(?:RON|LEI|EUR))\b/i.exec(
    text,
  );
  return generic?.[1]?.replace(/\s+/g, " ").trim() ?? null;
}

function normalizeIban(value: string | null): string | null {
  if (!value) return null;
  return value.replace(/\s+/g, " ").trim().toUpperCase();
}

function extractFiscalCode(text: string): string | null {
  const match = FISCAL_CODE_RE.exec(text);
  if (!match) return null;
  return `${match[1] ?? ""}${match[2]}`.replace(/\s+/g, "").toUpperCase();
}

function titleCase(s: string): string {
  return s
    .toLocaleLowerCase("ro-RO")
    .split(/\s+/)
    .map((w) => w.charAt(0).toLocaleUpperCase("ro-RO") + w.slice(1))
    .join(" ");
}
