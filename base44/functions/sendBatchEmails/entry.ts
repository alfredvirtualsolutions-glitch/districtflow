import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import nodemailer from 'npm:nodemailer@6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { recipients, subject, body, from_name, from_email } = await req.json();

    if (!recipients?.length) {
      return Response.json({ error: 'No recipients provided' }, { status: 400 });
    }
    if (!subject?.trim()) {
      return Response.json({ error: 'Subject is required' }, { status: 400 });
    }
    if (!body?.trim()) {
      return Response.json({ error: 'Body is required' }, { status: 400 });
    }

    const smtpHost = Deno.env.get('SMTP_HOST') || 'mail.privateemail.com';
    const smtpPort = parseInt(Deno.env.get('SMTP_PORT') || '465');
    const smtpUser = Deno.env.get('SMTP_USER');
    const smtpPass = Deno.env.get('SMTP_PASS');
    const defaultFromName = Deno.env.get('SMTP_FROM_NAME') || from_name || 'DistrictFlow';
    const defaultFromEmail = Deno.env.get('SMTP_FROM_EMAIL') || from_email || smtpUser;

    if (!smtpUser || !smtpPass) {
      return Response.json({ error: 'SMTP credentials not configured' }, { status: 500 });
    }

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: { user: smtpUser, pass: smtpPass },
    });

    const sent: string[] = [];
    const failed: { email: string; error: string }[] = [];

    for (const recipient of recipients) {
      if (!recipient.email) continue;
      try {
        const personalizedBody = body
          .replace(/\{\{district_name\}\}/g, recipient.district_name || '')
          .replace(/\{\{state\}\}/g, recipient.state || '');

        const htmlBody = personalizedBody
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/\n/g, '<br>');

        await transporter.sendMail({
          from: `"${from_name || defaultFromName}" <${from_email || defaultFromEmail}>`,
          to: recipient.email,
          subject,
          text: personalizedBody,
          html: `<div style="font-family:sans-serif;line-height:1.6">${htmlBody}</div>`,
        });

        sent.push(recipient.email);
        // Brief pause to avoid rate limiting
        await new Promise((r) => setTimeout(r, 250));
      } catch (err) {
        failed.push({ email: recipient.email, error: err.message });
      }
    }

    return Response.json({ success: true, sent: sent.length, failed });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
