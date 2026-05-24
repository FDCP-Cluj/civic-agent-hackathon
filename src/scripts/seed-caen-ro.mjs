#!/usr/bin/env node
/* eslint-disable no-console */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, "../..");

loadDotEnv(path.join(ROOT, ".env"));

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_API_KEY =
  process.env.VITE_SUPABASE_ANON_KEY ||
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_AUTH_TOKEN = process.env.SUPABASE_SERVICE_ROLE_KEY || SUPABASE_API_KEY;
const GEMINI_KEY = process.env.VITE_GEMINI_API_KEY;

if (!SUPABASE_URL) {
  throw new Error("Missing VITE_SUPABASE_URL.");
}
if (!SUPABASE_API_KEY) {
  throw new Error("Missing VITE_SUPABASE_ANON_KEY (or VITE_SUPABASE_PUBLISHABLE_KEY).");
}
if (!SUPABASE_AUTH_TOKEN) {
  throw new Error("Missing Supabase auth token.");
}
if (!GEMINI_KEY) {
  throw new Error("Missing VITE_GEMINI_API_KEY.");
}

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta";
const MIN_EXPECTED_CODES = 500;
const LOCAL_CAEN_SQL_PATH = path.join(ROOT, "src/scripts/CAEN.sql");
const UPSERT_BATCH = 100;
const EMBED_BATCH = 20;
const EMBED_CONCURRENCY = Number(process.env.CAEN_EMBED_CONCURRENCY || 1);
const EMBED_ROW_RETRIES = Number(process.env.CAEN_EMBED_ROW_RETRIES || 5);
const EMBED_BASE_BACKOFF_MS = Number(process.env.CAEN_EMBED_BACKOFF_MS || 1200);

function loadDotEnv(envPath) {
  if (!fs.existsSync(envPath)) return;
  const raw = fs.readFileSync(envPath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    if (!line || line.trim().startsWith("#")) continue;
    const idx = line.indexOf("=");
    if (idx < 0) continue;
    const key = line.slice(0, idx).trim();
    let val = line.slice(idx + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    process.env[key] = val;
  }
}

function sanitizeTitle(text) {
  return (text ?? "")
    .replace(/\s+/g, " ")
    .replace(/[\u0000-\u001F]/g, " ")
    .trim();
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeRows(rows) {
  const byCode = new Map();
  for (const row of rows) {
    const code = String(row.code ?? "").replace(/\D/g, "");
    const title = sanitizeTitle(row.title);
    if (code.length !== 4 || !title) continue;
    if (!byCode.has(code)) {
      byCode.set(code, {
        code,
        title,
        description: null,
        source: row.source,
        source_url: row.source_url ?? null,
      });
    }
  }
  return [...byCode.values()].sort((a, b) => a.code.localeCompare(b.code));
}

function parseCaenSql(sqlText, source, sourceUrl) {
  const re = /\('(\d{4})'\s*,\s*'((?:[^']|'')+)'\)/g;
  const rows = [];
  let m;
  while ((m = re.exec(sqlText))) {
    rows.push({
      code: m[1],
      title: m[2].replace(/''/g, "'"),
      source,
      source_url: sourceUrl,
    });
  }
  return normalizeRows(rows);
}

async function loadFromLocalSqlOnly() {
  if (!fs.existsSync(LOCAL_CAEN_SQL_PATH)) {
    throw new Error(`Local SQL source not found: ${LOCAL_CAEN_SQL_PATH}`);
  }
  const sqlText = fs.readFileSync(LOCAL_CAEN_SQL_PATH, "utf8");
  const rows = parseCaenSql(sqlText, "local_sql", LOCAL_CAEN_SQL_PATH);
  if (rows.length === 0) {
    throw new Error("Local CAEN.sql parsed 0 class rows.");
  }
  return rows;
}

async function loadCaenRows() {
  const rows = await loadFromLocalSqlOnly();
  if (rows.length < MIN_EXPECTED_CODES) {
    throw new Error(
      `Local CAEN.sql contains only ${rows.length} 4-digit classes (expected >= ${MIN_EXPECTED_CODES}).`,
    );
  }
  console.log(`[source] local CAEN.sql (${rows.length} classes)`);
  return rows;
}

async function supabaseUpsertRows(rows) {
  for (let i = 0; i < rows.length; i += UPSERT_BATCH) {
    const batch = rows.slice(i, i + UPSERT_BATCH);
    const res = await fetch(`${SUPABASE_URL}/rest/v1/caen_codes?on_conflict=code`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_API_KEY,
        Authorization: `Bearer ${SUPABASE_AUTH_TOKEN}`,
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify(batch),
    });
    if (!res.ok) {
      throw new Error(`Upsert failed (${res.status}): ${await res.text()}`);
    }
    console.log(`[upsert] ${Math.min(i + UPSERT_BATCH, rows.length)}/${rows.length}`);
  }
}

async function selectRowsMissingEmbedding() {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/caen_codes?select=code,title,description&embedding=is.null&order=code.asc`,
    {
      headers: {
        apikey: SUPABASE_API_KEY,
        Authorization: `Bearer ${SUPABASE_AUTH_TOKEN}`,
      },
    },
  );
  if (!res.ok) {
    throw new Error(`Select missing embeddings failed (${res.status}): ${await res.text()}`);
  }
  return await res.json();
}

async function embedWithGemini(text) {
  const attempts = [
    {
      model: "text-embedding-004",
      body: { content: { parts: [{ text }] }, outputDimensionality: 1536 },
    },
    {
      model: "gemini-embedding-001",
      body: { content: { parts: [{ text }] }, outputDimensionality: 1536 },
    },
    {
      model: "embedding-001",
      body: { content: { parts: [{ text }] } },
    },
  ];

  const attemptErrors = [];

  for (const attempt of attempts) {
    for (let retry = 0; retry < 3; retry++) {
      const url = `${GEMINI_BASE}/models/${attempt.model}:embedContent?key=${encodeURIComponent(GEMINI_KEY)}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(attempt.body),
      });

      if (res.ok) {
        const json = await res.json();
        const vec = json?.embedding?.values;
        if (Array.isArray(vec) && vec.length > 0) return vec;
        attemptErrors.push(`${attempt.model}: empty embedding`);
        break;
      }

      const bodyText = await res.text();
      attemptErrors.push(`${attempt.model}: HTTP ${res.status} ${bodyText.slice(0, 180)}`);

      // Backoff on throttling or transient errors.
      if (res.status === 429 || res.status >= 500) {
        await sleep(EMBED_BASE_BACKOFF_MS * (retry + 1));
        continue;
      }
      // For 4xx model/method errors, move to next model.
      break;
    }
  }
  throw new Error(
    `No compatible Gemini embedding model available. Details: ${attemptErrors.slice(-3).join(" | ")}`,
  );
}

function toVectorLiteral(arr) {
  return `[${arr.map((x) => Number(x).toFixed(9)).join(",")}]`;
}

async function updateEmbedding(code, embedding) {
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/caen_codes?code=eq.${encodeURIComponent(code)}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_API_KEY,
        Authorization: `Bearer ${SUPABASE_AUTH_TOKEN}`,
        Prefer: "return=minimal",
      },
      body: JSON.stringify({ embedding: toVectorLiteral(embedding) }),
    },
  );
  if (!res.ok) {
    throw new Error(`Embedding update failed for ${code} (${res.status}): ${await res.text()}`);
  }
}

async function runWithConcurrency(items, concurrency, worker) {
  let idx = 0;
  const errors = [];
  const runners = Array.from({ length: concurrency }).map(async () => {
    while (true) {
      const current = idx++;
      if (current >= items.length) return;
      const item = items[current];
      try {
        await worker(item, current);
      } catch (err) {
        errors.push({ item, error: err });
      }
    }
  });
  await Promise.all(runners);
  return errors;
}

async function embedMissingRows() {
  const missing = await selectRowsMissingEmbedding();
  console.log(`[embed] rows missing embedding: ${missing.length}`);
  for (let i = 0; i < missing.length; i += EMBED_BATCH) {
    const batch = missing.slice(i, i + EMBED_BATCH);
    const errors = await runWithConcurrency(batch, EMBED_CONCURRENCY, async (row) => {
      const input = `${row.code} - ${row.title}${row.description ? `\n${row.description}` : ""}`;
      let lastError = null;
      for (let retry = 0; retry < EMBED_ROW_RETRIES; retry++) {
        try {
          const emb = await embedWithGemini(input);
          await updateEmbedding(row.code, emb);
          return;
        } catch (err) {
          lastError = err;
          await sleep(EMBED_BASE_BACKOFF_MS * (retry + 1));
        }
      }
      throw lastError ?? new Error("Unknown embedding failure");
    });
    console.log(`[embed] ${Math.min(i + EMBED_BATCH, missing.length)}/${missing.length}`);
    if (errors.length > 0) {
      console.warn(`[embed] batch had ${errors.length} errors`);
      for (const e of errors.slice(0, 5)) {
        console.warn(" -", e.item?.code ?? "?", e.error?.message ?? e.error);
      }
    }
  }
}

async function countRows() {
  const [totalRes, embRes] = await Promise.all([
    fetch(`${SUPABASE_URL}/rest/v1/caen_codes?select=code`, {
      headers: { apikey: SUPABASE_API_KEY, Authorization: `Bearer ${SUPABASE_AUTH_TOKEN}` },
    }),
    fetch(`${SUPABASE_URL}/rest/v1/caen_codes?select=code&embedding=not.is.null`, {
      headers: { apikey: SUPABASE_API_KEY, Authorization: `Bearer ${SUPABASE_AUTH_TOKEN}` },
    }),
  ]);
  const total = (await totalRes.json()).length;
  const embedded = (await embRes.json()).length;
  return { total, embedded };
}

async function main() {
  console.log("[1/4] Loading CAEN dataset...");
  const rows = await loadCaenRows();
  console.log(`[rows] loaded ${rows.length} CAEN classes`);

  console.log("[2/4] Upserting CAEN rows...");
  await supabaseUpsertRows(rows);

  console.log("[3/4] Embedding missing rows...");
  await embedMissingRows();

  console.log("[4/4] Final counts...");
  const counts = await countRows();
  console.log(`[done] total=${counts.total}, embedded=${counts.embedded}`);
}

main().catch((err) => {
  console.error("[fatal]", err);
  process.exit(1);
});
