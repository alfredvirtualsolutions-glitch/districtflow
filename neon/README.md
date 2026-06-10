# Neon CRM — Ryan Cahill AI Worker Sync Workflow

Neon is the working CRM database for the teacher-lead pipeline:

```
Supabase (school_districts: district + staff directory URLs)
        │
        ▼
Multicrawler / scraper  ──▶  districts / schools / leads (Neon)
                                                │
                                  automation (scheduled)│
                                  ┌──────────────┘
                                  ▼
                  Apollo enrichment → Clay validation
                  → qualification / suppression checks
                  → outreach queue (sequence_tasks) → SpaceMail send
                                  │
                                  ▼
                  replies, appointments, daily_activity_log
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
  mailboxes outreach sends rotate across:
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

## Outreach automation (not n8n — build/host separately)

The pipeline previously had n8n workflow JSON in this repo; that's been
removed. Whatever automation replaces it (e.g. a scheduled script) needs to
implement, against `NEON_DATABASE_URL`:

1. **Enrich**: for `leads` with `enriched_at IS NULL`, call Apollo People
   Match and fill in `job_title` / `linkedin_url` / `seniority` (without
   clobbering existing values), then stamp `enriched_at`.
2. **Validate**: for enriched leads with `email_valid IS NULL`, call Clay's
   verify-email and record `email_valid` (`valid`/`invalid`),
   `email_status`, `email_risk`.
3. **Qualify & personalize**: for leads with `email_valid = 'valid'` and no
   `email_subject` yet, check against `client_profiles`
   (`job_title` matches `allowed_job_titles` and not `excluded_job_titles`,
   `state` in `active_states`) and `suppression_list`. Qualifying leads get
   the "Complimentary Pension Review" email template (subject + body, with
   `first_name`/`school_district` substituted), stamped with
   `personalized_at`, then get a `campaign_leads` row inserted
   (`status = 'new'`, `sequence_status = 'not_started'`), using
   `client_profiles.active_campaign_id` if set, else the client's active
   campaign.
4. **Send**: select `campaign_leads` that are `status = 'new'`,
   `sequence_status = 'not_started'`, on an active campaign, with
   `leads.email_valid = 'valid'` and existing `email_subject`/`email_body`,
   skipping anything in `suppression_list`. Round-robin assign a sender
   from `client_profiles.sender_pool`, send via that mailbox's SpaceMail
   SMTP, then log to `sequence_tasks` (`task_type = 'email_send'`,
   `status = 'sent'`), advance `campaign_leads` to
   `status = 'contacted'` / `sequence_status = 'active'`, and record an
   `email_events` row (`metadata.sender`). On send failure, log
   `sequence_tasks` (`status = 'failed'`, `error_message`) and
   `email_events` (`event_type = 'failed'`) instead of retrying. Cap sends
   per run and respect `client_profiles.daily_send_limit` (defaults to
   50/day if unset).

All of the above is idempotent by construction (each step only touches rows
that haven't reached the next stage), so it can run on any schedule without
double-processing.

> Note: the existing personalized `email_body` text for the 3,035 leads
> signs off as "Ryan Cahill ... ryan@meetryancahill.com", which differs
> from the `benefitview.us` sending domain. Replies will go to whichever
> address the recipient replies to (the From header is benefitview.us).

As of this writing all 3,035 leads / 2,976 `campaign_leads` rows for the
"CA K-12 IRMAA Awareness" campaign are already enriched, validated, and
personalized — step 4 (Send) is the only thing standing between them and
outreach.

## Crawler ingest

The multicrawler/scraper pushes extracted teacher contacts to:

```
POST <base44 backend>/functions/neonLeadIngest
Header: X-Crawler-Secret: <CRAWLER_SECRET>
Body: { ... lead fields ... }  or  [ { ... }, { ... } ]
```

See `base44/functions/neonLeadIngest/entry.ts` for the full field list.
