import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();

    const district = payload.data;
    if (!district) {
      return Response.json({ error: 'No district data in payload' }, { status: 400 });
    }

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('googletasks');

    // Get the default task list (@default)
    const taskListRes = await fetch('https://tasks.googleapis.com/tasks/v1/users/@me/lists/@default', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const taskList = await taskListRes.json();
    const taskListId = taskList.id;

    // Create a task for the qualified district
    const taskBody = {
      title: `Follow up: ${district.district_name} — Qualified`,
      notes: `District ${district.district_name} (${district.state || ''}) has been marked as Qualified.\nWebsite: ${district.website_url || 'N/A'}\nStaff Directory: ${district.staff_directory_url || 'N/A'}`,
    };

    const createRes = await fetch(`https://tasks.googleapis.com/tasks/v1/lists/${taskListId}/tasks`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(taskBody),
    });

    const task = await createRes.json();

    return Response.json({ success: true, task });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});