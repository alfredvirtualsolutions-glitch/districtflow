import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * Crawler Ingest Endpoint
 * 
 * POST /  (no user auth required)
 * Header: X-Crawler-Secret: <your CRAWLER_SECRET value>
 * 
 * Body (JSON) — update an existing district by id:
 * {
 *   "id": "abc123",                         // required — district record id
 *   "staff_directory_url": "https://...",   // any SchoolDistrict fields to update
 *   "visibility": "Yes",
 *   "num_teachers_visible": "42",
 *   "notes": "Found 42 teachers on page 1",
 *   "url_reviewed": true
 * }
 * 
 * OR create a new district:
 * {
 *   "district_name": "Some USD",            // required for create
 *   "state": "CA",
 *   "staff_directory_url": "https://...",
 *   ... any other fields
 * }
 * 
 * Bulk: wrap records in an array:
 * [ { "id": "...", ... }, { "district_name": "...", ... } ]
 */

Deno.serve(async (req) => {
  // Validate shared secret
  const secret = req.headers.get("X-Crawler-Secret");
  if (!secret || secret !== Deno.env.get("CRAWLER_SECRET")) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (req.method !== "POST") {
    return Response.json({ error: "Method not allowed" }, { status: 405 });
  }

  const base44 = createClientFromRequest(req);
  const body = await req.json();

  const records = Array.isArray(body) ? body : [body];
  const results = { updated: 0, created: 0, errors: [] };

  for (const record of records) {
    const { id, ...fields } = record;
    if (id) {
      // Update existing record
      await base44.asServiceRole.entities.SchoolDistrict.update(id, fields);
      results.updated++;
    } else if (fields.district_name) {
      // Create new record
      await base44.asServiceRole.entities.SchoolDistrict.create(fields);
      results.created++;
    } else {
      results.errors.push({ record, error: "Must provide either 'id' (to update) or 'district_name' (to create)" });
    }
  }

  return Response.json({ success: true, ...results });
});