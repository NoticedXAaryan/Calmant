/**
 * Email Service — Sends emails via configured provider.
 * Stub for now; will support Resend, SES, or SMTP.
 */

interface SendEmailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export async function sendEmail(options: SendEmailOptions): Promise<void> {
  const { to, subject, text } = options;

  if (!to) {
    console.warn('[EmailService] No recipient email, skipping send');
    return;
  }

  // Check for Resend API key first
  const resendKey = process.env.RESEND_API_KEY;
  if (resendKey) {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || 'noreply@calmant.app',
        to: [to],
        subject,
        text,
        html: options.html,
      }),
    });

    if (!res.ok) {
      const error = await res.text();
      throw new Error(`Resend API error: ${res.status} — ${error}`);
    }
    return;
  }

  // Fallback: just log
  console.log(`[EmailService] Would send email to ${to}: ${subject}`);
  console.log(`[EmailService] (No email provider configured — set RESEND_API_KEY)`);
}
