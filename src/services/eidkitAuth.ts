// EidKit SSO — OIDC login with Romanian electronic ID (CEI / NFC card).
// Docs: https://eidkit.ro/docs/sso/integration
// IdP:  https://idp.eidkit.ro

import type { VaultProfile } from "@/store/vault";

const ISSUER = "https://idp.eidkit.ro";
const STORAGE_STATE = "civis-eidkit-oauth-state";
const STORAGE_NONCE = "civis-eidkit-oauth-nonce";

export type EidKitJwtPayload = {
  sub?: string;
  name?: string;
  given_name?: string;
  family_name?: string;
  birthdate?: string;
  address?: { formatted?: string };
  "cei:cnp"?: string;
  nonce?: string;
};

export function isEidKitConfigured(): boolean {
  return Boolean(
    import.meta.env.VITE_EIDKIT_CLIENT_ID?.trim() &&
    import.meta.env.VITE_EIDKIT_CLIENT_SECRET?.trim(),
  );
}

export function getEidKitRedirectUri(): string {
  if (typeof window === "undefined") return "";
  return `${window.location.origin}/auth/eidkit/callback`;
}

export function startEidKitLogin(): void {
  const clientId = import.meta.env.VITE_EIDKIT_CLIENT_ID?.trim();
  if (!clientId) {
    throw new Error("Lipsește VITE_EIDKIT_CLIENT_ID în .env");
  }

  const state = crypto.randomUUID();
  const nonce = crypto.randomUUID();
  sessionStorage.setItem(STORAGE_STATE, state);
  sessionStorage.setItem(STORAGE_NONCE, nonce);

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: getEidKitRedirectUri(),
    response_type: "code",
    scope: "openid profile address cei:cnp",
    state,
    nonce,
  });

  window.location.href = `${ISSUER}/authorize?${params.toString()}`;
}

type TokenResponse = {
  id_token?: string;
  access_token?: string;
};

/** Exchange authorization code for tokens. Requires client secret (dev .env only). */
export async function exchangeEidKitCode(code: string): Promise<string> {
  const clientId = import.meta.env.VITE_EIDKIT_CLIENT_ID?.trim();
  const clientSecret = import.meta.env.VITE_EIDKIT_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    throw new Error("Credențiale EidKit incomplete (client id + secret).");
  }

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: getEidKitRedirectUri(),
    client_id: clientId,
    client_secret: clientSecret,
  });

  const res = await fetch(`${ISSUER}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      text ||
        `Schimbul de token EidKit a eșuat (${res.status}). Verifică redirect URI în dashboard.eidkit.ro.`,
    );
  }

  const data = (await res.json()) as TokenResponse;
  if (!data.id_token) throw new Error("Răspuns EidKit fără id_token.");
  return data.id_token;
}

export function parseEidKitIdToken(idToken: string): EidKitJwtPayload {
  const parts = idToken.split(".");
  if (parts.length < 2) throw new Error("ID token invalid.");
  const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
  const padded = payload + "=".repeat((4 - (payload.length % 4)) % 4);
  return JSON.parse(atob(padded)) as EidKitJwtPayload;
}

export function validateEidKitCallback(state: string | null, payload: EidKitJwtPayload): void {
  const expectedState = sessionStorage.getItem(STORAGE_STATE);
  const expectedNonce = sessionStorage.getItem(STORAGE_NONCE);
  sessionStorage.removeItem(STORAGE_STATE);
  sessionStorage.removeItem(STORAGE_NONCE);

  if (!state || !expectedState || state !== expectedState) {
    throw new Error("State OAuth invalid — reîncearcă autentificarea.");
  }
  if (!expectedNonce || payload.nonce !== expectedNonce) {
    throw new Error("Nonce invalid — posibil replay. Reîncearcă.");
  }
}

export function profileFromEidKitClaims(payload: EidKitJwtPayload): Partial<VaultProfile> {
  const fullName =
    payload.name?.trim() ||
    [payload.given_name, payload.family_name].filter(Boolean).join(" ").trim();

  return {
    fullName: fullName || "",
    birthDate: payload.birthdate ?? "",
    address: payload.address?.formatted ?? "",
    cnp: payload["cei:cnp"] ?? "",
  };
}

export function emailFromEidKitSub(sub: string): string {
  return `cei-${sub.slice(0, 12)}@eidkit.civis.local`;
}

const DEMO_EIDKIT_SUB = "civis-demo-cei-hackathon";

/** Simulates a successful CEI read when EidKit credentials are not in .env. */
export function runDemoEidKitLogin(): { sub: string; email: string } {
  return { sub: DEMO_EIDKIT_SUB, email: emailFromEidKitSub(DEMO_EIDKIT_SUB) };
}
