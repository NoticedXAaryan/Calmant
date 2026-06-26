import { prisma } from './prisma';
import { enqueueJob, registerRepeatingJobs } from './queue';

import { dispatchDurableNotification, notifyCriticalTasks } from './notifications';
import { getEntropyLevel } from './entropy';

const POLLING_INTERVAL_MS = 5000;

async function processDueNotifications() {
  console.log('[Worker] Running due-notification-sender');
  // 1. Find all pending tasks due within the next 15 minutes that haven't been alerted
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
      // Send a standard reminder or push to in-app
      const { notifyTaskEvent } = await import('./notifications');
      await notifyTaskEvent('morning', task as any, `Task due soon: ${task.title}`);
    }
    // Update lastAlertedAt
    await prisma.task.update({
      where: { id: task.id },
      data: { lastAlertedAt: new Date() }
    });
  }
}

async function processEntropyRefresh() {
  console.log('[Worker] Running entropy-refresh');
  // Find tasks that are pending or in progress
  const tasks = await prisma.task.findMany({
    where: { status: { in: ['PENDING', 'IN_PROGRESS'] } }
  });

  for (const task of tasks) {
    // Basic entropy increase based on deadline proximity
    const timeToDeadline = task.deadline.getTime() - Date.now();
    let newEntropy = task.entropyScore;
    
    if (timeToDeadline < 3600000) { // < 1 hr
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

async function processProviderHealthProbe() {
  console.log('[Worker] Running provider-health-probe');
  // Dynamic import to avoid circular dependencies at boot
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
    case 'morning-briefing':
    case 'evening-review':
      console.log(`[Worker] Running ${job.name} (stub)`);
      break;
    default:
      console.warn(`[Worker] Unknown job name: ${job.name}`);
  }
}

export async function pollJobs() {
  try {
    // 1. Fetch one job that is due
    const job = await prisma.backgroundJob.findFirst({
      where: {
        status: 'queued',
        runAt: { lte: new Date() }
      },
      orderBy: { runAt: 'asc' }
    });

    if (!job) return;

    // 2. Lock the job (set to processing)
    const lockedJob = await prisma.backgroundJob.updateMany({
      where: {
        id: job.id,
        status: 'queued'
      },
      data: {
        status: 'processing',
        lockedAt: new Date(),
        lockedBy: 'worker-1' // in a real distributed setup, use a unique worker ID
      }
    });

    if (lockedJob.count === 0) {
      // Another worker picked it up
      return;
    }

    // 3. Execute
    try {
      await handleJob(job);
      
      // 4. Mark success
      await prisma.backgroundJob.update({
        where: { id: job.id },
        data: { status: 'completed' }
      });

      // 5. If repeating, enqueue the next run
      const payload = job.payload as any;
      if (payload && payload.intervalMinutes) {
        const nextRun = new Date(Date.now() + payload.intervalMinutes * 60000);
        await enqueueJob(job.name, payload, nextRun);
      }
    } catch (err: any) {
      console.error(`[Worker] Job ${job.id} failed:`, err);
      // Mark failed or retry
      const attempts = job.attempts + 1;
      if (attempts >= job.maxAttempts) {
        await prisma.backgroundJob.update({
          where: { id: job.id },
          data: { status: 'failed', attempts, lastError: err.message }
        });
      } else {
        // Backoff and retry
        const backoffMs = attempts * 10000;
        await prisma.backgroundJob.update({
          where: { id: job.id },
          data: { 
            status: 'queued', 
            attempts, 
            lastError: err.message,
            runAt: new Date(Date.now() + backoffMs)
          }
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
