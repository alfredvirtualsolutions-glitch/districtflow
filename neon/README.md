# Neon CRM — Ryan Cahill Pipeline

Neon is the working CRM database for the teacher-lead pipeline:

```
Supabase (school_districts: district + staff directory URLs)
        │
        ▼
Multicrawler / scraper  ──POST──▶  base44/functions/neonLeadIngest  ──▶  Neon: leads
                                                                              │
                                                       n8n (every 30 min)    │
                                                       ┌──────────────────────┘
                                                       ▼
                                          Apollo enrichment → Clay validation
                                          → qualification filter → SpaceMail send
                                                       │
                                                       ▼
                                              Neon: pipeline_logs (every stage)
```

## Setup

1. Create a Neon project and database for the CRM.
2. Apply `schema.sql` to it:
   ```
   psql "$NEON_DATABASE_URL" -f neon/schema.sql
   ```
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

- **`leads`** — one row per teacher lead extracted from a district staff
  directory. Tracks enrichment (Apollo), validation (Clay), qualification,
  and outreach/send status.
- **`pipeline_logs`** — append-only log of every pipeline stage
  (`crawl_ingest`, `enrichment`, `validation`, `qualification`, `send`) for
  auditing pipeline output.

## Crawler ingest

The multicrawler/scraper pushes extracted teacher contacts to:

```
POST <base44 backend>/functions/neonLeadIngest
Header: X-Crawler-Secret: <CRAWLER_SECRET>
Body: { ... lead fields ... }  or  [ { ... }, { ... } ]
```

Records are upserted on `external_id` (defaults to `<district_id>:<email>`
when not supplied). See `base44/functions/neonLeadIngest/entry.ts` for the
full field list.
