-- ============================================================
-- Migration 007 — Client document uploads
--
-- Creates:
--   1. Supabase Storage bucket "client-documents"
--   2. Storage RLS policies (org isolation + client visibility)
--   3. client_documents metadata table (tracks visibility, uploader, etc.)
--   4. RLS on client_documents table
--
-- File path convention: {org_id}/{client_id}/{timestamp}_{filename}
-- The org_id prefix is what storage policies use for org isolation.
-- ============================================================


-- ─── 1. Storage bucket ───────────────────────────────────────────────────────

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'client-documents',
  'client-documents',
  false,
  10485760,   -- 10 MB per file
  ARRAY['image/jpeg','image/png','image/webp','image/heic','application/pdf']
)
ON CONFLICT (id) DO NOTHING;


-- ─── 2. Storage RLS policies ─────────────────────────────────────────────────

-- Staff / admin: upload into their org's folder
CREATE POLICY "org members can upload"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'client-documents'
  AND (storage.foldername(name))[1] = (
    SELECT org_id::text FROM users WHERE id = auth.uid()
  )
);

-- Staff / admin: read any file in their org's folder
CREATE POLICY "org members can read"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'client-documents'
  AND (
    -- Staff/admin path: file lives in their org folder
    (storage.foldername(name))[1] = (
      SELECT org_id::text FROM users WHERE id = auth.uid()
    )
    OR
    -- Client portal path: file is explicitly marked visible_to_client
    EXISTS (
      SELECT 1
      FROM client_documents cd
      JOIN users u ON u.client_id = cd.client_id
      WHERE u.id       = auth.uid()
        AND cd.storage_path = name
        AND cd.visible_to_client = true
    )
  )
);

-- Staff / admin: delete files in their org's folder
-- Clients cannot delete anything
CREATE POLICY "org members can delete"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'client-documents'
  AND (storage.foldername(name))[1] = (
    SELECT org_id::text FROM users WHERE id = auth.uid()
  )
);


-- ─── 3. client_documents metadata table ──────────────────────────────────────
-- Mirrors every file in storage, tracks visibility and uploader.
-- Deleting a row here does NOT auto-delete the storage object —
-- the API must call storage.remove() then delete this row.

CREATE TABLE client_documents (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id         uuid        NOT NULL REFERENCES clients(id)       ON DELETE CASCADE,
  org_id            uuid        NOT NULL REFERENCES organizations(id)  ON DELETE CASCADE,
  storage_path      text        NOT NULL UNIQUE,  -- full path used in storage bucket
  file_name         text        NOT NULL,         -- original filename shown in UI
  file_size         integer,                      -- bytes
  mime_type         text,
  visible_to_client boolean     NOT NULL DEFAULT false,
  uploaded_by       uuid        REFERENCES users(id) ON DELETE SET NULL,
  created_at        timestamptz DEFAULT now()
);


-- ─── 4. RLS on client_documents ──────────────────────────────────────────────

ALTER TABLE client_documents ENABLE ROW LEVEL SECURITY;

-- Staff/admin: full access within their org
CREATE POLICY "org members manage documents"
ON client_documents
USING (
  org_id = (SELECT org_id FROM users WHERE id = auth.uid())
)
WITH CHECK (
  org_id = (SELECT org_id FROM users WHERE id = auth.uid())
);

-- Client portal users: read-only, only files marked visible
CREATE POLICY "clients read visible documents"
ON client_documents FOR SELECT
USING (
  visible_to_client = true
  AND client_id = (
    SELECT client_id FROM users WHERE id = auth.uid()
  )
);
