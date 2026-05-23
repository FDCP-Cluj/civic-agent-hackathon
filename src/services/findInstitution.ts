export type InstitutionQuery = {
  institutionType: string;
  city?: string;
  lat?: number;
  lng?: number;
};

export function buildMapsSearchUrl({ institutionType, city }: InstitutionQuery): string {
  const normalizedCity = normalizeCity(city);
  const query = normalizedCity
    ? `${institutionType} ${normalizedCity}`
    : `${institutionType} Romania`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

export type InstitutionLookupResult = {
  placeId: string | null;
  name: string;
  address: string;
  phone: string | null;
  rating: number | null;
  mapsUrl: string;
  openNow: boolean | null;
};

export type InstitutionLookupResponse = {
  source: "google_maps" | "fallback_search";
  query: string;
  results: InstitutionLookupResult[];
};

type GoogleMapsPlace = {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  internationalPhoneNumber?: string;
  rating?: number;
  googleMapsUri?: string;
  currentOpeningHours?: { openNow?: boolean };
};

function normalizeCity(city: string | undefined): string | undefined {
  const normalized = city?.trim();
  return normalized ? normalized : undefined;
}

function buildQuery({ institutionType, city, lat, lng }: InstitutionQuery): string {
  const hasCoords = typeof lat === "number" && typeof lng === "number";
  const normalizedCity = normalizeCity(city);
  if (hasCoords) return `${institutionType} lângă mine`;
  if (normalizedCity) return `${institutionType} ${normalizedCity}`;
  return `${institutionType} Romania`;
}

async function lookupWithConnector(
  query: string,
  { lat, lng }: InstitutionQuery,
): Promise<InstitutionLookupResult[] | null> {
  const payload: Record<string, unknown> = {
    textQuery: query,
    languageCode: "ro",
    regionCode: "RO",
  };

  if (typeof lat === "number" && typeof lng === "number") {
    payload.locationBias = {
      circle: {
        center: { latitude: lat, longitude: lng },
        radius: 20000,
      },
    };
  }

  const res = await fetch("/api/maps/places-search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (res.status === 501) {
    return null;
  }

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Places API failed (${res.status}): ${body}`);
  }

  const json = (await res.json()) as { places?: GoogleMapsPlace[] };
  const places = (json.places ?? []).slice(0, 6);

  return places.map((place) => ({
    placeId: place.id ?? null,
    name: place.displayName?.text ?? "Instituție",
    address: place.formattedAddress ?? "",
    phone: place.internationalPhoneNumber ?? null,
    rating: place.rating ?? null,
    mapsUrl:
      place.googleMapsUri ??
      `https://www.google.com/maps/search/?api=1&query_place_id=${encodeURIComponent(place.id ?? "")}`,
    openNow: place.currentOpeningHours?.openNow ?? null,
  }));
}

export async function findInstitution(
  queryParams: InstitutionQuery,
): Promise<InstitutionLookupResponse> {
  const query = buildQuery(queryParams);
  const fallbackUrl = buildMapsSearchUrl(queryParams);

  try {
    const places = await lookupWithConnector(query, queryParams);
    if (places && places.length > 0) {
      return { source: "google_maps", query, results: places };
    }
  } catch (error) {
    console.warn("[maps] connector lookup failed, falling back to URL search", error);
  }

  return {
    source: "fallback_search",
    query,
    results: [
      {
        placeId: null,
        name: `Caută "${query}" pe Google Maps`,
        address: queryParams.city ?? "",
        phone: null,
        rating: null,
        mapsUrl: fallbackUrl,
        openNow: null,
      },
    ],
  };
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
