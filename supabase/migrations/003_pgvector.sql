-- ============================================================
-- 003_pgvector.sql — Semantic search embeddings
-- Run this AFTER 002_rls.sql
-- NOTE: pgvector must already be enabled in your Supabase project
-- (Dashboard → Database → Extensions → search "vector" → Enable)
-- ============================================================

-- Embeddings table — 768 dims for Gemini text-embedding-004
CREATE TABLE case_note_embeddings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_entry_id uuid REFERENCES service_entries(id) ON DELETE CASCADE NOT NULL,
  org_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  embedding vector(768),
  content_hash text,
  created_at timestamptz DEFAULT now()
);

-- IVFFlat index for fast cosine similarity search
CREATE INDEX ON case_note_embeddings
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- RLS on embeddings table
ALTER TABLE case_note_embeddings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "embeddings_select" ON case_note_embeddings
  FOR SELECT USING (org_id = get_my_org_id());

CREATE POLICY "embeddings_insert" ON case_note_embeddings
  FOR INSERT WITH CHECK (org_id = get_my_org_id());

CREATE POLICY "embeddings_delete" ON case_note_embeddings
  FOR DELETE USING (org_id = get_my_org_id());

-- Semantic search function — call this from your API route
CREATE OR REPLACE FUNCTION match_case_notes(
  query_embedding vector(768),
  match_org_id uuid,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  service_entry_id uuid,
  client_id uuid,
  client_name text,
  date date,
  service_type text,
  notes text,
  similarity float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    se.id AS service_entry_id,
    se.client_id,
    (c.first_name || ' ' || c.last_name) AS client_name,
    se.date,
    se.service_type,
    se.notes,
    1 - (cne.embedding <=> query_embedding) AS similarity
  FROM case_note_embeddings cne
  JOIN service_entries se ON cne.service_entry_id = se.id
  JOIN clients c ON se.client_id = c.id
  WHERE cne.org_id = match_org_id
  ORDER BY cne.embedding <=> query_embedding
  LIMIT match_count;
$$;
