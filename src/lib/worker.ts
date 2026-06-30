import { prisma } from './prisma';
import { enqueueJob, registerRepeatingJobs } from './queue';

import { dispatchDurableNotification, notifyCriticalTasks } from './notifications';
import { getEntropyLevel } from './entropy';

const POLLING_INTERVAL_MS = 5000;

// --- Memory-safe iteration over every user (cursor pagination) ---
// Without this, `prisma.user.findMany()` loads the entire user table into
// memory at once — once the app scales past a few hundred active users the
// Node process OOM-crashes (audit: "Background Worker OOM Crash Risk").
// Page through users with cursor-based pagination so memory stays bounded
// regardless of total user count.

const USER_PAGE_SIZE = 100;

/**
 * Iterate over every user in bounded pages, invoking `fn` once per user.
 * Each page is fetched only after the previous one finishes processing,
 * so at most `USER_PAGE_SIZE` users are resident in memory at any time.
 * Errors thrown by `fn` for a single user are logged but do not abort the
 * overall iteration — matching the existing per-user resilience.
 */
export async function forEachUser(fn: (user: { id: string; name: string | null; email: string }) => Promise<void>) {
  let cursor: string | undefined;
  while (true) {
    const page = await prisma.user.findMany({
      take: USER_PAGE_SIZE,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { id: 'asc' },
      select: { id: true, name: true, email: true },
    });

    if (page.length === 0) break;

    for (const user of page) {
      try {
        await fn(user);
      } catch (err: any) {
        console.error(`[Worker] per-user job failed for ${user.id}:`, err?.message || err);
      }
    }

    if (page.length < USER_PAGE_SIZE) break;
    cursor = page[page.length - 1].id;
  }
}

// --- Proactive notification: tasks due within 15 min ---

async function processDueNotifications() {
  console.log('[Worker] Running due-notification-sender');
  const upcomingTime = new Date(Date.now() + 15 * 60000);
  const tasks = await prisma.task.findMany({
    where: {
      status: 'PENDING',
      deadline: { lte: upcomingTime, gte: new Date() },
      lastAlertedAt: null,
    },
    include: { user: true }
  });

  for (const task of tasks) {
    if (task.entropyScore >= 0.7) {
      await notifyCriticalTasks(task.userId, [task as any], task.user.email);
    } else {
      const { notifyTaskEvent } = await import('./notifications');
      await notifyTaskEvent('morning', task as any, `Task due soon: ${task.title}`);
    }
    await prisma.task.update({
      where: { id: task.id },
      data: { lastAlertedAt: new Date() }
    });
  }
}

// --- Entropy score refresh ---

async function processEntropyRefresh() {
  console.log('[Worker] Running entropy-refresh');
  const tasks = await prisma.task.findMany({
    where: { status: { in: ['PENDING', 'IN_PROGRESS'] } }
  });

  for (const task of tasks) {
    const timeToDeadline = task.deadline.getTime() - Date.now();
    let newEntropy = task.entropyScore;
    
    if (timeToDeadline < 0) { // Overdue
      newEntropy = 1.0;
    } else if (timeToDeadline < 3600000) { // < 1 hr
      newEntropy = Math.min(1.0, newEntropy + 0.1);
    } else if (timeToDeadline < 86400000) { // < 24 hrs
      newEntropy = Math.min(1.0, newEntropy + 0.02);
    }
    
    if (newEntropy !== task.entropyScore) {
      await prisma.task.update({
        where: { id: task.id },
        data: { entropyScore: newEntropy }
      });
    }
  }
}

// --- Integration health probes ---

async function processProviderHealthProbe() {
  console.log('[Worker] Running provider-health-probe');
  const { 
    checkEmailHealth, 
    checkGoogleCalendarHealth, 
    probeGoogleCalendarHealth,
    checkTelegramHealth, 
    checkWhatsAppHealth 
  } = await import('./integration-health');

  const connections = await prisma.integrationConnection.findMany({
    where: { status: { not: 'not_configured' } }
  });

  for (const conn of connections) {
    let health: any = null;
    try {
      switch (conn.provider) {
        case 'email':
          health = await checkEmailHealth(conn.userId);
          break;
        case 'google_calendar':
          health = await probeGoogleCalendarHealth(conn.userId);
          break;
        case 'telegram':
          health = await checkTelegramHealth(conn.userId);
          break;
        case 'whatsapp':
          health = await checkWhatsAppHealth(conn.userId);
          break;
      }
    } catch (err: any) {
      health = { status: 'degraded', lastError: err.message };
    }

    if (health) {
      const isSuccess = health.status === 'live_verified' || health.status === 'connected';
      await prisma.integrationConnection.update({
        where: { id: conn.id },
        data: {
          status: health.status,
          lastCheckedAt: new Date(),
          lastError: health.lastError || null,
          lastSuccessAt: isSuccess ? new Date() : conn.lastSuccessAt,
          lastFailureAt: !isSuccess ? new Date() : conn.lastFailureAt,
        }
      });
    }
  }
}

// --- Sandbox health probe ---

async function processSandboxHealthProbe() {
  console.log('[Worker] Running sandbox-health-probe');
  const sandboxUrl = process.env.SANDBOX_URL || 'http://localhost:4000';
  
  try {
    const res = await fetch(`${sandboxUrl}/health`, {
      signal: AbortSignal.timeout(5000),
    });
    
    if (res.ok) {
      const data = await res.json();
      console.log(`[Worker] Sandbox healthy: ${data.activeSessions} active sessions`);
    } else {
      console.warn(`[Worker] Sandbox unhealthy: HTTP ${res.status}`);
      await prisma.auditEvent.create({
        data: {
          userId: 'system',
          action: 'sandbox_health_check',
          targetType: 'integration',
          targetId: 'sandbox',
          details: { status: 'degraded', httpStatus: res.status },
        },
      });
    }
  } catch (err: any) {
    console.warn('[Worker] Sandbox unreachable:', err.message);
    await prisma.auditEvent.create({
      data: {
        userId: 'system',
        action: 'sandbox_health_check',
        targetType: 'integration',
        targetId: 'sandbox',
        details: { status: 'unreachable', error: err.message },
      },
    });
  }
}

// --- Morning Briefing ---

async function processMorningBriefing() {
  const hour = new Date().getHours();
  if (hour < 6 || hour >= 10) {
    console.log(`[Worker] Skipping morning-briefing (hour=${hour}, runs 6-10 AM)`);
    return;
  }
  console.log('[Worker] Running morning-briefing');
  await forEachUser(async (user) => {
    try {
      const tasks = await prisma.task.findMany({
        where: { userId: user.id, status: { in: ['PENDING', 'IN_PROGRESS'] } },
        orderBy: { entropyScore: 'desc' },
      });
      
      if (tasks.length === 0) return;

      const overdue = tasks.filter(t => t.deadline < new Date());
      const urgent = tasks.filter(t => t.entropyScore >= 0.7 && t.deadline >= new Date());
      const normal = tasks.filter(t => t.entropyScore < 0.7 && t.deadline >= new Date());

      const lines: string[] = [];
      lines.push(`☀️ Good morning${user.name ? `, ${user.name}` : ''}! Here's your day:\n`);

      if (overdue.length > 0) {
        lines.push(`🔴 ${overdue.length} overdue:`);
        overdue.slice(0, 3).forEach(t => lines.push(`  • ${t.title}`));
      }
      if (urgent.length > 0) {
        lines.push(`🟠 ${urgent.length} urgent:`);
        urgent.slice(0, 3).forEach(t => {
          const hrs = Math.round((t.deadline.getTime() - Date.now()) / 3600000);
          lines.push(`  • ${t.title} (${hrs}h left)`);
        });
      }
      if (normal.length > 0) {
        lines.push(`🟢 ${normal.length} on track`);
      }

      lines.push(`\nTotal: ${tasks.length} tasks. Open your dashboard for the full plan.`);
      const briefing = lines.join('\n');

      const { sendTelegramMessage } = await import('./telegram');
      const sent = await sendTelegramMessage(user.id, briefing);
      
      if (!sent && user.email) {
        const { sendEmail, morningBriefingEmail } = await import('./email');
        const mapped = tasks.map(t => ({
          title: t.title, deadline: t.deadline,
          entropyScore: t.entropyScore, status: t.status
        }));
        const habits = await prisma.habit.findMany({ where: { userId: user.id } });
        const mappedHabits = habits.map(h => ({
          name: h.name, emoji: '📅', completedToday: false
        }));
        const emailContent = morningBriefingEmail(mapped, mappedHabits, user.name || 'there');
        await sendEmail(emailContent.subject, emailContent.html, user.email);
      }

      await prisma.auditEvent.create({
        data: {
          userId: user.id,
          action: 'morning_briefing_sent',
          targetType: 'notification',
          targetId: 'morning_briefing',
          details: { taskCount: tasks.length, overdue: overdue.length, channel: sent ? 'telegram' : 'email' },
        },
      });
    } catch (err: any) {
      console.error(`[Worker] Morning briefing failed for user ${user.id}:`, err.message);
    }
  });
}

// --- Evening Review ---

async function processEveningReview() {
  const hour = new Date().getHours();
  if (hour < 18 || hour >= 23) {
    console.log(`[Worker] Skipping evening-review (hour=${hour}, runs 6-11 PM)`);
    return;
  }
  console.log('[Worker] Running evening-review');
  await forEachUser(async (user) => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const completedTasks = await prisma.task.findMany({
        where: { userId: user.id, status: 'DONE', completedAt: { gte: today } }
      });
      
      const pendingTasks = await prisma.task.findMany({
        where: { userId: user.id, status: { in: ['PENDING', 'IN_PROGRESS'] } }
      });
      
      if (completedTasks.length === 0 && pendingTasks.length === 0) return;

      const lines: string[] = [];
      lines.push(`🌙 Evening review${user.name ? `, ${user.name}` : ''}:\n`);

      if (completedTasks.length > 0) {
        lines.push(`✅ Completed ${completedTasks.length} today:`);
        completedTasks.slice(0, 5).forEach(t => lines.push(`  • ${t.title}`));
      } else {
        lines.push(`No tasks completed today.`);
      }

      if (pendingTasks.length > 0) {
        const tomorrowDeadlines = pendingTasks.filter(t => {
          const hrs = (t.deadline.getTime() - Date.now()) / 3600000;
          return hrs > 0 && hrs < 24;
        });
        if (tomorrowDeadlines.length > 0) {
          lines.push(`\n📅 Due tomorrow:`);
          tomorrowDeadlines.forEach(t => lines.push(`  • ${t.title}`));
        }
        lines.push(`\n${pendingTasks.length} tasks remaining.`);
      }

      lines.push(`\nRest well. I'll handle the morning briefing. 🌟`);
      const review = lines.join('\n');

      const { sendTelegramMessage } = await import('./telegram');
      const sent = await sendTelegramMessage(user.id, review);
      
      if (!sent && user.email) {
        const { sendEmail, eveningReviewEmail } = await import('./email');
        const mapped = completedTasks.map(t => ({
          title: t.title, deadline: t.deadline, entropyScore: t.entropyScore, status: t.status
        }));
        const mappedPending = pendingTasks.map(t => ({
          title: t.title, deadline: t.deadline, entropyScore: t.entropyScore, status: t.status
        }));
        const habits = await prisma.habit.findMany({ where: { userId: user.id } });
        const emailContent = eveningReviewEmail(mapped, mappedPending, 0, habits.length);
        await sendEmail(emailContent.subject, emailContent.html, user.email);
      }
    } catch (err: any) {
      console.error(`[Worker] Evening review failed for user ${user.id}:`, err.message);
    }
  });
}

// --- Smart-Start Reminders ---
// "You should start X in 30 minutes to finish by your deadline"

async function processSmartStartReminders() {
  console.log('[Worker] Running smart-start-reminders');
  const now = Date.now();

  const tasks = await prisma.task.findMany({
    where: {
      status: 'PENDING',
      estimatedMins: { not: null, gt: 0 },
      deadline: { gte: new Date() },
    },
    include: { user: true },
  });

  for (const task of tasks) {
    if (!task.estimatedMins) continue;

    const bufferMins = Math.max(15, task.estimatedMins * 0.2);
    const startByTime = task.deadline.getTime() - (task.estimatedMins + bufferMins) * 60000;

    if (startByTime - now < 30 * 60000 && startByTime - now > 0) {
      const alreadySent = await prisma.auditEvent.findFirst({
        where: {
          userId: task.userId,
          action: 'smart_start_reminder',
          targetId: task.id,
          createdAt: { gte: new Date(now - 60 * 60000) },
        },
      });

      if (alreadySent) continue;

      const minsUntilStart = Math.round((startByTime - now) / 60000);
      const message = `⏱️ Heads up — you should start "${task.title}" in about ${minsUntilStart} minutes to finish by your deadline. It'll take ~${task.estimatedMins} min.`;

      const { sendTelegramMessage } = await import('./telegram');
      await sendTelegramMessage(task.userId, message);

      await prisma.auditEvent.create({
        data: {
          userId: task.userId,
          action: 'smart_start_reminder',
          targetType: 'task',
          targetId: task.id,
          details: { minsUntilStart, estimatedMins: task.estimatedMins },
        },
      });
    }
  }
}

// --- Delegated Task Follow-up Removed (Handled by Hermes) ---

// --- Scheduled Reminder ---

async function processScheduledReminder(job: any) {
  console.log('[Worker] Running scheduled-reminder');
  const payload = job.payload as { userId?: string; message?: string; channel?: string };
  if (!payload?.userId || !payload?.message) {
    console.warn('[Worker] scheduled-reminder missing userId or message');
    return;
  }

  const { userId, message, channel } = payload;

  if (channel === 'email') {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (user?.email) {
      const { sendEmail } = await import('./email');
      await sendEmail('Reminder from Calmant', `<p>${message}</p>`, user.email);
    }
  } else {
    const { sendTelegramMessage } = await import('./telegram');
    const sent = await sendTelegramMessage(userId, `⏰ ${message}`);
    if (!sent) {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (user?.email) {
        const { sendEmail } = await import('./email');
        await sendEmail('Reminder from Calmant', `<p>${message}</p>`, user.email);
      }
    }
  }
}

// --- Job Router ---

async function handleJob(job: any) {
  switch (job.name) {
    case 'due-notification-sender':
      await processDueNotifications();
      break;
    case 'entropy-refresh':
      await processEntropyRefresh();
      break;
    case 'provider-health-probe':
      await processProviderHealthProbe();
      break;
    case 'sandbox-health-probe':
      await processSandboxHealthProbe();
      break;
    case 'morning-briefing':
      await processMorningBriefing();
      break;
    case 'evening-review':
      await processEveningReview();
      break;
    case 'smart-start-reminders':
      await processSmartStartReminders();
      break;

    case 'scheduled-reminder':
      await processScheduledReminder(job);
      break;
    default:
      console.warn(`[Worker] Unknown job name: ${job.name}`);
  }
}

// --- Job Poller with exponential backoff + jitter ---

export async function pollJobs() {
  try {
    const job = await prisma.backgroundJob.findFirst({
      where: { status: 'queued', runAt: { lte: new Date() } },
      orderBy: { runAt: 'asc' }
    });

    if (!job) return;

    const lockedJob = await prisma.backgroundJob.updateMany({
      where: { id: job.id, status: 'queued' },
      data: { status: 'processing', lockedAt: new Date(), lockedBy: `worker-${process.pid}` }
    });

    if (lockedJob.count === 0) return;

    try {
      await handleJob(job);
      
      await prisma.backgroundJob.update({
        where: { id: job.id },
        data: { status: 'completed' }
      });

      const payload = job.payload as any;
      if (payload && payload.intervalMinutes) {
        const nextRun = new Date(Date.now() + payload.intervalMinutes * 60000);
        await enqueueJob(job.name, payload, nextRun);
      }
    } catch (err: any) {
      console.error(`[Worker] Job ${job.id} (${job.name}) failed:`, err.message);
      const attempts = job.attempts + 1;
      
      if (attempts >= job.maxAttempts) {
        await prisma.backgroundJob.update({
          where: { id: job.id },
          data: { status: 'failed', attempts, lastError: err.message }
        });
        await prisma.auditEvent.create({
          data: {
            userId: 'system',
            action: 'job_permanently_failed',
            targetType: 'background_job',
            targetId: job.id,
            details: { name: job.name, attempts, error: err.message },
          },
        }).catch(() => {});
      } else {
        // Exponential backoff with jitter
        const backoffMs = Math.min(
          10000 * Math.pow(2, attempts) + Math.random() * 5000,
          300000
        );
        await prisma.backgroundJob.update({
          where: { id: job.id },
          data: { status: 'queued', attempts, lastError: err.message, runAt: new Date(Date.now() + backoffMs) }
        });
      }
    }
  } catch (globalErr) {
    console.error('[Worker] Polling error:', globalErr);
  }
}

let workerInterval: NodeJS.Timeout | null = null;

export async function startWorker() {
  if (workerInterval) return;
  console.log('[Worker] Starting polling loop...');
  console.log(`[Worker] PID: ${process.pid}, Poll interval: ${POLLING_INTERVAL_MS}ms`);
  await registerRepeatingJobs();
  workerInterval = setInterval(pollJobs, POLLING_INTERVAL_MS);
}

export function stopWorker() {
  if (workerInterval) {
    clearInterval(workerInterval);
    workerInterval = null;
    console.log('[Worker] Stopped polling loop');
  }
}
