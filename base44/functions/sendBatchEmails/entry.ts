import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import nodemailer from 'npm:nodemailer@6';

// Resolves SMTP credentials for a given from_email by checking up to 10
// indexed env var groups: SMTP_ACCOUNT_N_EMAIL / SMTP_ACCOUNT_N_PASS and
// optional SMTP_ACCOUNT_N_FROM (alias address to use in the From header).
// Returns { authUser, pass, fromAddress } where fromAddress is the address
// that appears in the From header (may differ from the SMTP auth user).
function resolveAccount(fromEmail: string | undefined) {
  for (let i = 1; i <= 10; i++) {
    const authUser = Deno.env.get(`SMTP_ACCOUNT_${i}_EMAIL`);
    const pass     = Deno.env.get(`SMTP_ACCOUNT_${i}_PASS`);
    if (!authUser || !pass) continue;
    const fromAlias = Deno.env.get(`SMTP_ACCOUNT_${i}_FROM`);
    const fromAddress = fromAlias || authUser;
    if (!fromEmail || fromAddress === fromEmail || authUser === fromEmail) {
      return { authUser, pass, fromAddress };
    }
  }
  return null;
}

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

    const account = resolveAccount(from_email);
    if (!account) {
      return Response.json(
        { error: 'No matching SMTP account configured for that address' },
        { status: 500 },
      );
    }

    const smtpHost = Deno.env.get('SMTP_HOST') || 'mail.spacemail.com';
    const smtpPort = parseInt(Deno.env.get('SMTP_PORT') || '465');
    const senderName = from_name || Deno.env.get('SMTP_FROM_NAME') || 'Ryan Cahill';

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: { user: account.authUser, pass: account.pass },
    });

    const sent: string[] = [];
    const failed: { email: string; error: string }[] = [];

    for (const recipient of recipients) {
      if (!recipient.email) continue;
      try {
        const personalizedBody = body
          .replace(/\{\{first_name\}\}/g, recipient.first_name || '')
          .replace(/\{\{district_name\}\}/g, recipient.district_name || '')
          .replace(/\{\{state\}\}/g, recipient.state || '');
        const personalizedSubject = subject
          .replace(/\{\{first_name\}\}/g, recipient.first_name || '')
          .replace(/\{\{district_name\}\}/g, recipient.district_name || '')
          .replace(/\{\{state\}\}/g, recipient.state || '');

        const htmlBody = personalizedBody
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/\n/g, '<br>');

        await transporter.sendMail({
          from: `"${senderName}" <${from_email || account.fromAddress}>`,
          to: recipient.email,
          subject: personalizedSubject,
          text: personalizedBody,
          html: `<div style="font-family:sans-serif;line-height:1.6">${htmlBody}</div>`,
        });

        sent.push(recipient.email);
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
