# Neon CRM — Ryan Cahill AI Worker Sync Workflow

Neon is the working CRM database for the teacher-lead pipeline:

```
Supabase (school_districts: district + staff directory URLs)
        │
        ▼
Multicrawler / scraper  ──▶  districts / schools / leads (Neon)
                                                │
                                  n8n (scheduled)│
                                  ┌──────────────┘
                                  ▼
                  Apollo enrichment → Clay validation
                  → qualification / suppression checks
                  → outreach queue (sequence_tasks) → SpaceMail send
                                  │
                                  ▼
                  replies, appointments (Calendly), daily_activity_log
```

## Setup

1. Create a Neon project and database for the CRM (or use the existing
   production database, which already has the core CRM tables below).
2. Apply the migrations in order:
   ```
   psql "$NEON_DATABASE_URL" -f neon/migrations/001_client_profiles.sql
   psql "$NEON_DATABASE_URL" -f neon/migrations/002_crm_extensions.sql
   ```
   Both migrations are idempotent (`IF NOT EXISTS` / `ON CONFLICT DO NOTHING`)
   and purely additive — safe to re-run, and safe against a database that
   already has data.
3. Set the following environment variables on the Base44 backend (for
   `neonLeadIngest`):
   - `NEON_DATABASE_URL` — Neon Postgres connection string
   - `CRAWLER_SECRET` — shared secret the crawler sends as
     `X-Crawler-Secret` (same secret used by `crawlerIngest`)
4. In n8n, add a **Postgres** credential named `Neon CRM` pointing at the
   same `NEON_DATABASE_URL`, and import
   `n8n/leadforce-neon-pipeline.json`. Set `APOLLO_API_KEY` and
   `CLAY_API_KEY` in the n8n environment.

## Tables

### Pre-existing core CRM tables (production)

- **`clients`** — Ryan Cahill's client record (`name`, `calendly_url`, etc).
- **`campaigns`** — outreach campaigns, scoped to a `client_id`.
- **`leads`** — one row per teacher/staff contact extracted from a district
  staff directory. Tracks identity, enrichment, and validation
  (`email_valid`, `email_status`, `email_risk`), plus personalization
  (`email_subject`, `email_body`).
- **`campaign_leads`** — join table between `campaigns` and `leads`, with
  `status` (`lead_status` enum) and `sequence_status`.
- **`sequence_tasks`** — outreach queue items per `campaign_lead`.
- **`email_events`**, **`lead_notes`**, **`users`** — send-event tracking,
  manual notes, and AI Worker / team accounts.

### Added by `neon/migrations/001_client_profiles.sql`

- **`client_profiles`** — Ryan Cahill's CRM rules, territory
  (`active_states`), allowed/excluded job titles, sending config
  (`sending_email`, `daily_send_limit`, `calendar_link`), and campaign
  scope. The AI Worker must load this before processing any districts,
  schools, leads, or outreach, and must never act outside the scope defined
  here.

### Added by `neon/migrations/002_crm_extensions.sql`

- **`districts`** — synced from Supabase `school_districts` (name, state,
  staff directory URL, crawl/extraction status).
- **`schools`** — schools belonging to a district (name, type, staff
  directory URL).
- **`replies`** — inbound replies to outreach, categorized
  (`reply_category`) and tracked to resolution (`resolved_status`).
- **`suppression_list`** — emails/leads that must never be contacted again
  (`suppression_reason`: unsubscribed, bounced, complained, manual, etc).
- **`appointments`** — Calendly bookings linked to a lead/campaign_lead.
- **`daily_activity_log`** — append-only per-client/day/phase metrics for
  the AI Worker's daily schedule and EOD reports.
- **Extensions**: `leads` gains `district_id`, `school_id`, `school_name`,
  `district_name`, `email_confidence`, `client_id`; `sequence_tasks` (the
  outreach queue) gains `email_step`, `subject_line`, `email_body`,
  `personalization_notes`, `sent_at`, `error_message`, `reply_detected`,
  `suppression_checked`, `suppression_check_status`. New `lead_status`
  values (`cleaned`, `outreach_ready`, `interested`, `disqualified`,
  `suppressed`, `conflict_review`, `unsubscribed`, `follow_up_due`) and new
  `task_status` values (`draft`, `ready`, `scheduled`, `sent`, `paused`,
  `replied`, `suppressed`) support the full status-movement rules.

## Crawler ingest

The multicrawler/scraper pushes extracted teacher contacts to:

```
POST <base44 backend>/functions/neonLeadIngest
Header: X-Crawler-Secret: <CRAWLER_SECRET>
Body: { ... lead fields ... }  or  [ { ... }, { ... } ]
```

See `base44/functions/neonLeadIngest/entry.ts` for the full field list.
