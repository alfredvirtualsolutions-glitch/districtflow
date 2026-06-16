-- ============================================================================
-- Migration 001 — Client Profile (Table 1 of the Ryan Cahill AI Worker Sync
-- Workflow spec)
--
-- The AI Worker must load this before processing any districts, schools,
-- leads, or outreach, and must never act outside the scope defined here
-- (active_states, allowed/excluded job titles, sending limits, etc).
-- ============================================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS client_profiles (
  client_id           TEXT PRIMARY KEY,
  client_name         TEXT NOT NULL,
  assigned_owner      TEXT,
  active_states       TEXT[] NOT NULL DEFAULT ARRAY['CA', 'NV'],
  target_market       TEXT NOT NULL DEFAULT 'K-12',
  allowed_job_titles  TEXT[] NOT NULL DEFAULT ARRAY[
    'Teacher', 'Educator', 'School Staff', 'Counselor',
    'District Employee', 'HR/Benefits Contact'
  ],
  excluded_job_titles TEXT[] NOT NULL DEFAULT ARRAY[
    'Student', 'Parent', 'Vendor', 'Board Member',
    'Principal', 'Superintendent', 'General Admin'
  ],
  sending_email       TEXT,
  sending_domain      TEXT,
  calendar_link       TEXT,
  daily_send_limit    INTEGER,
  active_campaign_id  TEXT,
  timezone            TEXT NOT NULL DEFAULT 'America/Los_Angeles',
  status              TEXT NOT NULL DEFAULT 'Active',
  notes               TEXT,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO client_profiles (
  client_id, client_name, assigned_owner, active_states, target_market,
  sending_email, sending_domain, calendar_link, daily_send_limit,
  active_campaign_id, timezone, status, notes
) VALUES (
  'ryan-cahill', 'Ryan Cahill', 'Ryan Cahill', ARRAY['CA', 'NV'], 'K-12',
  NULL, NULL, NULL, NULL,
  NULL, 'America/Los_Angeles', 'Active',
  'Teacher retirement, pension, and benefits clarification campaigns. '
  || 'Excluded job titles require campaign-level approval before targeting.'
)
ON CONFLICT (client_id) DO NOTHING;

DROP TRIGGER IF EXISTS client_profiles_set_updated_at ON client_profiles;
CREATE TRIGGER client_profiles_set_updated_at
  BEFORE UPDATE ON client_profiles
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();
