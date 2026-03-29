-- ============================================================
-- 001_schema.sql — Core tables
-- Run this first in Supabase SQL Editor
-- ============================================================

-- Organizations (multi-tenant)
CREATE TABLE organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  config jsonb DEFAULT '{}',
  service_types text[] DEFAULT ARRAY['General Services', 'Crisis Intervention', 'Case Management', 'Referral', 'Follow-up Visit'],
  ai_budget_cents int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Users (linked to Supabase Auth)
CREATE TABLE users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text,
  role text CHECK (role IN ('admin', 'staff')) DEFAULT 'staff',
  created_at timestamptz DEFAULT now()
);

-- Clients
CREATE TABLE clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  client_number text UNIQUE,
  first_name text NOT NULL,
  last_name text NOT NULL,
  date_of_birth date,
  phone text,
  email text,
  demographics jsonb DEFAULT '{}',
  language_preference text DEFAULT 'en',
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Auto-generate client_number on insert
CREATE SEQUENCE client_number_seq START 1;

CREATE OR REPLACE FUNCTION generate_client_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.client_number := 'CLT-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(nextval('client_number_seq')::text, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_client_number
  BEFORE INSERT ON clients
  FOR EACH ROW
  WHEN (NEW.client_number IS NULL)
  EXECUTE FUNCTION generate_client_number();

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER clients_updated_at
  BEFORE UPDATE ON clients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Service / Visit Entries
CREATE TABLE service_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  org_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  staff_id uuid REFERENCES users(id) ON DELETE SET NULL,
  service_type text NOT NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  ai_structured_notes jsonb,
  voice_consent boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TRIGGER service_entries_updated_at
  BEFORE UPDATE ON service_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Appointments / Scheduling
CREATE TABLE appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  staff_id uuid REFERENCES users(id) ON DELETE SET NULL,
  org_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  scheduled_at timestamptz NOT NULL,
  service_type text,
  status text CHECK (status IN ('scheduled', 'completed', 'cancelled', 'no_show')) DEFAULT 'scheduled',
  notes text,
  reminder_sent boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- AI-Detected Follow-ups
CREATE TABLE follow_ups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  service_entry_id uuid REFERENCES service_entries(id) ON DELETE CASCADE,
  org_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  description text NOT NULL,
  due_date date,
  urgency text CHECK (urgency IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
  category text,
  status text CHECK (status IN ('pending', 'done', 'dismissed')) DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

-- Audit Log (HIPAA-adjacent compliance — NO raw PII)
CREATE TABLE audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES users(id) ON DELETE SET NULL,
  action text NOT NULL,
  table_name text,
  record_id uuid,
  before_hash text,
  after_hash text,
  ip_address text,
  created_at timestamptz DEFAULT now()
);

-- AI Prompt Registry (per-org customization without code changes)
CREATE TABLE ai_prompts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid REFERENCES organizations(id) ON DELETE CASCADE,
  action text NOT NULL,
  prompt_template text NOT NULL,
  version int DEFAULT 1,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(org_id, action, version)
);

-- Translation Cache
CREATE TABLE translations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  original_text text NOT NULL,
  language text NOT NULL,
  translated_text text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(original_text, language)
);

-- Document uploads metadata (files stored in Supabase Storage)
CREATE TABLE documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  org_id uuid REFERENCES organizations(id) ON DELETE CASCADE NOT NULL,
  uploaded_by uuid REFERENCES users(id) ON DELETE SET NULL,
  file_name text NOT NULL,
  storage_path text NOT NULL,
  mime_type text,
  file_size_bytes int,
  created_at timestamptz DEFAULT now()
);
