import { findCaen, type CaenMatch } from "@/services/caen";
import { isSupabaseConfigured, supabaseSelect } from "@/services/supabaseClient";

type CaenRow = {
  code: string;
  title: string;
  description: string | null;
};

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
  source: "supabase_rag" | "local_fallback";
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

function scoreCaenRow(row: CaenRow, tokens: string[]): number {
  const title = normalize(row.title);
  const desc = normalize(row.description ?? "");
  let score = 0;
  for (const t of tokens) {
    if (title.includes(t)) score += 4;
    if (desc.includes(t)) score += 2;
  }
  return score;
}

function fallbackFromLocal(activity: string): RagCaenSuggestion {
  return {
    source: "local_fallback",
    matches: findCaen(activity, 5),
    citations: [],
    degraded: true,
  };
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
  if (!query) return fallbackFromLocal(activity);

  if (!isSupabaseConfigured()) return fallbackFromLocal(activity);

  const tokens = tokenize(query);
  if (tokens.length === 0) return fallbackFromLocal(activity);

  const orExpr = tokens
    .flatMap((t) => [`title.ilike.%${t}%`, `description.ilike.%${t}%`])
    .join(",");

  const [{ data: caenRows, error: caenErr }, { data: chunks, error: chunksErr }] =
    await Promise.all([
      supabaseSelect<CaenRow>({
        table: "caen_codes",
        select: "code,title,description",
        or: orExpr,
        limit: 30,
      }),
      supabaseSelect<KnowledgeRow>({
        table: "knowledge_chunks",
        select: "source,source_url,title,content",
        in: { source: ["caen", "onrc"] },
        or: tokens.map((t) => `content.ilike.%${t}%`).join(","),
        limit: 5,
      }),
    ]);

  if (caenErr) {
    console.warn("[rag] caen query failed, using local fallback", caenErr);
    return fallbackFromLocal(activity);
  }

  const ranked = (caenRows ?? [])
    .map((row) => ({
      code: row.code,
      title: row.title,
      keywords: [],
      score: scoreCaenRow(row, tokens),
      evidence: row.description ?? undefined,
    }))
    .filter((m) => m.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  if (ranked.length === 0) {
    return fallbackFromLocal(activity);
  }

  if (chunksErr) {
    console.warn("[rag] citations query failed; proceeding without citations", chunksErr);
  }

  return {
    source: "supabase_rag",
    matches: ranked,
    citations: (chunks ?? []).map((c) => ({
      title: c.title ?? c.source,
      source: c.source,
      url: c.source_url,
    })),
    degraded: false,
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
