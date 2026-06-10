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
   psql "$NEON_DATABASE_URL" -f neon/migrations/003_sender_pool.sql
   ```
   All three migrations are idempotent (`IF NOT EXISTS` / `ON CONFLICT DO
   NOTHING` / `COALESCE`-guarded updates) and purely additive — safe to
   re-run, and safe against a database that already has data.
3. Set the following environment variables on the Base44 backend (for
   `neonLeadIngest`):
   - `NEON_DATABASE_URL` — Neon Postgres connection string
   - `CRAWLER_SECRET` — shared secret the crawler sends as
     `X-Crawler-Secret` (same secret used by `crawlerIngest`)
4. In n8n, add a **Postgres** credential named `Neon CRM` pointing at the
   same `NEON_DATABASE_URL`, and three **SMTP** credentials (host
   `mail.spacemail.com`, port `465` or `587`, SSL) — one per SpaceMail
   mailbox in the sender pool, named exactly:
   - `SpaceMail - benefitcheck@benefitview.us`
   - `SpaceMail - clarityreview@benefitview.us`
   - `SpaceMail - notification@benefitview.us`

   Then import `n8n/leadforce-send-campaign.json` to start sending to
   qualified, validated, personalized leads on a schedule (every 15
   minutes, respecting `client_profiles.daily_send_limit`, rotating across
   the three mailboxes).
5. Set `APOLLO_API_KEY` and `CLAY_API_KEY` in the n8n environment, and
   import `n8n/leadforce-enrich-validate-qualify.json` to enrich, validate,
   and qualify *new* leads from the multicrawler (every 30 minutes), so
   they flow into `leadforce-send-campaign.json` automatically.

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

### Added by `neon/migrations/003_sender_pool.sql`

- **`client_profiles.sender_pool`** (`TEXT[]`) — the pool of SpaceMail
  mailboxes the send-campaign workflow rotates across:
  `benefitcheck@benefitview.us`, `clarityreview@benefitview.us`,
  `notification@benefitview.us`. `sending_email`/`sending_domain` were
  also backfilled to `benefitcheck@benefitview.us` / `benefitview.us` for
  the `ryan-cahill` profile.

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

## n8n workflows

- **`leadforce-send-campaign.json`** — runs every 15 minutes. Selects
  `campaign_leads` that are `status = 'new'`, `sequence_status =
  'not_started'`, on an active campaign, with a validated email
  (`leads.email_valid = 'valid'`) and existing personalization
  (`email_subject` / `email_body`), skipping anything in
  `suppression_list`. Each lead is round-robin assigned a sender from
  `client_profiles.sender_pool` (the three benefitview.us mailboxes), then
  routed to the matching SpaceMail SMTP credential and sent. The send is
  logged to `sequence_tasks` (`task_type = 'email_send'`, `status =
  'sent'`), `campaign_leads` advances to `status = 'contacted'` /
  `sequence_status = 'active'`, and an `email_events` row is recorded
  (with `metadata.sender`). Send failures are logged to `sequence_tasks`
  (`status = 'failed'`, `error_message`) and `email_events` (`event_type =
  'failed'`) instead of retrying. The batch size per run is capped at 10
  and further capped by `client_profiles.daily_send_limit` (defaults to
  50/day if unset).

  > Note: the existing personalized `email_body` text for the 3,035 leads
  > signs off as "Ryan Cahill ... ryan@meetryancahill.com", which differs
  > from the `benefitview.us` sending domain. Replies will go to whichever
  > address the recipient replies to (the From header is benefitview.us).
  > Flag if you'd like the signature/calendar link in `leads.email_body`
  > rewritten to match.

  As of this writing all 3,035 leads / 2,976 `campaign_leads` rows for the
  "CA K-12 IRMAA Awareness" campaign are already enriched, validated, and
  personalized — this workflow is the only thing standing between them and
  outreach.

- **`leadforce-enrich-validate-qualify.json`** — runs every 30 minutes,
  three branches feeding the send workflow above with *new* leads from the
  multicrawler:
  1. **Enrich**: leads with `enriched_at IS NULL` are matched against
     Apollo People Match; `job_title`, `linkedin_url`, and `seniority` are
     filled in (without clobbering existing values) and `enriched_at` is
     stamped.
  2. **Validate**: enriched leads with `email_valid IS NULL` are checked
     via Clay's verify-email; `email_valid` (`valid`/`invalid`),
     `email_status`, and `email_risk` are recorded.
  3. **Qualify & personalize**: leads with `email_valid = 'valid'` and no
     `email_subject` yet are checked against `client_profiles`
     (`job_title` matches `allowed_job_titles` and not
     `excluded_job_titles`, `state` in `active_states`) and
     `suppression_list`. Qualifying leads get the same "Complimentary
     Pension Review" email template (subject + body, with
     `first_name`/`school_district` substituted) used for the existing
     3,035 leads, stamped with `personalized_at`. A second query then
     inserts a `campaign_leads` row (`status = 'new'`, `sequence_status =
     'not_started'`) for every personalized lead not already on a
     campaign, using `client_profiles.active_campaign_id` if set, else the
     client's active campaign. New leads with no `client_id` are treated
     as belonging to Ryan Cahill (the only current client).

  All three queries are idempotent — re-running only touches leads that
  haven't reached the next stage yet, so this workflow and
  `leadforce-send-campaign.json` can run on independent schedules
  indefinitely as the crawler feeds in new leads.

## Crawler ingest

The multicrawler/scraper pushes extracted teacher contacts to:

```
POST <base44 backend>/functions/neonLeadIngest
Header: X-Crawler-Secret: <CRAWLER_SECRET>
Body: { ... lead fields ... }  or  [ { ... }, { ... } ]
```

See `base44/functions/neonLeadIngest/entry.ts` for the full field list.
