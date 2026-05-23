// Real Romanian government API — ANAF VAT registry / "Persoane impozabile".
//
// Endpoint:
//   POST https://webservicesp.anaf.ro/PlatitorTvaRest/api/v9/ws/tva
//   Content-Type: application/json
//   Body: [{ "cui": <number>, "data": "YYYY-MM-DD" }]
//
// The service is publicly documented at
// https://webservicesp.anaf.ro/ and is used by every Romanian fintech and
// accounting product. Returns full company registration data: name, address,
// VAT status, CAEN code, registration date, etc. No API key required.
//
// CORS: the endpoint sends `Access-Control-Allow-Origin: *` so this fetch
// works directly from the browser. If a network policy ever blocks it, we
// fall back to the public corsproxy.io relay (best-effort, no key, free).

const ANAF_TVA_URL = "https://webservicesp.anaf.ro/PlatitorTvaRest/api/v9/ws/tva";
const CORS_FALLBACK = "https://corsproxy.io/?";

export type AnafCompany = {
  cui: string;
  denumire: string;
  adresa: string;
  judet: string | null;
  telefon: string | null;
  cod_inregistrare_fiscala: string;
  data_inregistrare: string | null;
  status_tva: "platitor_tva" | "neplatitor_tva" | "necunoscut";
  raw: Record<string, unknown>;
};

export type AnafLookupResult =
  | { ok: true; company: AnafCompany }
  | {
      ok: false;
      reason: "not_found" | "invalid_cui" | "network" | "rate_limited";
      message: string;
    };

function normalizeCui(input: string): number | null {
  // Accept "12345678", "RO12345678", " 12345678 ", with or without leading zeros.
  const stripped = input.trim().replace(/^RO/i, "").replace(/\D/g, "");
  if (!stripped) return null;
  const n = Number(stripped);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

type AnafResponse = {
  cod: number;
  message?: string;
  found?: Array<Record<string, unknown>>;
  notFound?: number[];
};

async function postAnaf(url: string, payload: unknown): Promise<AnafResponse> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (res.status === 429) throw new Error("rate_limited");
  if (!res.ok) throw new Error(`anaf_http_${res.status}`);
  return (await res.json()) as AnafResponse;
}

export async function lookupCompanyByCui(cui: string): Promise<AnafLookupResult> {
  const numeric = normalizeCui(cui);
  if (numeric === null) {
    return {
      ok: false,
      reason: "invalid_cui",
      message: "Codul CUI conține caractere invalide. Folosește doar cifre, opțional cu prefix RO.",
    };
  }
  const payload = [{ cui: numeric, data: todayIso() }];

  let json: AnafResponse;
  try {
    json = await postAnaf(ANAF_TVA_URL, payload);
  } catch (err) {
    if (err instanceof Error && err.message === "rate_limited") {
      return {
        ok: false,
        reason: "rate_limited",
        message: "ANAF a limitat temporar interogările. Încearcă din nou peste un minut.",
      };
    }
    // CORS / network failure — retry via the public proxy.
    try {
      json = await postAnaf(`${CORS_FALLBACK}${encodeURIComponent(ANAF_TVA_URL)}`, payload);
    } catch {
      return {
        ok: false,
        reason: "network",
        message: "Nu am putut contacta ANAF. Verifică conexiunea sau încearcă mai târziu.",
      };
    }
  }

  if (json.cod !== 200) {
    return {
      ok: false,
      reason: "network",
      message: json.message ?? "Răspuns neașteptat de la ANAF.",
    };
  }

  const found = json.found?.[0];
  if (!found) {
    return {
      ok: false,
      reason: "not_found",
      message: "ANAF nu are nicio înregistrare pentru acest CUI. Verifică cifrele.",
    };
  }

  return { ok: true, company: extractCompany(numeric, found) };
}

function extractCompany(cui: number, raw: Record<string, unknown>): AnafCompany {
  // ANAF nests payload under "date_generale" + "inregistrare_scop_Tva".
  const dg = (raw.date_generale ?? {}) as Record<string, unknown>;
  const tva = (raw.inregistrare_scop_Tva ?? {}) as Record<string, unknown>;
  return {
    cui: String(cui),
    denumire: String(dg.denumire ?? raw.denumire ?? ""),
    adresa: String(dg.adresa ?? raw.adresa ?? ""),
    judet: typeof dg.judet === "string" ? (dg.judet as string) : null,
    telefon: typeof dg.telefon === "string" ? (dg.telefon as string) : null,
    cod_inregistrare_fiscala: String(dg.cod_inregistrare_fiscala ?? dg.cui ?? cui),
    data_inregistrare:
      typeof dg.data_inregistrare === "string" ? (dg.data_inregistrare as string) : null,
    status_tva:
      tva.scpTVA === true ? "platitor_tva" : tva.scpTVA === false ? "neplatitor_tva" : "necunoscut",
    raw,
  };
}
