// Email Service via Resend
// Handles all outbound email notifications with graceful degradation.
// If RESEND_API_KEY is not set, emails are logged to console instead.

import { Resend } from 'resend';
import type { Task } from './types';
import { getEntropyLevel } from './entropy';

// --- Client Setup ---

let _resend: Resend | null = null;

function getResendClient(): Resend | null {
  if (!process.env.RESEND_API_KEY) {
    return null;
  }
  if (!_resend) {
    _resend = new Resend(process.env.RESEND_API_KEY);
  }
  return _resend;
}

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'Life Saver <onboarding@resend.dev>';
const USER_EMAIL = process.env.USER_EMAIL || '';

// --- Rate Limiting (100/day free tier) ---

let emailsSentToday = 0;
let lastResetDate = new Date().toDateString();

function checkDailyLimit(): boolean {
  const today = new Date().toDateString();
  if (today !== lastResetDate) {
    emailsSentToday = 0;
    lastResetDate = today;
  }
  return emailsSentToday < 90; // Leave 10 buffer
}

// --- Public API ---

export interface EmailResult {
  sent: boolean;
  reason?: string;
  id?: string;
}

/**
 * Check if email is configured and available.
 */
export function isEmailConfigured(): boolean {
  return !!(process.env.RESEND_API_KEY && USER_EMAIL);
}

/**
 * Send an email via Resend with graceful degradation.
 */
export async function sendEmail(
  subject: string,
  html: string,
  to?: string
): Promise<EmailResult> {
  const recipient = to || USER_EMAIL;

  if (!recipient) {
    return { sent: false, reason: 'No recipient email configured (set USER_EMAIL env var)' };
  }

  const resend = getResendClient();
  if (!resend) {
    console.log(`[Email] Would send to ${recipient}: "${subject}"`);
    console.log(`[Email] Body preview: ${html.slice(0, 200)}...`);
    return { sent: false, reason: 'RESEND_API_KEY not configured — email logged to console' };
  }

  if (!checkDailyLimit()) {
    console.warn('[Email] Daily limit reached (90/day). Email deferred.');
    return { sent: false, reason: 'Daily email limit reached' };
  }

  try {
    const result = await resend.emails.send({
      from: FROM_EMAIL,
      to: [recipient],
      subject,
      html,
    });

    emailsSentToday++;
    
    if (result.error) {
      console.error('[Email] Resend error:', result.error);
      return { sent: false, reason: result.error.message };
    }

    console.log(`[Email] Sent: "${subject}" to ${recipient} (id: ${result.data?.id})`);
    return { sent: true, id: result.data?.id };
  } catch (error) {
    console.error('[Email] Send failed:', error);
    return { sent: false, reason: String(error) };
  }
}

// --- Email Templates ---

/**
 * Critical task alert — sent when entropy crosses threshold.
 */
export function criticalAlertEmail(tasks: Task[]): { subject: string; html: string } {
  const taskRows = tasks.map(t => {
    const level = getEntropyLevel(t.entropyScore);
    const emoji = level === 'critical' ? '🔴' : level === 'hot' ? '🟠' : '🟡';
    const deadline = new Date(t.deadline);
    const timeLeft = getTimeLeft(deadline);
    return `<tr>
      <td style="padding:8px 12px;border-bottom:1px solid #27272a;">${emoji}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #27272a;font-weight:600;color:#f1f5f9;">${t.title}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #27272a;color:#94a3b8;">${timeLeft}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #27272a;color:#94a3b8;">${t.entropyScore.toFixed(2)}</td>
    </tr>`;
  }).join('');

  return {
    subject: `🔴 ${tasks.length} critical task${tasks.length > 1 ? 's' : ''} need attention now`,
    html: emailTemplate(
      '🔴 Critical Tasks Alert',
      `<p style="color:#94a3b8;margin:0 0 20px;">You have ${tasks.length} task${tasks.length > 1 ? 's' : ''} in the danger zone:</p>
      <table style="width:100%;border-collapse:collapse;margin-bottom:20px;">
        <tr style="text-align:left;">
          <th style="padding:8px 12px;border-bottom:2px solid #3f3f46;color:#71717a;font-size:12px;">STATUS</th>
          <th style="padding:8px 12px;border-bottom:2px solid #3f3f46;color:#71717a;font-size:12px;">TASK</th>
          <th style="padding:8px 12px;border-bottom:2px solid #3f3f46;color:#71717a;font-size:12px;">TIME LEFT</th>
          <th style="padding:8px 12px;border-bottom:2px solid #3f3f46;color:#71717a;font-size:12px;">ENTROPY</th>
        </tr>
        ${taskRows}
      </table>
      <p style="color:#71717a;font-size:13px;">Open the dashboard to take action on these tasks.</p>`
    ),
  };
}

/**
 * Morning briefing email — daily overview sent at configured time.
 */
export function morningBriefingEmail(
  tasks: Task[],
  habits: Array<{ name: string; emoji: string; completedToday: boolean }>,
  userName?: string
): { subject: string; html: string } {
  const name = userName || 'there';
  const critical = tasks.filter(t => t.entropyScore >= 0.8);
  const high = tasks.filter(t => t.entropyScore >= 0.5 && t.entropyScore < 0.8);
  const pending = tasks.filter(t => t.status === 'pending' || t.status === 'in_progress');

  let taskSection = '';

  if (critical.length > 0) {
    taskSection += `<h3 style="color:#ef4444;margin:16px 0 8px;font-size:14px;">🔴 CRITICAL — Act Now</h3>`;
    taskSection += critical.map(t =>
      `<div style="padding:8px 0;border-bottom:1px solid #27272a;">
        <span style="color:#f1f5f9;font-weight:600;">${t.title}</span>
        <span style="color:#71717a;margin-left:8px;font-size:13px;">due ${getTimeLeft(new Date(t.deadline))}</span>
      </div>`
    ).join('');
  }

  if (high.length > 0) {
    taskSection += `<h3 style="color:#f59e0b;margin:16px 0 8px;font-size:14px;">🟠 HIGH PRIORITY</h3>`;
    taskSection += high.map(t =>
      `<div style="padding:8px 0;border-bottom:1px solid #27272a;">
        <span style="color:#f1f5f9;font-weight:600;">${t.title}</span>
        <span style="color:#71717a;margin-left:8px;font-size:13px;">due ${getTimeLeft(new Date(t.deadline))}</span>
      </div>`
    ).join('');
  }

  const pendingHabits = habits.filter(h => !h.completedToday);
  let habitSection = '';
  if (pendingHabits.length > 0) {
    habitSection = `<h3 style="color:#f1f5f9;margin:16px 0 8px;font-size:14px;">✅ HABITS (${pendingHabits.length} pending)</h3>`;
    habitSection += pendingHabits.map(h =>
      `<div style="padding:4px 0;color:#94a3b8;">☐ ${h.emoji} ${h.name}</div>`
    ).join('');
  }

  return {
    subject: `🌅 Good morning${name !== 'there' ? ', ' + name : ''} — ${pending.length} tasks today`,
    html: emailTemplate(
      `🌅 Good Morning, ${name}`,
      `<p style="color:#94a3b8;margin:0 0 20px;">Here's your day at a glance:</p>
      ${taskSection || '<p style="color:#10b981;">No critical tasks — great job staying ahead!</p>'}
      ${habitSection}
      <div style="margin-top:20px;padding:12px 16px;background:#18181b;border-radius:8px;border:1px solid #27272a;">
        <p style="color:#71717a;margin:0;font-size:13px;">
          📊 ${pending.length} pending · ${critical.length} critical · ${habits.length} habits tracked
        </p>
      </div>`
    ),
  };
}

/**
 * Evening review email — daily wrap-up.
 */
export function eveningReviewEmail(
  completedToday: Task[],
  stillPending: Task[],
  habitsCompleted: number,
  habitsTotal: number
): { subject: string; html: string } {
  const completionRate = stillPending.length + completedToday.length > 0
    ? Math.round((completedToday.length / (stillPending.length + completedToday.length)) * 100)
    : 100;

  let completedSection = '';
  if (completedToday.length > 0) {
    completedSection = `<h3 style="color:#10b981;margin:16px 0 8px;font-size:14px;">✅ Completed Today (${completedToday.length})</h3>`;
    completedSection += completedToday.map(t =>
      `<div style="padding:4px 0;color:#94a3b8;">✓ ${t.title}</div>`
    ).join('');
  }

  let pendingSection = '';
  if (stillPending.length > 0) {
    pendingSection = `<h3 style="color:#f59e0b;margin:16px 0 8px;font-size:14px;">📋 Still Pending (${stillPending.length})</h3>`;
    pendingSection += stillPending.slice(0, 5).map(t =>
      `<div style="padding:4px 0;color:#94a3b8;">→ ${t.title}</div>`
    ).join('');
    if (stillPending.length > 5) {
      pendingSection += `<div style="padding:4px 0;color:#71717a;font-size:13px;">... and ${stillPending.length - 5} more</div>`;
    }
  }

  return {
    subject: `🌙 Day wrap-up — ${completionRate}% completion rate`,
    html: emailTemplate(
      '🌙 Evening Review',
      `<div style="text-align:center;padding:20px 0;">
        <div style="font-size:48px;font-weight:700;color:#f1f5f9;">${completionRate}%</div>
        <div style="color:#71717a;font-size:14px;">Task Completion Rate</div>
      </div>
      <div style="display:flex;gap:16px;margin-bottom:20px;">
        <div style="flex:1;padding:12px;background:#18181b;border-radius:8px;text-align:center;">
          <div style="font-size:24px;font-weight:600;color:#10b981;">${completedToday.length}</div>
          <div style="color:#71717a;font-size:12px;">Completed</div>
        </div>
        <div style="flex:1;padding:12px;background:#18181b;border-radius:8px;text-align:center;">
          <div style="font-size:24px;font-weight:600;color:#f59e0b;">${stillPending.length}</div>
          <div style="color:#71717a;font-size:12px;">Pending</div>
        </div>
        <div style="flex:1;padding:12px;background:#18181b;border-radius:8px;text-align:center;">
          <div style="font-size:24px;font-weight:600;color:#6366f1;">${habitsCompleted}/${habitsTotal}</div>
          <div style="color:#71717a;font-size:12px;">Habits</div>
        </div>
      </div>
      ${completedSection}
      ${pendingSection}`
    ),
  };
}

// --- Helpers ---

function getTimeLeft(deadline: Date): string {
  const now = new Date();
  const diff = deadline.getTime() - now.getTime();

  if (diff < 0) return 'OVERDUE';
  if (diff < 3600000) return `${Math.round(diff / 60000)}m left`;
  if (diff < 86400000) return `${Math.round(diff / 3600000)}h left`;
  return `${Math.round(diff / 86400000)}d left`;
}

function emailTemplate(title: string, body: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#09090b;font-family:Inter,system-ui,-apple-system,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:40px 20px;">
    <div style="margin-bottom:24px;display:flex;align-items:center;gap:10px;">
      <div style="width:32px;height:32px;border-radius:8px;background:linear-gradient(135deg,#6366f1,#a855f7);display:flex;align-items:center;justify-content:center;">
        <span style="color:white;font-size:16px;">⚡</span>
      </div>
      <span style="color:#71717a;font-size:12px;font-weight:600;letter-spacing:0.05em;">LAST-MINUTE LIFE SAVER</span>
    </div>
    <div style="background:#18181b;border:1px solid #27272a;border-radius:12px;padding:24px;">
      <h2 style="color:#f1f5f9;margin:0 0 16px;font-size:18px;font-weight:600;">${title}</h2>
      ${body}
    </div>
    <div style="text-align:center;margin-top:24px;">
      <p style="color:#52525b;font-size:11px;margin:0;">
        Last-Minute Life Saver · AI Productivity Companion
      </p>
    </div>
  </div>
</body>
</html>`;
}
