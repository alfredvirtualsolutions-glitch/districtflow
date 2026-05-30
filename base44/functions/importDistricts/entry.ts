import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { file_url, default_state } = await req.json();
    
    // Extract data from CSV
    const result = await base44.integrations.Core.ExtractDataFromUploadedFile({
      file_url,
      json_schema: {
        type: "object",
        properties: {
          districts: {
            type: "array",
            items: {
              type: "object",
              properties: {
                district_name: { type: "string", description: "District name column" },
                website_url: { type: "string", description: "Website url column" },
                staff_directory_url: { type: "string", description: "Staff Directory url column" },
                visibility: { type: "string", description: "Visibility (Yes/No) column" },
                num_teachers_visible: { type: "string", description: "Number of teachers visible column" }
              }
            }
          }
        }
      }
    });

    if (result.status === "error") {
      return Response.json({ error: result.details }, { status: 400 });
    }

    const rows = result.output?.districts || [];
    const state = default_state || "TX";
    
    // Bulk create in batches of 50
    let created = 0;
    for (let i = 0; i < rows.length; i += 50) {
      const batch = rows.slice(i, i + 50).map(r => ({
        ...r,
        state
      }));
      await base44.asServiceRole.entities.SchoolDistrict.bulkCreate(batch);
      created += batch.length;
    }

    return Response.json({ success: true, created });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});