-- CAEN Vector + AI parity prerequisites for civic-agent-hackathon.
-- This migration is idempotent and mirrors the buian match_caen shape.

create extension if not exists vector;

alter table if exists public.caen_codes
  add column if not exists embedding vector(1536);

create index if not exists caen_codes_embedding_idx
  on public.caen_codes
  using hnsw (embedding vector_cosine_ops);

create or replace function public.match_caen(
  query_embedding vector(1536),
  match_count int default 5
)
returns table (
  code text,
  title text,
  description text,
  similarity float
)
language sql
stable
as $$
  select
    c.code,
    c.title,
    c.description,
    1 - (c.embedding <=> query_embedding) as similarity
  from public.caen_codes c
  where c.embedding is not null
  order by c.embedding <=> query_embedding
  limit greatest(match_count, 1);
$$;
