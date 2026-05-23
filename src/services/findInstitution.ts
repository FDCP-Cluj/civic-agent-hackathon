// Lightweight "find institution near me" helper.
//
// V2 used Google Places via the Lovable Gateway. We don't have a backend,
// so we build a Google Maps search URL the user can open in a new tab.
// If `VITE_GOOGLE_MAPS_API_KEY` is ever set, callers can switch to the
// Places-backed implementation — left as a TODO swap point.

export type InstitutionQuery = {
  institutionType: string;
  /** Optional city hint, typically derived from the local vault profile. */
  city?: string;
};

/** Build a Google Maps search URL for the requested institution. */
export function buildMapsSearchUrl({ institutionType, city }: InstitutionQuery): string {
  const query = city ? `${institutionType} ${city}` : institutionType;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

/**
 * Best-effort "localitate" extraction from the free-form vault address.
 * The vault stores addresses as a single string; we split on commas and
 * pick the last meaningful chunk. This matches V3's existing approach in
 * `routes/index.tsx`.
 */
export function localityFromAddress(address: string | undefined | null): string | undefined {
  if (!address) return undefined;
  const chunks = address
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return chunks[chunks.length - 1];
}
