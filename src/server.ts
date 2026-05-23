import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;
const GOOGLE_PLACES_SEARCH_URL = "https://places.googleapis.com/v1/places:searchText";

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

      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);
      return brandedErrorResponse();
    }
  },
};
