import type { CaenMatch } from "@/services/caen";
import { isSupabaseConfigured, supabaseSelect } from "@/services/supabaseClient";

type KnowledgeRow = {
  source: string;
  source_url: string | null;
  title: string | null;
  content: string;
};

export type RagCitation = {
  title: string;
  source: string;
  url: string | null;
};

export type RagCaenSuggestion = {
  source: "supabase_vector_ai" | "supabase_rag" | "local_fallback";
  matches: Array<CaenMatch & { evidence?: string }>;
  citations: RagCitation[];
  degraded: boolean;
};

export type RagStepGuidance = {
  source: "supabase_rag" | "local_fallback";
  degraded: boolean;
  bullets: string[];
  citations: RagCitation[];
};

function normalize(input: string): string {
  return input
    .toLocaleLowerCase("ro-RO")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function sanitizeSensitive(input: string): string {
  // Never push full CNP-like sequences into retrieval logs/queries.
  return input.replace(/\b\d{13}\b/g, "[cnp_mascat]");
}

function tokenize(input: string): string[] {
  const uniq = new Set(
    normalize(input)
      .split(/\s+/)
      .filter((t) => t.length >= 3),
  );
  return [...uniq].slice(0, 6);
}

function buildLocalGuidance(topic: string, stepInfo?: string[]): RagStepGuidance {
  const localBullets = (stepInfo ?? []).filter(Boolean).slice(0, 4);
  return {
    source: "local_fallback",
    degraded: true,
    bullets:
      localBullets.length > 0
        ? localBullets
        : [
            `Nu am găsit context RAG pentru: ${topic}.`,
            "Verifică pe portalul instituției înainte de depunere.",
          ],
    citations: [],
  };
}

export async function suggestCaenWithRag(activity: string): Promise<RagCaenSuggestion> {
  const query = sanitizeSensitive(activity.trim());
  if (!query || query.length < 3) {
    throw new Error("Descrierea activității trebuie să aibă cel puțin 3 caractere.");
  }

  const res = await fetch("/api/caen/suggest", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ description: query }),
  });
  const payload = (await res.json()) as Partial<RagCaenSuggestion> & { error?: string };
  if (!res.ok) {
    throw new Error(payload.error ?? `CAEN suggest failed (${res.status}).`);
  }
  if (!Array.isArray(payload.matches) || payload.matches.length === 0) {
    throw new Error("Nu am găsit coduri CAEN relevante pentru descrierea introdusă.");
  }
  return {
    source: payload.source ?? "supabase_vector_ai",
    matches: payload.matches,
    citations: payload.citations ?? [],
    degraded: Boolean(payload.degraded),
  };
}

export async function explainStepWithRag(
  topic: string,
  stepInfo?: string[],
): Promise<RagStepGuidance> {
  const query = sanitizeSensitive(topic.trim());
  if (!query) return buildLocalGuidance(topic, stepInfo);
  if (!isSupabaseConfigured()) return buildLocalGuidance(topic, stepInfo);

  const tokens = tokenize(query);
  if (tokens.length === 0) return buildLocalGuidance(topic, stepInfo);

  const { data: chunks, error } = await supabaseSelect<KnowledgeRow>({
    table: "knowledge_chunks",
    select: "source,source_url,title,content",
    or: tokens.map((t) => `content.ilike.%${t}%`).join(","),
    limit: 5,
  });

  if (error || chunks.length === 0) {
    if (error) {
      console.warn("[rag] explain query failed; fallback local", error);
    }
    return buildLocalGuidance(topic, stepInfo);
  }

  const bullets = chunks
    .map((c) =>
      c.content
        .split(/[\n.!?]/)
        .map((s) => s.trim())
        .find((s) => s.length > 40),
    )
    .filter((s): s is string => Boolean(s))
    .slice(0, 4);

  if (bullets.length === 0) return buildLocalGuidance(topic, stepInfo);

  return {
    source: "supabase_rag",
    degraded: false,
    bullets,
    citations: chunks.slice(0, 4).map((c) => ({
      title: c.title ?? c.source,
      source: c.source,
      url: c.source_url,
    })),
  };
}
