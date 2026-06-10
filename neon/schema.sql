-- ============================================================================
-- Ryan Cahill Pipeline — Neon CRM schema
--
-- Neon is the CRM/working database for teacher leads extracted by the
-- multicrawler from district staff directories (whose URLs live in the
-- Supabase `school_districts` table). Records land here via
-- base44/functions/neonLeadIngest, then n8n enriches (Apollo), validates
-- (Clay), filters qualified leads, and sends personalised emails
-- (SpaceMail), writing every step to pipeline_logs.
-- ============================================================================

CREATE TABLE IF NOT EXISTS leads (
  id                  BIGSERIAL PRIMARY KEY,

  -- Crawler-provided identity / dedupe key, e.g. "<district_id>:<email>"
  external_id         TEXT UNIQUE,

  -- Person
  first_name          TEXT,
  last_name           TEXT,
  email               TEXT NOT NULL,
  title               TEXT,

  -- Source district (district URLs / staff directory URLs come from Supabase)
  district_id         TEXT,
  district_name       TEXT,
  organization        TEXT,
  state               TEXT,
  website             TEXT,

  source              TEXT NOT NULL DEFAULT 'crawler',

  -- Enrichment (Apollo — People Match)
  enrichment_status   TEXT,            -- enriched | not_found | NULL (pending)
  linkedin_url        TEXT,
  advisor_name        TEXT,
  enriched_at         TIMESTAMPTZ,

  -- Email validation (Clay)
  validation_status   TEXT,            -- valid | invalid | NULL (pending)
  validator_used      TEXT,
  validated_at        TIMESTAMPTZ,

  -- Qualification / filtering for outreach
  qualified           BOOLEAN NOT NULL DEFAULT FALSE,
  qualified_at        TIMESTAMPTZ,
  priority_score      NUMERIC,

  -- Personalised outreach (n8n -> SpaceMail)
  subject_line        TEXT,
  email_body          TEXT,
  sequence_day        INTEGER,
  send_status         TEXT,            -- sent | failed | NULL (pending)
  email_status        TEXT,
  sender_account      TEXT,
  send_attempt_count  INTEGER NOT NULL DEFAULT 0,
  sent_at             TIMESTAMPTZ,

  suppressed          BOOLEAN NOT NULL DEFAULT FALSE,
  notes               TEXT,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_leads_enrichment_status ON leads (enrichment_status) WHERE enrichment_status IS NULL;
CREATE INDEX IF NOT EXISTS idx_leads_validation_status ON leads (validation_status) WHERE validation_status IS NULL;
CREATE INDEX IF NOT EXISTS idx_leads_send_status ON leads (send_status) WHERE send_status IS NULL;
CREATE INDEX IF NOT EXISTS idx_leads_qualified ON leads (qualified) WHERE qualified = TRUE;
CREATE INDEX IF NOT EXISTS idx_leads_district_id ON leads (district_id);

-- Keep updated_at current on every write
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS leads_set_updated_at ON leads;
CREATE TRIGGER leads_set_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- ============================================================================
-- Pipeline run log — one row per stage event so every output is traceable
-- (crawl ingest, enrichment, validation, qualification, send).
-- ============================================================================

CREATE TABLE IF NOT EXISTS pipeline_logs (
  id          BIGSERIAL PRIMARY KEY,
  stage       TEXT NOT NULL,   -- crawl_ingest | enrichment | validation | qualification | send
  lead_id     BIGINT REFERENCES leads(id) ON DELETE SET NULL,
  status      TEXT NOT NULL,   -- success | error | skipped
  detail      JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pipeline_logs_stage ON pipeline_logs (stage, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pipeline_logs_lead_id ON pipeline_logs (lead_id);
