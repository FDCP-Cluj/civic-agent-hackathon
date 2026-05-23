export type StructuredAddress = {
  street: string;
  streetNumber: string;
  block: string;
  stair: string;
  floor: string;
  apartment: string;
  locality: string;
  county: string;
  sector: string;
  country: string;
};

export const emptyStructuredAddress = (): StructuredAddress => ({
  street: "",
  streetNumber: "",
  block: "",
  stair: "",
  floor: "",
  apartment: "",
  locality: "",
  county: "",
  sector: "",
  country: "România",
});

/** Build a single-line address for legacy display / fallbacks. */
export function formatStructuredAddress(parts: StructuredAddress): string {
  const chunks: string[] = [];
  if (parts.street.trim()) {
    let line = parts.street.trim();
    if (parts.streetNumber.trim()) line += ` nr. ${parts.streetNumber.trim()}`;
    chunks.push(line);
  }
  const unit: string[] = [];
  if (parts.block.trim()) unit.push(`bl. ${parts.block.trim()}`);
  if (parts.stair.trim()) unit.push(`sc. ${parts.stair.trim()}`);
  if (parts.floor.trim()) unit.push(`et. ${parts.floor.trim()}`);
  if (parts.apartment.trim()) unit.push(`ap. ${parts.apartment.trim()}`);
  if (unit.length) chunks.push(unit.join(", "));

  const loc: string[] = [];
  if (parts.sector.trim()) loc.push(`Sector ${parts.sector.trim()}`);
  else if (parts.county.trim()) loc.push(parts.county.trim());
  if (parts.locality.trim()) loc.push(parts.locality.trim());
  if (loc.length) chunks.push(loc.join(", "));

  if (parts.country.trim() && parts.country.trim() !== "România") {
    chunks.push(parts.country.trim());
  }

  return chunks.join(", ");
}

/**
 * Best-effort parse of Romanian domicile strings (CI OCR, eID, manual).
 * Example: "Calea Victoriei nr. 25, ap. 14, Sector 3, București"
 */
export function parseRomanianAddress(raw: string): StructuredAddress {
  const parts = emptyStructuredAddress();
  const text = raw.trim();
  if (!text) return parts;

  let rest = text
    .replace(/^(DOMICILIU|ADRESA|ADDRESS)\s*:?\s*/i, "")
    .replace(/\s+/g, " ")
    .trim();

  const countryMatch = /,\s*(România|Romania)\s*$/i.exec(rest);
  if (countryMatch) {
    parts.country = "România";
    rest = rest.slice(0, countryMatch.index).trim();
  }

  const segments = rest
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const last = segments[segments.length - 1] ?? "";
  const sectorInLast = /^(?:sector(?:ul)?)\s*(\d+)/i.exec(last);
  const judetInLast = /^(?:jud\.?|jude[tț]ul?)\s*(.+)$/i.exec(last);

  if (segments.length >= 2) {
    const locSeg = segments[segments.length - 1];
    const beforeLoc = segments[segments.length - 2];

    if (/^sector\s*\d+/i.test(locSeg) || /^\d+$/.test(locSeg)) {
      parts.sector = locSeg.replace(/^sector\s*/i, "").trim();
      parts.locality = beforeLoc;
      segments.splice(-2, 2);
    } else if (judetInLast) {
      parts.county = judetInLast[1].trim();
      parts.locality = segments[segments.length - 2] ?? "";
      segments.splice(-2, 2);
    } else {
      parts.locality = locSeg;
      if (/sector/i.test(beforeLoc)) {
        parts.sector = beforeLoc.replace(/^sector\s*/i, "").trim();
        segments.splice(-2, 2);
      } else if (/^jud\.?/i.test(beforeLoc) || /jude[tț]/i.test(beforeLoc)) {
        parts.county = beforeLoc.replace(/^(?:jud\.?|jude[tț]ul?)\s*/i, "").trim();
        segments.splice(-2, 2);
      } else {
        segments.pop();
      }
    }
  } else if (sectorInLast) {
    parts.sector = sectorInLast[1];
    const city = rest.replace(/,?\s*sector(?:ul)?\s*\d+/i, "").trim();
    parts.locality = city;
    segments.length = 0;
  } else if (segments.length === 1) {
    parts.locality = segments[0];
    segments.length = 0;
  }

  const joined = segments.join(", ");
  const nrMatch =
    /^(.*?)(?:,\s*)?(?:nr\.?|număr(?:ul)?)\s*([0-9A-Za-z]+)(.*)$/i.exec(joined) ||
    /^(.*?)\s+nr\.?\s*([0-9A-Za-z]+)(.*)$/i.exec(joined);

  if (nrMatch) {
    parts.street = nrMatch[1].replace(/,\s*$/, "").trim();
    parts.streetNumber = nrMatch[2].trim();
    rest = nrMatch[3];
  } else if (segments[0]) {
    parts.street = segments[0];
  }

  const tail = [rest, segments.slice(1).join(", ")].filter(Boolean).join(", ");
  const bl = /\b(?:bloc|bl\.?)\s*([A-Za-z0-9]+)/i.exec(tail);
  if (bl) parts.block = bl[1];
  const sc = /\b(?:scara|sc\.?)\s*([A-Za-z0-9]+)/i.exec(tail);
  if (sc) parts.stair = sc[1];
  const et = /\b(?:etaj|et\.?)\s*([A-Za-z0-9]+)/i.exec(tail);
  if (et) parts.floor = et[1];
  const ap = /\b(?:apartament|ap\.?)\s*([A-Za-z0-9]+)/i.exec(tail);
  if (ap) parts.apartment = ap[1];

  if (!parts.locality && parts.sector && /București/i.test(text)) {
    parts.locality = "București";
  }

  return parts;
}

export function mergeAddressParts(
  current: StructuredAddress,
  patch: Partial<StructuredAddress>,
): StructuredAddress {
  const next = { ...current, ...patch };
  for (const key of Object.keys(patch) as (keyof StructuredAddress)[]) {
    const v = patch[key];
    if (typeof v === "string" && v.trim()) next[key] = v.trim();
  }
  return next;
}
