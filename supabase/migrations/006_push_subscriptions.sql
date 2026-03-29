-- ============================================================
-- Migration 006 — Push notification subscriptions
-- ============================================================

CREATE TABLE push_subscriptions (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  org_id     uuid        NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  endpoint   text        NOT NULL,
  p256dh     text        NOT NULL,
  auth       text        NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, endpoint)
);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can only manage their own subscriptions
-- Service role (used by /api/push/send) bypasses RLS automatically
CREATE POLICY "push_subs_own" ON push_subscriptions
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
