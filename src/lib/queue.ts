import { prisma } from './prisma';

/**
 * Enqueue a new background job.
 */
export async function enqueueJob(
  name: string,
  payload: any,
  runAt: Date = new Date()
) {
  return await prisma.backgroundJob.create({
    data: {
      name,
      payload,
      runAt,
      status: 'queued',
    }
  });
}

/**
 * Register repeating jobs if they don't already exist.
 * This should be called on startup.
 */
export async function registerRepeatingJobs() {
  console.log('[Queue] Registering repeating jobs in Prisma DB queue...');

  const jobs = [
    { name: 'due-notification-sender', intervalMinutes: 1 },
    { name: 'entropy-refresh', intervalMinutes: 15 },
    { name: 'morning-briefing', intervalMinutes: 60 },
    { name: 'evening-review', intervalMinutes: 60 },
    { name: 'provider-health-probe', intervalMinutes: 10 },
    { name: 'smart-start-reminders', intervalMinutes: 5 },
    { name: 'delegated-task-followup', intervalMinutes: 60 },
    { name: 'sandbox-health-probe', intervalMinutes: 5 },
  ];

  for (const job of jobs) {
    // Check if the job already exists and is pending/processing
    const existing = await prisma.backgroundJob.findFirst({
      where: {
        name: job.name,
        status: { in: ['queued', 'processing'] }
      }
    });

    if (!existing) {
      await enqueueJob(job.name, { intervalMinutes: job.intervalMinutes }, new Date(Date.now() + 1000));
      console.log(`[Queue] Registered repeating job: ${job.name}`);
    }
  }
}
