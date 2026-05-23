const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY) as string | undefined;
const SUPABASE_SESSION_STORAGE_KEY = "civis-supabase-session";

export function isSupabaseConfigured(): boolean {
  return Boolean(SUPABASE_URL?.trim() && SUPABASE_ANON_KEY?.trim());
}

type SupabaseSelectArgs = {
  table: string;
  select: string;
  or?: string;
  in?: Record<string, string[]>;
  limit?: number;
};

export async function supabaseSelect<T>({
  table,
  select,
  or,
  in: inFilters,
  limit,
}: SupabaseSelectArgs): Promise<{ data: T[]; error: string | null }> {
  if (!isSupabaseConfigured()) {
    return { data: [], error: "Supabase is not configured." };
  }

  const url = new URL(`/rest/v1/${table}`, SUPABASE_URL);
  url.searchParams.set("select", select);
  if (or) url.searchParams.set("or", `(${or})`);
  if (typeof limit === "number") url.searchParams.set("limit", String(limit));
  if (inFilters) {
    for (const [column, values] of Object.entries(inFilters)) {
      if (!values.length) continue;
      url.searchParams.set(column, `in.(${values.map((v) => `"${v}"`).join(",")})`);
    }
  }

  const res = await fetch(url.toString(), {
    headers: {
      apikey: SUPABASE_ANON_KEY!,
      Authorization: `Bearer ${readAccessTokenFromStorage() ?? SUPABASE_ANON_KEY!}`,
    },
  });

  if (!res.ok) {
    return { data: [], error: `Supabase error ${res.status}` };
  }

  const json = (await res.json()) as T[];
  return { data: json ?? [], error: null };
}

function readAccessTokenFromStorage(): string | null {
  try {
    const raw = localStorage.getItem(SUPABASE_SESSION_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { access_token?: string };
    return parsed.access_token ?? null;
  } catch {
    return null;
  }
}
