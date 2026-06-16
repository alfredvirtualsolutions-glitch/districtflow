import { neon } from 'npm:@neondatabase/serverless@0.10';

/**
 * Neon Lead Ingest Endpoint
 *
 * POST /  (no Base44 user auth required — called by the multicrawler/scraper)
 * Header: X-Crawler-Secret: <your CRAWLER_SECRET value>
 * Env:    NEON_DATABASE_URL — Neon Postgres connection string (CRM database)
 *
 * Body (JSON) — a single teacher lead extracted from a district staff
 * directory, or an array of leads:
 * {
 *   "external_id":   "12345:jane.doe@usd.edu",  // optional dedupe key (district_id:email)
 *   "district_id":   "12345",                   // Supabase SchoolDistrict id
 *   "district_name": "Some USD",
 *   "state":         "CA",
 *   "website":       "https://someusd.edu",
 *   "first_name":    "Jane",
 *   "last_name":     "Doe",
 *   "email":         "jane.doe@usd.edu",        // required
 *   "title":         "5th Grade Teacher"
 * }
 *
 * Records are upserted into the Neon `leads` table on `external_id`
 * (falling back to `email` when no external_id is supplied), and every
 * ingest is recorded in `pipeline_logs` with stage = 'crawl_ingest'.
 */

Deno.serve(async (req) => {
  const secret = req.headers.get('X-Crawler-Secret');
  if (!secret || secret !== Deno.env.get('CRAWLER_SECRET')) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  const databaseUrl = Deno.env.get('NEON_DATABASE_URL');
  if (!databaseUrl) {
    return Response.json({ error: 'NEON_DATABASE_URL is not configured' }, { status: 500 });
  }

  const sql = neon(databaseUrl);
  const body = await req.json();
  const records = Array.isArray(body) ? body : [body];

  const results = { upserted: 0, errors: [] as { record: unknown; error: string }[] };

  for (const record of records) {
    if (!record.email) {
      results.errors.push({ record, error: "Each lead requires an 'email'" });
      continue;
    }

    const externalId = record.external_id || `${record.district_id || ''}:${record.email}`.toLowerCase();

    try {
      const rows = await sql`
        INSERT INTO leads (
          external_id, district_id, district_name, organization, state, website,
          first_name, last_name, email, title, source
        ) VALUES (
          ${externalId}, ${record.district_id || null}, ${record.district_name || null},
          ${record.organization || record.district_name || null}, ${record.state || null},
          ${record.website || null}, ${record.first_name || null}, ${record.last_name || null},
          ${record.email}, ${record.title || null}, 'crawler'
        )
        ON CONFLICT (external_id) DO UPDATE SET
          district_id = EXCLUDED.district_id,
          district_name = EXCLUDED.district_name,
          organization = EXCLUDED.organization,
          state = EXCLUDED.state,
          website = EXCLUDED.website,
          first_name = EXCLUDED.first_name,
          last_name = EXCLUDED.last_name,
          title = EXCLUDED.title
        RETURNING id
      `;

      const leadId = rows[0]?.id;
      results.upserted++;

      await sql`
        INSERT INTO pipeline_logs (stage, lead_id, status, detail)
        VALUES ('crawl_ingest', ${leadId}, 'success', ${JSON.stringify({ external_id: externalId })})
      `;
    } catch (error) {
      results.errors.push({ record, error: error.message });
      await sql`
        INSERT INTO pipeline_logs (stage, lead_id, status, detail)
        VALUES ('crawl_ingest', NULL, 'error', ${JSON.stringify({ external_id: externalId, error: error.message })})
      `;
    }
  }

  return Response.json({ success: true, ...results });
});
