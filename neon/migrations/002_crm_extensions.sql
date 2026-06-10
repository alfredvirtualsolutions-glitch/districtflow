-- ============================================================================
-- Migration 002 — CRM extensions for the Ryan Cahill AI Worker Sync Workflow
--
-- Purely additive: new tables for districts, schools, replies, suppression
-- list, appointments (Calendly), and daily activity log; new columns on the
-- existing `leads` and `sequence_tasks` tables (sequence_tasks doubles as
-- the outreach queue); new enum values on `lead_status` and `task_status`.
-- Nothing here drops or rewrites existing data.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- New enum types
-- ----------------------------------------------------------------------------

DO $$ BEGIN
  CREATE TYPE district_status AS ENUM (
    'pending', 'active', 'crawled', 'completed', 'skipped', 'error'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE extraction_status AS ENUM (
    'not_started', 'in_progress', 'completed', 'failed'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE school_type AS ENUM (
    'elementary', 'middle', 'high', 'k8', 'k12', 'continuation', 'adult', 'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE reply_category AS ENUM (
    'interested', 'not_interested', 'out_of_office', 'unsubscribe',
    'wrong_person', 'question', 'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE resolved_status AS ENUM (
    'open', 'in_progress', 'resolved', 'escalated'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE suppression_reason AS ENUM (
    'unsubscribed', 'bounced', 'complained', 'manual', 'do_not_contact',
    'duplicate', 'invalid_email'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE appointment_status AS ENUM (
    'scheduled', 'rescheduled', 'canceled', 'completed', 'no_show'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ----------------------------------------------------------------------------
-- Districts (Table 2) — synced from Supabase `school_districts`
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS districts (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_id         TEXT UNIQUE,         -- Supabase school_districts id
  name                TEXT NOT NULL,
  state               TEXT,
  county              TEXT,
  website             TEXT,
  staff_directory_url TEXT,
  status              district_status NOT NULL DEFAULT 'pending',
  extraction_status   extraction_status NOT NULL DEFAULT 'not_started',
  last_crawled_at     TIMESTAMPTZ,
  notes               TEXT,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_districts_state ON districts (state);
CREATE INDEX IF NOT EXISTS idx_districts_status ON districts (status);

DROP TRIGGER IF EXISTS districts_set_updated_at ON districts;
CREATE TRIGGER districts_set_updated_at
  BEFORE UPDATE ON districts
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- ----------------------------------------------------------------------------
-- Schools (Table 3)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS schools (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  district_id         UUID REFERENCES districts(id) ON DELETE CASCADE,
  name                TEXT NOT NULL,
  school_type         school_type,
  address             TEXT,
  website             TEXT,
  staff_directory_url TEXT,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_schools_district_id ON schools (district_id);

DROP TRIGGER IF EXISTS schools_set_updated_at ON schools;
CREATE TRIGGER schools_set_updated_at
  BEFORE UPDATE ON schools
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- ----------------------------------------------------------------------------
-- Replies (Table 6) — inbound replies to outreach
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS replies (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id             UUID REFERENCES leads(id) ON DELETE CASCADE,
  campaign_lead_id    UUID REFERENCES campaign_leads(id) ON DELETE CASCADE,
  channel             TEXT NOT NULL DEFAULT 'email',
  message_body        TEXT,
  category            reply_category,
  sentiment           TEXT,
  resolved_status     resolved_status NOT NULL DEFAULT 'open',
  received_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  handled_by          TEXT,
  handled_at          TIMESTAMPTZ,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_replies_lead_id ON replies (lead_id);
CREATE INDEX IF NOT EXISTS idx_replies_campaign_lead_id ON replies (campaign_lead_id);
CREATE INDEX IF NOT EXISTS idx_replies_resolved_status ON replies (resolved_status) WHERE resolved_status <> 'resolved';

DROP TRIGGER IF EXISTS replies_set_updated_at ON replies;
CREATE TRIGGER replies_set_updated_at
  BEFORE UPDATE ON replies
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- ----------------------------------------------------------------------------
-- Suppression list (Table 8) — emails/leads that must never be contacted
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS suppression_list (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email               TEXT NOT NULL UNIQUE,
  lead_id             UUID REFERENCES leads(id) ON DELETE SET NULL,
  reason              suppression_reason NOT NULL,
  source              TEXT,
  notes               TEXT,
  suppressed_at       TIMESTAMPTZ NOT NULL DEFAULT now(),

  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_suppression_list_lead_id ON suppression_list (lead_id);

DROP TRIGGER IF EXISTS suppression_list_set_updated_at ON suppression_list;
CREATE TRIGGER suppression_list_set_updated_at
  BEFORE UPDATE ON suppression_list
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- ----------------------------------------------------------------------------
-- Appointments (Table 7) — Calendly bookings
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS appointments (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id               UUID REFERENCES leads(id) ON DELETE SET NULL,
  campaign_lead_id      UUID REFERENCES campaign_leads(id) ON DELETE SET NULL,
  client_id             UUID REFERENCES clients(id) ON DELETE SET NULL,
  calendly_event_uri    TEXT UNIQUE,
  calendly_invitee_uri  TEXT,
  event_name            TEXT,
  scheduled_at          TIMESTAMPTZ,
  timezone              TEXT,
  status                appointment_status NOT NULL DEFAULT 'scheduled',
  cancel_reason         TEXT,

  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_appointments_lead_id ON appointments (lead_id);
CREATE INDEX IF NOT EXISTS idx_appointments_client_id ON appointments (client_id);
CREATE INDEX IF NOT EXISTS idx_appointments_scheduled_at ON appointments (scheduled_at);

DROP TRIGGER IF EXISTS appointments_set_updated_at ON appointments;
CREATE TRIGGER appointments_set_updated_at
  BEFORE UPDATE ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- ----------------------------------------------------------------------------
-- Daily activity log — append-only metrics per client/day/phase
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS daily_activity_log (
  id            BIGSERIAL PRIMARY KEY,
  client_id     UUID REFERENCES clients(id) ON DELETE CASCADE,
  log_date      DATE NOT NULL DEFAULT CURRENT_DATE,
  phase         TEXT NOT NULL,   -- crawl | enrich | validate | queue | send | replies | eod_report
  metric_name   TEXT NOT NULL,
  metric_value  NUMERIC,
  detail        JSONB,

  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_daily_activity_log_client_date ON daily_activity_log (client_id, log_date);

-- ----------------------------------------------------------------------------
-- Outreach Queue (Table 5) — reuse existing sequence_tasks
-- ----------------------------------------------------------------------------

ALTER TABLE sequence_tasks
  ADD COLUMN IF NOT EXISTS email_step                INTEGER,
  ADD COLUMN IF NOT EXISTS subject_line              TEXT,
  ADD COLUMN IF NOT EXISTS email_body                TEXT,
  ADD COLUMN IF NOT EXISTS personalization_notes     TEXT,
  ADD COLUMN IF NOT EXISTS sent_at                   TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS error_message             TEXT,
  ADD COLUMN IF NOT EXISTS reply_detected            BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS suppression_checked       BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS suppression_check_status  TEXT;

ALTER TYPE task_status ADD VALUE IF NOT EXISTS 'draft';
ALTER TYPE task_status ADD VALUE IF NOT EXISTS 'ready';
ALTER TYPE task_status ADD VALUE IF NOT EXISTS 'scheduled';
ALTER TYPE task_status ADD VALUE IF NOT EXISTS 'sent';
ALTER TYPE task_status ADD VALUE IF NOT EXISTS 'paused';
ALTER TYPE task_status ADD VALUE IF NOT EXISTS 'replied';
ALTER TYPE task_status ADD VALUE IF NOT EXISTS 'suppressed';

-- ----------------------------------------------------------------------------
-- Leads (Table 4) — link to districts/schools/clients, extra fields
-- ----------------------------------------------------------------------------

ALTER TABLE leads
  ADD COLUMN IF NOT EXISTS district_id      UUID REFERENCES districts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS school_id        UUID REFERENCES schools(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS school_name      TEXT,
  ADD COLUMN IF NOT EXISTS district_name    TEXT,
  ADD COLUMN IF NOT EXISTS email_confidence NUMERIC,
  ADD COLUMN IF NOT EXISTS client_id        UUID REFERENCES clients(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_leads_district_id ON leads (district_id);
CREATE INDEX IF NOT EXISTS idx_leads_school_id ON leads (school_id);
CREATE INDEX IF NOT EXISTS idx_leads_client_id ON leads (client_id);

-- Backfill client_id for existing leads to the Ryan Cahill client record
UPDATE leads
SET client_id = (SELECT id FROM clients WHERE name = 'Ryan Cahill' LIMIT 1)
WHERE client_id IS NULL;

-- ----------------------------------------------------------------------------
-- New lead_status values (Status Movement Rules)
-- ----------------------------------------------------------------------------

ALTER TYPE lead_status ADD VALUE IF NOT EXISTS 'cleaned';
ALTER TYPE lead_status ADD VALUE IF NOT EXISTS 'outreach_ready';
ALTER TYPE lead_status ADD VALUE IF NOT EXISTS 'interested';
ALTER TYPE lead_status ADD VALUE IF NOT EXISTS 'disqualified';
ALTER TYPE lead_status ADD VALUE IF NOT EXISTS 'suppressed';
ALTER TYPE lead_status ADD VALUE IF NOT EXISTS 'conflict_review';
ALTER TYPE lead_status ADD VALUE IF NOT EXISTS 'unsubscribed';
ALTER TYPE lead_status ADD VALUE IF NOT EXISTS 'follow_up_due';
