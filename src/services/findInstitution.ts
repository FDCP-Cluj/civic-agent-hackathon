export type InstitutionQuery = {
  institutionType: string;
  city?: string;
  lat?: number;
  lng?: number;
};

export function buildMapsSearchUrl({ institutionType, city }: InstitutionQuery): string {
  const query = city ? `${institutionType} ${city}` : institutionType;
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

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;
const LOVABLE_API_KEY = import.meta.env.VITE_LOVABLE_API_KEY as string | undefined;

function buildQuery({ institutionType, city, lat, lng }: InstitutionQuery): string {
  const hasCoords = typeof lat === "number" && typeof lng === "number";
  if (hasCoords && !city) return `${institutionType} lângă mine`;
  return `${institutionType}${city ? ` ${city}` : ""}`;
}

async function lookupWithConnector(
  query: string,
  { lat, lng }: InstitutionQuery,
): Promise<InstitutionLookupResult[] | null> {
  if (!GOOGLE_MAPS_API_KEY || !LOVABLE_API_KEY) return null;

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

  const res = await fetch(
    "https://connector-gateway.lovable.dev/google_maps/places/v1/places:searchText",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": GOOGLE_MAPS_API_KEY,
        "Content-Type": "application/json",
        "X-Goog-FieldMask":
          "places.id,places.displayName,places.formattedAddress,places.internationalPhoneNumber,places.rating,places.googleMapsUri,places.currentOpeningHours",
      },
      body: JSON.stringify(payload),
    },
  );

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
  const fallbackUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;

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
