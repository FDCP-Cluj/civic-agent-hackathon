// Regex-based field extraction — TS port of V1
// apps/api/app/services/document_intelligence/field_extractor.py,
// with an added control-digit validator for CNP (which the Python version
// didn't have — bonus accuracy for free).

import type { ClassifiedDocumentType, ExtractedFields } from "./types";

const CNP_RE = /(?<!\d)([1-9]\d{12})(?!\d)/;
const DATE_RE = /\b(\d{2})[./](\d{2})[./](\d{4})\b/g;
const ADDRESS_HINTS =
  /(?:DOMICILIU|ADRESA|ADDRESS|STR\.|STRADA|BD\.|BULEVARD|MUN\.|MUNICIPIUL|JUD\.|JUDET)/i;

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

  const dateMatch = DATE_RE.exec(rawText);
  if (dateMatch) {
    const [, d, m, y] = dateMatch;
    fields.birthDate = `${y}-${m}-${d}`;
  }

  fields.address = extractAddress(lines);
  const [first, last] = extractName(lines, documentType);
  fields.firstName = first;
  fields.lastName = last;

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
  if (
    documentType !== "romanian_id" &&
    documentType !== "passport" &&
    documentType !== "birth_certificate"
  ) {
    return [null, null];
  }

  const skip =
    /CARTE|IDENTITATE|ROMANIA|CNP|SERIA|DOMICILIU|PASSPORT|PASAPORT|CERTIFICAT|REGISTRU|STARE|CIVIL/i;

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

function titleCase(s: string): string {
  return s
    .toLocaleLowerCase("ro-RO")
    .split(/\s+/)
    .map((w) => w.charAt(0).toLocaleUpperCase("ro-RO") + w.slice(1))
    .join(" ");
}
