import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;
const GOOGLE_PLACES_SEARCH_URL = "https://places.googleapis.com/v1/places:searchText";
const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta";

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m as { default?: ServerEntry }).default ?? (m as unknown as ServerEntry),
    );
  }
  return serverEntryPromise;
}

function brandedErrorResponse(): Response {
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function jsonResponse(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function readMapsCredentials(): { mapsKey?: string } {
  const mapsKey =
    process.env.VITE_GOOGLE_MAPS_API_KEY ||
    process.env.VITE_LOVABLE_CONNECTOR_GOOGLE_MAPS_BROWSER_KEY;
  return { mapsKey };
}

type CaenRpcRow = {
  code: string;
  title: string;
  description: string | null;
  similarity: number;
};

type CaenChoice = {
  code: string;
  reason?: string;
};

function readCaenCredentials(): {
  geminiKey?: string;
  supabaseUrl?: string;
  supabaseKey?: string;
} {
  const geminiKey = process.env.VITE_GEMINI_API_KEY;
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey =
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY;
  return { geminiKey, supabaseUrl, supabaseKey };
}

async function fetchGeminiEmbedding(text: string, apiKey: string): Promise<number[]> {
  const models = [
    { name: "text-embedding-004", body: { content: { parts: [{ text }] }, outputDimensionality: 1536 } },
    { name: "gemini-embedding-001", body: { content: { parts: [{ text }] }, outputDimensionality: 1536 } },
    { name: "embedding-001", body: { content: { parts: [{ text }] } } },
  ] as const;

  const failures: string[] = [];
  for (const attempt of models) {
    const res = await fetch(
      `${GEMINI_API_BASE}/models/${attempt.name}:embedContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(attempt.body),
      },
    );
    if (!res.ok) {
      failures.push(`${attempt.name} -> ${res.status}`);
      continue;
    }
    const json = (await res.json()) as {
      embedding?: { values?: number[] };
    };
    const vector = json.embedding?.values;
    if (Array.isArray(vector) && vector.length > 0) {
      return vector;
    }
    failures.push(`${attempt.name} -> missing embedding values`);
  }

  throw new Error(
    `Gemini embedding failed for all known models (${failures.join(", ")}). Check API key/model access.`,
  );
}

function extractJsonObject(raw: string): string | null {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end < 0 || end <= start) return null;
  return raw.slice(start, end + 1);
}

async function rankCaenCandidatesWithGemini(
  description: string,
  candidates: CaenRpcRow[],
  apiKey: string,
): Promise<CaenChoice[]> {
  const prompt = `Alege cele mai potrivite coduri CAEN pentru activitatea descrisă.

Activitate:
${description}

Candidați (alege STRICT din listă):
${JSON.stringify(
  candidates.map((c) => ({
    code: c.code,
    title: c.title,
    description: c.description ?? "",
    similarity: c.similarity,
  })),
  null,
  2,
)}

Răspunde STRICT JSON:
{
  "choices": [
    { "code": "6201", "reason": "motiv scurt in romana" }
  ]
}

Reguli:
- max 5 choices
- doar coduri din listă
- ordonate de la cel mai potrivit`;

  const res = await fetch(
    `${GEMINI_API_BASE}/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: "application/json",
        },
      }),
    },
  );
  if (!res.ok) {
    throw new Error(`Gemini ranking failed (${res.status}): ${await res.text()}`);
  }
  const json = (await res.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const rawText = json.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("\n") ?? "";
  const jsonText = extractJsonObject(rawText) ?? rawText;
  const parsed = JSON.parse(jsonText) as { choices?: CaenChoice[] };
  return (parsed.choices ?? [])
    .filter((c) => typeof c.code === "string" && c.code.trim().length > 0)
    .slice(0, 5);
}

async function fetchCaenCandidatesFromSupabase(
  queryEmbedding: number[],
  supabaseUrl: string,
  supabaseKey: string,
): Promise<CaenRpcRow[]> {
  const rpcUrl = new URL("/rest/v1/rpc/match_caen", supabaseUrl).toString();
  const res = await fetch(rpcUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
    },
    body: JSON.stringify({
      query_embedding: queryEmbedding,
      match_count: 10,
    }),
  });
  if (!res.ok) {
    throw new Error(`Supabase match_caen failed (${res.status}): ${await res.text()}`);
  }
  const rows = (await res.json()) as CaenRpcRow[];
  return Array.isArray(rows) ? rows : [];
}

async function handleCaenSuggest(request: Request): Promise<Response> {
  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return jsonResponse({ error: "Invalid payload" }, 400);
  }
  const description = String((payload as Record<string, unknown>).description ?? "").trim();
  if (description.length < 3) {
    return jsonResponse({ error: "description must be at least 3 characters" }, 400);
  }

  const { geminiKey, supabaseUrl, supabaseKey } = readCaenCredentials();
  if (!geminiKey) {
    return jsonResponse({ error: "VITE_GEMINI_API_KEY is required for CAEN AI suggestions" }, 501);
  }
  if (!supabaseUrl || !supabaseKey) {
    return jsonResponse(
      { error: "Supabase config missing (VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY/PUBLISHABLE_KEY)" },
      501,
    );
  }

  try {
    const embedding = await fetchGeminiEmbedding(description, geminiKey);
    const candidates = await fetchCaenCandidatesFromSupabase(embedding, supabaseUrl, supabaseKey);
    if (candidates.length === 0) {
      return jsonResponse({ error: "No CAEN candidates found from vector search." }, 404);
    }

    const rankedChoices = await rankCaenCandidatesWithGemini(description, candidates, geminiKey);
    const byCode = new Map(candidates.map((c) => [c.code, c]));
    const selected = rankedChoices
      .map((choice) => {
        const base = byCode.get(choice.code);
        if (!base) return null;
        return {
          code: base.code,
          title: base.title,
          keywords: [] as string[],
          score: Number(base.similarity) || 0,
          evidence: choice.reason?.trim() || base.description || undefined,
        };
      })
      .filter((m): m is NonNullable<typeof m> => Boolean(m));

    const matches =
      selected.length > 0
        ? selected
        : candidates.slice(0, 5).map((c) => ({
            code: c.code,
            title: c.title,
            keywords: [] as string[],
            score: Number(c.similarity) || 0,
            evidence: c.description || undefined,
          }));

    return jsonResponse({
      source: "supabase_vector_ai",
      matches,
      citations: [],
      degraded: false,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "CAEN suggestion pipeline failed.";
    return jsonResponse({ error: message }, 500);
  }
}

async function handleMapsPlacesSearch(request: Request): Promise<Response> {
  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const { mapsKey } = readMapsCredentials();
  if (!mapsKey) {
    return jsonResponse({ error: "Google Maps API key is not configured" }, 501);
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return jsonResponse({ error: "Invalid payload" }, 400);
  }

  const fields = payload as Record<string, unknown>;
  if (typeof fields.textQuery !== "string" || fields.textQuery.trim().length < 2) {
    return jsonResponse({ error: "textQuery is required" }, 400);
  }

  const upstreamHeaders: Record<string, string> = {
    "X-Goog-Api-Key": mapsKey,
    "Content-Type": "application/json",
    "X-Goog-FieldMask":
      "places.id,places.displayName,places.formattedAddress,places.internationalPhoneNumber,places.rating,places.googleMapsUri,places.currentOpeningHours",
  };
  const origin = request.headers.get("origin");
  if (origin) {
    upstreamHeaders.Referer = origin.endsWith("/") ? origin : `${origin}/`;
  }

  const googleRes = await fetch(GOOGLE_PLACES_SEARCH_URL, {
    method: "POST",
    headers: upstreamHeaders,
    body: JSON.stringify(payload),
  });

  return new Response(await googleRes.text(), {
    status: googleRes.status,
    headers: {
      "content-type": googleRes.headers.get("content-type") ?? "application/json; charset=utf-8",
    },
  });
}

function isCatastrophicSsrErrorBody(body: string, responseStatus: number): boolean {
  let payload: unknown;
  try {
    payload = JSON.parse(body);
  } catch {
    return false;
  }

  if (!payload || Array.isArray(payload) || typeof payload !== "object") {
    return false;
  }

  const fields = payload as Record<string, unknown>;
  const expectedKeys = new Set(["message", "status", "unhandled"]);
  if (!Object.keys(fields).every((key) => expectedKeys.has(key))) {
    return false;
  }

  return (
    fields.unhandled === true &&
    fields.message === "HTTPError" &&
    (fields.status === undefined || fields.status === responseStatus)
  );
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isCatastrophicSsrErrorBody(body, response.status)) {
    return response;
  }

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return brandedErrorResponse();
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      const url = new URL(request.url);
      if (url.pathname === "/api/maps/places-search") {
        return await handleMapsPlacesSearch(request);
      }
      if (url.pathname === "/api/caen/suggest") {
        return await handleCaenSuggest(request);
      }

      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);
      return brandedErrorResponse();
    }
  },
};
