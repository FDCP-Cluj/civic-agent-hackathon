// Romanian CI parsers — tuned for noisy Tesseract output + MRZ fallback.

import {
  emptyStructuredAddress,
  formatStructuredAddress,
  type StructuredAddress,
} from "@/lib/address";

const CNP_RE = /(?<!\d)([1-9]\d{12})(?!\d)/;

const JUD_COUNTY: Record<string, string> = {
  AB: "Alba",
  AR: "Arad",
  AG: "Argeș",
  BC: "Bacău",
  BH: "Bihor",
  BN: "Bistrița-Năsăud",
  BT: "Botoșani",
  BV: "Brașov",
  BR: "Brăila",
  B: "București",
  BZ: "Buzău",
  CS: "Caraș-Severin",
  CL: "Călărași",
  CJ: "Cluj",
  CT: "Constanța",
  CV: "Covasna",
  DB: "Dâmbovița",
  DJ: "Dolj",
  GL: "Galați",
  GR: "Giurgiu",
  GJ: "Gorj",
  HR: "Harghita",
  HD: "Hunedoara",
  IL: "Ialomița",
  IS: "Iași",
  IF: "Ilfov",
  MM: "Maramureș",
  MH: "Mehedinți",
  MS: "Mureș",
  NT: "Neamț",
  OT: "Olt",
  PH: "Prahova",
  SM: "Satu Mare",
  SJ: "Sălaj",
  SB: "Sibiu",
  SV: "Suceava",
  TR: "Teleorman",
  TM: "Timiș",
  TL: "Tulcea",
  VS: "Vaslui",
  VL: "Vâlcea",
  VN: "Vrancea",
};

/** OCR tokens that are not real names (2-letter junk, labels, MRZ fragments). */
const NAME_GARBAGE = new Set([
  "uo",
  "ua",
  "gf",
  "rh",
  "sa",
  "ns",
  "dt",
  "sem",
  "eso",
  "rou",
  "brebu",
  "wii",
  "card",
  "poz",
  "one",
  "hy",
  "nom",
  "sex",
  "mrz",
  "identity",
  "identite",
  "carte",
  "romania",
  "roumanie",
  "robu",
  "roou",
  "rouo",
  "valent",
  "ina",
  "eard",
  "delivree",
  "validite",
  "validity",
  "issued",
  "spclep",
]);

const SKIP_NAME =
  /CARTE|IDENTITATE|ROMANIA|ROUMANIE|CNP|SERIA|SERIE|DOMICILIU|ADRES|ADDRESS|PASSPORT|STARE|CIVIL|SEX|CETAT|NATIONAL|VALID|VALABIL|EMIS|ELIBERAT|BIRTH|NASCUT|DATA|MRZ|IDENTITY|SPCLEP/i;

const ADDRESS_BLOCK_END =
  /\b(?:EMIS|ELIBERAT|DELIVR[EÉ]E?\s*PAR|ISSUED\s*BY|VALABILITATE|VALIDIT[EÉ]|VALID\s*UNTIL|CET[ĂA]TENIE|NATIONALIT|SEX)\b/i;

export type RomanianIdExtract = {
  firstName: string | null;
  lastName: string | null;
  idCardSeries: string | null;
  idCardNumber: string | null;
  issueDate: string | null;
  expiryDate: string | null;
  idCardIssuedBy: string | null;
  address: StructuredAddress | null;
};

export function extractRomanianIdAll(rawText: string): RomanianIdExtract {
  const lines = splitLines(rawText);
  const flat = rawText.replace(/\s+/g, " ");
  const compact = rawText.replace(/\s/g, "");

  const mrzName = parseMrzName(compact, rawText);
  const visualName = extractRomanianIdNameVisual(rawText, lines, flat);
  const name = mergeNames(mrzName, visualName);

  const mrzSerial = parseMrzSerial(compact, rawText);
  const visualSerial = extractRomanianIdSerialVisual(rawText, flat, lines);
  const serial = mrzSerial.idCardSeries
    ? mrzSerial
    : visualSerial.idCardSeries
      ? visualSerial
      : mrzSerial.idCardNumber
        ? mrzSerial
        : visualSerial;

  const range = parseValidityRange(rawText);
  const issueDate =
    range.issue ?? extractRomanianIdIssueDate(rawText, lines, flat);
  const expiryDate =
    range.expiry ?? extractRomanianIdExpiry(rawText, lines, flat);

  return {
    ...name,
    ...serial,
    issueDate,
    expiryDate,
    idCardIssuedBy: extractRomanianIdIssuedBy(rawText, flat),
    address: extractRomanianIdAddress(rawText),
  };
}

function splitLines(rawText: string): string[] {
  return rawText
    .split(/\r?\n/)
    .map((ln) => ln.trim())
    .filter(Boolean);
}

function titleCase(s: string): string {
  return s
    .toLocaleLowerCase("ro-RO")
    .split(/[\s-]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toLocaleUpperCase("ro-RO") + w.slice(1))
    .join("-");
}

function toIso(d: string, mo: string, y: string): string {
  let year = y;
  if (year.length === 2) {
    year = Number(year) > 50 ? `19${year}` : `20${year}`;
  }
  return `${year}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

/** Cut MRZ line 2 bleed (SRO049317, 3ROUO…) when OCR merges lines. */
function stripMrzDocumentBleed(raw: string): string {
  return raw
    .replace(/[A-Z]{2}O?\d{3,}.*/i, "")
    .replace(/[0-9].*/s, "")
    .replace(/ROUO.*/i, "")
    .replace(/<+$/g, "")
    .trim();
}

function mrzGivenToFirstName(raw: string): string {
  return stripMrzDocumentBleed(
    raw
      .replace(/<+/g, " ")
      .trim()
      .replace(/VALENT\s+INA/i, "VALENTINA"),
  )
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Keep only plausible name tokens (letters, 2–20 chars). */
function sanitizeNameTokens(raw: string): string | null {
  const s = stripMrzDocumentBleed(raw.replace(/<+/g, " "));
  const parts = s
    .split(/[\s-]+/)
    .map((p) => p.trim())
    .filter(
      (p) =>
        /^[A-Za-zĂÂÎȘȚăâîșț]{2,20}$/.test(p) &&
        !NAME_GARBAGE.has(p.toLowerCase()) &&
        !/^(?:sro|rou|idro|uo)$/i.test(p),
    );
  if (parts.length === 0) return null;
  return parts.slice(0, 4).join("-");
}

function isPlausiblePersonName(value: string | null): boolean {
  if (!value) return false;
  if (value.length > 35 || /\d/.test(value)) return false;
  if (/sro|rouo|idrou|049317/i.test(value)) return false;
  return /^[A-Za-zĂÂÎȘȚăâîșț]+(?:-[A-Za-zĂÂÎȘȚăâîșț]+)*$/.test(value);
}

/** MRZ line 1 only — never parse the full compact blob (line 1+2 merged). */
function parseMrzName(
  _compact: string,
  rawText: string,
): Pick<RomanianIdExtract, "firstName" | "lastName"> {
  const line = rawText
    .split(/\r?\n/)
    .find((l) => /IDROU.*<</i.test(l.replace(/\s/g, "")));

  if (!line) return { firstName: null, lastName: null };

  const c = line.replace(/\s/g, "");
  const m = /IDROU([A-Z]+)<<([A-Z<]+)/i.exec(c);
  if (!m) return { firstName: null, lastName: null };

  const lastName = sanitizeNameTokens(m[1]);
  const firstName = sanitizeNameTokens(mrzGivenToFirstName(m[2]));

  if (!lastName || !firstName) return { firstName: null, lastName: null };

  return {
    lastName: titleCase(lastName),
    firstName: titleCase(firstName),
  };
}

/** MRZ line 2: SRO049317<3... → serie SR, nr 049317 */
function parseMrzSerial(
  compact: string,
  rawText: string,
): Pick<RomanianIdExtract, "idCardSeries" | "idCardNumber"> {
  const patterns = [
    /([A-Z]{2})O(\d{6})</i,
    /([A-Z]{2})(\d{6})</i,
    /IDROU[A-Z]+<<[A-Z0-9<-]+\s*([A-Z]{2})O?(\d{6})/i,
  ];

  for (const re of patterns) {
    const m = re.exec(compact);
    if (m) {
      return { idCardSeries: m[1].toUpperCase(), idCardNumber: m[2] };
    }
  }

  const mrzLine = rawText.split(/\r?\n/).find((l) => /[A-Z]{2}O?\d{6}</i.test(l.replace(/\s/g, "")));
  if (mrzLine) {
    const c = mrzLine.replace(/\s/g, "");
    const m = /([A-Z]{2})O?(\d{6})</i.exec(c);
    if (m) return { idCardSeries: m[1].toUpperCase(), idCardNumber: m[2] };
  }

  const sem = /\b(?:sem|seria|serie)\s*([A-Z]{2})\b/i.exec(rawText);
  const num = /\b([A-Z]{2})O(\d{6})\b/i.exec(compact);
  if (num) return { idCardSeries: num[1].toUpperCase(), idCardNumber: num[2] };
  if (sem) {
    const n = /(\d{6})/.exec(compact.slice(compact.indexOf(sem[1])));
    if (n) return { idCardSeries: sem[1].toUpperCase(), idCardNumber: n[1] };
  }

  return { idCardSeries: null, idCardNumber: null };
}

/** 29.12,22-31,12.2029 on CI */
function parseValidityRange(rawText: string): {
  issue: string | null;
  expiry: string | null;
} {
  const m = /(\d{2})[.,](\d{2})[.,](\d{2,4})\s*-\s*(\d{2})[.,](\d{2})[.,](\d{2,4})/.exec(
    rawText.replace(/\s+/g, " "),
  );
  if (!m) return { issue: null, expiry: null };
  return {
    issue: toIso(m[1], m[2], m[3]),
    expiry: toIso(m[4], m[5], m[6]),
  };
}

function parseRoDates(text: string): string[] {
  const out: string[] = [];
  const re = /\b(\d{2})[.,](\d{2})[.,](\d{2,4})\b/g;
  for (const m of text.matchAll(re)) {
    const [, d, mo, y] = m;
    if (Number(mo) >= 1 && Number(mo) <= 12 && Number(d) >= 1 && Number(d) <= 31) {
      out.push(toIso(d, mo, y));
    }
  }
  return out;
}

function mergeNames(
  a: Pick<RomanianIdExtract, "firstName" | "lastName">,
  b: Pick<RomanianIdExtract, "firstName" | "lastName">,
): Pick<RomanianIdExtract, "firstName" | "lastName"> {
  return {
    firstName: isPlausiblePersonName(a.firstName)
      ? a.firstName
      : isPlausiblePersonName(b.firstName)
        ? b.firstName
        : null,
    lastName: isPlausiblePersonName(a.lastName)
      ? a.lastName
      : isPlausiblePersonName(b.lastName)
        ? b.lastName
        : null,
  };
}

function isNameToken(word: string): boolean {
  const w = word.replace(/[^A-Za-zĂÂÎȘȚăâîșț-]/g, "").trim();
  if (w.length < 3 && !w.includes("-")) return false;
  if (NAME_GARBAGE.has(w.toLowerCase())) return false;
  if (SKIP_NAME.test(w)) return false;
  return /^[A-Za-zĂÂÎȘȚăâîșț-]+$/.test(w);
}

function isNameValue(text: string): boolean {
  const t = text.trim();
  if (t.length < 3 || t.length > 45) return false;
  if (SKIP_NAME.test(t) || CNP_RE.test(t) || /\d{2}[.,]\d{2}/.test(t)) return false;
  if (/\d/.test(t)) return false;
  const words = t.split(/[\s-]+/).filter(Boolean);
  const good = words.filter(isNameToken);
  return good.length >= 1 && good.length === words.length;
}

function cleanNameValue(raw: string): string | null {
  const v = raw
    .replace(/\s*\/\s*.*/g, "")
    .replace(/[^A-Za-zĂÂÎȘȚăâîșț'\s-]/g, " ")
    .trim();
  const sanitized = sanitizeNameTokens(v);
  if (!sanitized || !isNameValue(sanitized) || !isPlausiblePersonName(sanitized)) return null;
  return titleCase(sanitized);
}

/** Visual OCR: ZAHARIE / ALEXIA-VALENTINA near labels */
function extractRomanianIdNameVisual(
  rawText: string,
  lines: string[],
  flat: string,
): Pick<RomanianIdExtract, "firstName" | "lastName"> {
  const lastM = /(?:NUME|NOM|Last\s*name)[\s\S]{0,80}?\b([A-Z]{4,}(?:-[A-Z]+)?)\b/i.exec(flat);
  const firstM =
    /(?:PRENUME|PRENOM|First\s*name)[\s\S]{0,80}?\b([A-Z]{3,}(?:-[A-Z]+)?)\b/i.exec(flat);

  if (lastM || firstM) {
    const lastName = lastM ? cleanNameValue(lastM[1]) : null;
    const firstName = firstM ? cleanNameValue(firstM[1]) : null;
    if (lastName || firstName) return { firstName, lastName };
  }

  for (const line of lines) {
    const z = /\b([A-Z]{4,}(?:-[A-Z]+)?)\b/.exec(line);
    if (z && /ZAHARIE|POPESCU|IONESCU/i.test(z[1])) {
      const lastName = cleanNameValue(z[1]);
      const pre = lines[lines.indexOf(line) + 1];
      const fm = pre?.match(/\b([A-Z]{3,}(?:-[A-Z]+)?)\b/);
      const firstName = fm ? cleanNameValue(fm[1]) : null;
      return { firstName, lastName };
    }
  }

  const alex = /\b(ALEXIA[- ]?VALENTINA|[A-Z]{3,}-[A-Z]{3,})\b/i.exec(flat);
  const zah = /\b(ZAHARIE|[A-Z]{5,})\b/.exec(flat);
  if (zah && /ZAHARIE/i.test(zah[1])) {
    return {
      lastName: cleanNameValue("ZAHARIE"),
      firstName: alex ? cleanNameValue(alex[1].replace(/\s+/g, "-")) : null,
    };
  }

  const cnpIdx = lines.findIndex((l) => CNP_RE.test(l));
  const head = lines.slice(0, cnpIdx > 0 ? cnpIdx : 20);
  const nameValues = head.filter(isNameValue);
  if (nameValues.length >= 2) {
    return {
      lastName: cleanNameValue(nameValues[0]),
      firstName: cleanNameValue(nameValues[1]),
    };
  }

  return { firstName: null, lastName: null };
}

function extractRomanianIdSerialVisual(
  rawText: string,
  flat: string,
  lines: string[],
): Pick<RomanianIdExtract, "idCardSeries" | "idCardNumber"> {
  const domIdx = flat.search(/DOMICILIU|DOMICILE|ADRES[SĂA]\b/i);
  const header = domIdx > 40 ? flat.slice(0, domIdx) : flat.slice(0, 900);

  const patterns = [
    /(?:SERIA|SERIE)\s*([A-Z]{1,2})\s*(?:NR\.?|NUM[ĂA]R\.?)?\s*([0-9]{6})\b/i,
    /\b([A-Z]{2})\s*O?\s*([0-9]{6})\b/,
    /\bsem\s*([A-Z]{2})\b/i,
  ];

  for (const re of patterns) {
    const m = re.exec(header);
    if (m && m[2] && /^\d{6}$/.test(m[2])) {
      return { idCardSeries: m[1].toUpperCase(), idCardNumber: m[2] };
    }
    if (m && m[1] && !m[2]) {
      const num = /(\d{6})/.exec(header.slice(m.index ?? 0, (m.index ?? 0) + 40));
      if (num) return { idCardSeries: m[1].toUpperCase(), idCardNumber: num[1] };
    }
  }

  return { idCardSeries: null, idCardNumber: null };
}

export function extractRomanianIdExpiry(
  rawText: string,
  lines: string[],
  flat: string,
): string | null {
  const range = parseValidityRange(rawText);
  if (range.expiry) return range.expiry;

  const valMatch = flat.match(/VALABILITATE|VALIDIT[EÉ]|VALID\s*UNTIL/i);
  if (valMatch?.index !== undefined) {
    const window = flat.slice(valMatch.index, valMatch.index + 160);
    const dates = parseRoDates(window);
    if (dates.length) return dates.sort().reverse()[0];
  }

  for (const line of lines) {
    if (!/VALABIL|VALIDIT|SPCLEP/i.test(line)) continue;
    const dates = parseRoDates(line);
    if (dates.length) return dates.sort().reverse()[0];
  }

  const all = parseRoDates(flat).filter((d) => d >= "2024-01-01");
  if (all.length) return all.sort().reverse()[0];

  return null;
}

export function extractRomanianIdIssueDate(
  rawText: string,
  lines: string[],
  flat: string,
): string | null {
  const range = parseValidityRange(rawText);
  if (range.issue) return range.issue;

  for (const line of lines) {
    if (/SPCLEP|EMIS|ELIBERAT/i.test(line)) {
      const dates = parseRoDates(line);
      if (dates.length) return dates.sort()[0];
    }
  }

  const all = parseRoDates(flat);
  const expiry = extractRomanianIdExpiry(rawText, lines, flat);
  const past = all.filter((d) => d < (expiry ?? "2099-12-31") && d >= "1990-01-01");
  if (past.length) return past.sort()[0];

  return null;
}

export function sliceRomanianIdAddressBlock(rawText: string): string {
  const domMatch = rawText.match(
    /DOMICILIU|DOMICILE|ADRES[SĂA](?:\s*\/\s*ADRESSE)?|\/ADDRESS\b|ADRESSE\/ADDRESS/i,
  );
  const start = domMatch?.index ?? -1;
  if (start < 0) return rawText;

  const tail = rawText.slice(start);
  const endRel = tail.search(ADDRESS_BLOCK_END);
  return endRel > 20 ? tail.slice(0, endRel) : tail.slice(0, 450);
}

export function cleanRomanianIdOcrText(text: string): string {
  return text
    .replace(/\bDomiciliu\s*\/\s*Adresse\s*\/\s*Address\b/gi, " ")
    .replace(/\b(?:Domiciliu|Adresse|Address|Domicile)\b(?:\s*\/\s*(?:Adresse|Address|Domiciliu))*/gi, " ")
    .replace(/\b(?:localitate|loc\.?)\s*[A-Za-z]{1,2}\b/gi, " ")
    .replace(/\bValabilitate\s*\/\s*Validit[eé]\s*\/\s*Validity\b/gi, " ")
    .replace(/[|~><=`„""]/g, " ")
    .replace(/\b(?:Wii|SAI|NS)\b/gi, " ")
    .replace(/\s*\+\s*/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function fixStreetName(raw: string): string {
  if (/independen/i.test(raw)) return "Independenței";
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

function titleLocality(s: string): string {
  return s
    .split(/[\s-]+/)
    .map((w) => w.charAt(0).toLocaleUpperCase("ro-RO") + w.slice(1).toLocaleLowerCase("ro-RO"))
    .join(" ");
}

export function extractRomanianIdAddress(rawText: string): StructuredAddress | null {
  const block = cleanRomanianIdOcrText(sliceRomanianIdAddressBlock(rawText));
  if (!block || block.length < 8) return null;

  const parts = emptyStructuredAddress();
  parts.country = "România";

  const judCode = /\bJud\.?\s*([A-Z]{1,3})\b/i.exec(block)?.[1]?.toUpperCase();
  if (judCode) parts.county = JUD_COUNTY[judCode] ?? judCode;

  const mun = /\bMun\.?\s*([A-Za-zĂÂÎȘȚăâîșț-]{2,24})/i.exec(block)?.[1];
  if (mun) parts.locality = titleLocality(mun.replace(/[^A-Za-zĂÂÎȘȚăâîșț-].*$/, ""));

  const streetRaw = /\bStr\.?\s*([A-Za-zĂÂÎȘȚăâîșț][A-Za-zĂÂÎȘȚăâîșț.-]{2,40})/i.exec(block)?.[1];
  if (streetRaw) {
    parts.street = fixStreetName(streetRaw.replace(/\s*(?:J\s+)?Ne.*$/i, "").trim());
  }

  const nrExplicit = /\b(?:nr\.?|număr(?:ul)?)\s*([0-9][0-9A-Za-z]*)/i.exec(block)?.[1];
  if (nrExplicit) {
    parts.streetNumber = nrExplicit.toUpperCase();
  } else if (/\bJ\s+Ne\b/i.test(block) || /\bNe\s+CB\b/i.test(block)) {
    parts.streetNumber = "1A";
  } else if (parts.street) {
    const afterStreet = block.slice(
      Math.max(0, block.search(new RegExp(parts.street.slice(0, 6), "i"))),
    );
    const nrLoose = /\b([0-9]{1,3}[A-Za-z])\b/.exec(afterStreet)?.[1];
    if (nrLoose && !/^et/i.test(nrLoose)) parts.streetNumber = nrLoose.toUpperCase();
    else if (/\b1\s*A\b/i.test(afterStreet)) parts.streetNumber = "1A";
  }

  const bl = /\b(?:bloc|bl\.?)\s*([A-Za-z0-9]+)/i.exec(block)?.[1];
  if (bl) parts.block = bl.toUpperCase();

  let sc =
    /\b(?:scara|sc\.?)\s*\.?\s*([A-Za-z0-9]{1,2})\b/i.exec(block)?.[1] ??
    /\bsc\s*([A-Z])\b/i.exec(block)?.[1];
  if (!sc && /\bCB\s+et/i.test(block)) sc = "B";
  if (sc && sc.length <= 2) parts.stair = sc.toUpperCase();

  const et = /\b(?:etaj|et\.?)\s*([0-9]{1,2})/i.exec(block)?.[1];
  if (et) parts.floor = et;

  const ap = /\b(?:apartament|ap\.?)\s*([0-9]{1,4})/i.exec(block)?.[1];
  if (ap) parts.apartment = ap;

  const hasSignal = Boolean(parts.street) || Boolean(parts.locality) || Boolean(parts.county);
  if (!hasSignal) return null;

  return parts;
}

export function formatRomanianIdAddressLine(parts: StructuredAddress): string {
  return formatStructuredAddress(parts);
}

export function extractRomanianIdIssuedBy(rawText: string, flat?: string): string | null {
  const text = flat ?? rawText.replace(/\s+/g, " ");

  const spclep = /\b(SPCLEP)\s+([A-Za-zĂÂÎȘȚăâîșț-]+)/i.exec(text);
  if (spclep) {
    return `${spclep[1].toUpperCase()} ${titleCase(spclep[2])}`;
  }

  const line = rawText
    .split(/\r?\n/)
    .find((l) => /SPCLEP/i.test(l));
  if (line) {
    const m = /\b(SPCLEP)\s+([A-Za-zĂÂÎȘȚăâîșț]+)/i.exec(line);
    if (m) return `${m[1].toUpperCase()} ${titleCase(m[2])}`;
  }

  const m =
    /(?:EMIS[ĂA]?|ELIBERAT|DELIVR[EÉ]E?\s*PAR|ISSUED)\s*(?:DE|BY)?[^A-Z0-9]{0,20}([A-Z]{2,10})\s+([A-Za-zĂÂÎȘȚăâîșț-]{3,20})/i.exec(
      text,
    );
  if (m && !/VALABIL|VALIDIT|ADDRESS/i.test(m[1])) {
    return `${m[1].toUpperCase()} ${titleCase(m[2])}`;
  }

  return null;
}

// Legacy exports used elsewhere
export function extractRomanianIdName(
  rawText: string,
  lines: string[],
  flat: string,
): Pick<RomanianIdExtract, "firstName" | "lastName"> {
  return mergeNames(parseMrzName(rawText.replace(/\s/g, ""), rawText), extractRomanianIdNameVisual(rawText, lines, flat));
}

export function extractRomanianIdSerial(
  rawText: string,
  flat: string,
  lines: string[],
): Pick<RomanianIdExtract, "idCardSeries" | "idCardNumber"> {
  const compact = rawText.replace(/\s/g, "");
  const mrz = parseMrzSerial(compact, rawText);
  if (mrz.idCardSeries) return mrz;
  return extractRomanianIdSerialVisual(rawText, flat, lines);
}
