const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY) as string | undefined;

export const SUPABASE_SESSION_STORAGE_KEY = "civis-supabase-session";

export type SupabaseSession = {
  access_token: string;
  refresh_token: string;
  expires_at?: number;
  token_type?: string;
};

export function isSupabaseAuthConfigured(): boolean {
  return Boolean(SUPABASE_URL?.trim() && SUPABASE_ANON_KEY?.trim());
}

type ApiResult<T> = { data: T | null; error: string | null };

async function callSupabaseAuth<T>(path: string, payload: unknown): Promise<ApiResult<T>> {
  if (!isSupabaseAuthConfigured()) {
    return { data: null, error: "Supabase auth is not configured." };
  }

  const res = await fetch(`${SUPABASE_URL}/auth/v1/${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_ANON_KEY!,
      Authorization: `Bearer ${SUPABASE_ANON_KEY!}`,
    },
    body: JSON.stringify(payload),
  });

  const json = (await res.json().catch(() => null)) as { error_description?: string } & T;
  if (!res.ok) {
    return { data: null, error: json?.error_description ?? `Supabase auth error ${res.status}` };
  }
  return { data: json, error: null };
}

export async function sendOtpToEmail(email: string): Promise<ApiResult<{ sent: true }>> {
  const { error } = await callSupabaseAuth("otp", {
    email,
    create_user: true,
  });
  if (error) return { data: null, error };
  return { data: { sent: true }, error: null };
}

export async function verifyEmailOtp(
  email: string,
  token: string,
): Promise<ApiResult<SupabaseSession>> {
  const { data, error } = await callSupabaseAuth<SupabaseSession>("verify", {
    email,
    token,
    type: "email",
  });
  if (error || !data?.access_token || !data?.refresh_token) {
    return { data: null, error: error ?? "Invalid OTP session response." };
  }
  return { data, error: null };
}

export function persistSupabaseSession(session: SupabaseSession | null): void {
  try {
    if (!session) {
      localStorage.removeItem(SUPABASE_SESSION_STORAGE_KEY);
      return;
    }
    localStorage.setItem(SUPABASE_SESSION_STORAGE_KEY, JSON.stringify(session));
  } catch {
    // Ignore storage issues in privacy modes.
  }
}

export function readStoredSupabaseSession(): SupabaseSession | null {
  try {
    const raw = localStorage.getItem(SUPABASE_SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as SupabaseSession;
    if (!parsed?.access_token || !parsed?.refresh_token) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function isAccessTokenFresh(accessToken: string): boolean {
  try {
    const payload = JSON.parse(atob(accessToken.split(".")[1])) as { exp?: number };
    if (!payload.exp) return false;
    const now = Math.floor(Date.now() / 1000);
    return payload.exp > now + 30;
  } catch {
    return false;
  }
}
