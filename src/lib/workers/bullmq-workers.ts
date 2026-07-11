/**
 * BullMQ Workers — Process jobs from the queue topology.
 * 
 * Each worker handles a specific queue and delegates to the appropriate
 * service. Workers are started by the main process and gracefully shut
 * down on SIGTERM/SIGINT.
 */
import { Worker, type Job } from 'bullmq';
import {
  redisConnection,
  QUEUE_CONFIGS,
  type OrchestrationJobData,
  type ToolExecutionJobData,
  type BrowserJobData,
  type ReportJobData,
  type MaintenanceJobData,
  type NotificationJobData,
} from '../queue';

// ── Worker Registry ──────────────────────────────────────

const workers: Worker[] = [];

// ── Orchestration Worker ─────────────────────────────────

function createOrchestrationWorker(): Worker {
  const config = QUEUE_CONFIGS.orchestration;

  return new Worker<OrchestrationJobData>(
    config.name,
    async (job: Job<OrchestrationJobData>) => {
      console.log(`[Worker:orchestration] Processing ${job.name} (${job.id})`);

      switch (job.data.type) {
        case 'run_phase': {
          const { ExecutionOrchestrator } = await import('../execution/orchestrator');
          await ExecutionOrchestrator.runPhase(
            job.data.projectCellId!,
            job.data.agentRunId,
          );
          break;
        }

        case 'run_goal': {
          const { ExecutionOrchestrator } = await import('../execution/orchestrator');
          await ExecutionOrchestrator.startGoal(
            job.data.projectCellId!,
            job.data.userId,
          );
          break;
        }

        case 'resume_run': {
          const { AgentPipeline } = await import('../harness/pipeline');
          const pipeline = new AgentPipeline();
          await pipeline.resume(job.data.agentRunId!, {
            apiKey: process.env.OPENROUTER_API_KEY || process.env.GEMINI_API_KEY || '',
          });
          break;
        }

        default:
          console.warn(`[Worker:orchestration] Unknown job type: ${job.data.type}`);
      }
    },
    {
      connection: redisConnection,
      concurrency: config.concurrency,
      limiter: config.rateLimit ? {
        max: config.rateLimit.max,
        duration: config.rateLimit.duration,
      } : undefined,
    },
  );
}

// ── Tool Execution Worker ────────────────────────────────

function createToolExecutionWorker(): Worker {
  const config = QUEUE_CONFIGS['tool-execution'];

  return new Worker<ToolExecutionJobData>(
    config.name,
    async (job: Job<ToolExecutionJobData>) => {
      console.log(`[Worker:tool-execution] Processing ${job.data.toolName} (${job.id})`);

      const { registry } = await import('../tools/registry');
      const result = await registry.execute(job.data.toolName, job.data.args, {
        userId: job.data.userId,
        runId: job.data.runId,
        cwd: process.cwd(),
        env: process.env as Record<string, string>,
      });

      // Update the tool call record
      const { prisma } = await import('../prisma');
      await prisma.toolCall.update({
        where: { id: job.data.toolCallId },
        data: {
          result: result as any,
          status: 'completed',
          completedAt: new Date(),
        },
      });

      return result;
    },
    {
      connection: redisConnection,
      concurrency: config.concurrency,
    },
  );
}

// ── Browser Worker ───────────────────────────────────────

function createBrowserWorker(): Worker {
  const config = QUEUE_CONFIGS.browser;

  return new Worker<BrowserJobData>(
    config.name,
    async (job: Job<BrowserJobData>) => {
      console.log(`[Worker:browser] Processing ${job.data.type} (${job.id})`);

      const sandboxUrl = process.env.SANDBOX_URL || 'http://sandbox:4000';

      switch (job.data.type) {
        case 'navigate': {
          const res = await fetch(`${sandboxUrl}/navigate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: job.data.url, sessionId: job.data.sessionId }),
          });
          return await res.json();
        }

        case 'screenshot': {
          const res = await fetch(`${sandboxUrl}/screenshot`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sessionId: job.data.sessionId }),
          });
          return await res.json();
        }

        case 'action': {
          const res = await fetch(`${sandboxUrl}/action`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: job.data.action,
              selector: job.data.selector,
              sessionId: job.data.sessionId,
            }),
          });
          return await res.json();
        }

        case 'scrape': {
          const res = await fetch(`${sandboxUrl}/scrape`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: job.data.url, sessionId: job.data.sessionId }),
          });
          return await res.json();
        }
      }
    },
    {
      connection: redisConnection,
      concurrency: config.concurrency,
      limiter: config.rateLimit ? {
        max: config.rateLimit.max,
        duration: config.rateLimit.duration,
      } : undefined,
    },
  );
}

// ── Report Worker ────────────────────────────────────────

function createReportWorker(): Worker {
  const config = QUEUE_CONFIGS.reports;

  return new Worker<ReportJobData>(
    config.name,
    async (job: Job<ReportJobData>) => {
      console.log(`[Worker:reports] Processing ${job.data.type} (${job.id})`);

      const { prisma } = await import('../prisma');

      // Get the owner (for repeating jobs that don't have a userId)
      let userId = job.data.userId;
      if (!userId) {
        const owner = await prisma.user.findFirst({ select: { id: true } });
        if (!owner) {
          console.warn('[Worker:reports] No owner found, skipping report');
          return;
        }
        userId = owner.id;
      }

      switch (job.data.type) {
        case 'morning_briefing': {
          const { ReportService } = await import('../services/report-service');
          await ReportService.generateMorningReport(userId);
          break;
        }

        case 'evening_review': {
          const { ReportService } = await import('../services/report-service');
          await ReportService.generateEveningReport(userId);
          break;
        }

        case 'ad_hoc': {
          // Ad-hoc reports are generated inline
          console.log(`[Worker:reports] Ad-hoc report requested for ${userId}`);
          break;
        }
      }
    },
    {
      connection: redisConnection,
      concurrency: config.concurrency,
    },
  );
}

// ── Maintenance Worker ───────────────────────────────────

function createMaintenanceWorker(): Worker {
  const config = QUEUE_CONFIGS.maintenance;

  return new Worker<MaintenanceJobData>(
    config.name,
    async (job: Job<MaintenanceJobData>) => {
      console.log(`[Worker:maintenance] Processing ${job.data.type} (${job.id})`);

      switch (job.data.type) {
        case 'memory_consolidation': {
          const { MemoryManager } = await import('../memory/memory-manager');
          const result = await MemoryManager.consolidate();
          console.log(`[Worker:maintenance] Memory consolidation: ${JSON.stringify(result)}`);
          break;
        }

        case 'entropy_refresh': {
          // Import the existing entropy refresh logic
          const { prisma } = await import('../prisma');
          const tasks = await prisma.task.findMany({
            where: { status: { in: ['PENDING', 'IN_PROGRESS'] } },
          });

          for (const task of tasks) {
            const timeToDeadline = task.deadline.getTime() - Date.now();
            let newEntropy = task.entropyScore;

            if (timeToDeadline < 0) {
              newEntropy = 1.0;
            } else if (timeToDeadline < 3600000) {
              newEntropy = Math.min(1.0, newEntropy + 0.1);
            } else if (timeToDeadline < 86400000) {
              newEntropy = Math.min(1.0, newEntropy + 0.02);
            }

            if (newEntropy !== task.entropyScore) {
              await prisma.task.update({
                where: { id: task.id },
                data: { entropyScore: newEntropy },
              });
            }
          }
          break;
        }

        case 'provider_health': {
          try {
            const { providerHealthService } = await import('../services/provider-health');
            await providerHealthService.probeAllProviders();
          } catch (err) {
            console.warn('[Worker:maintenance] Provider health probe failed:', err);
          }
          break;
        }

        case 'sandbox_health': {
          try {
            const sandboxUrl = process.env.SANDBOX_URL || 'http://sandbox:4000';
            const res = await fetch(`${sandboxUrl}/health`, { signal: AbortSignal.timeout(5000) });
            if (!res.ok) {
              console.warn(`[Worker:maintenance] Sandbox unhealthy: ${res.status}`);
            }
          } catch (err) {
            console.warn('[Worker:maintenance] Sandbox health check failed:', err);
          }
          break;
        }

        case 'calendar_sync': {
          try {
            const { calendarSyncService } = await import('../services/calendar-sync');
            await calendarSyncService.syncAll();
          } catch (err) {
            console.warn('[Worker:maintenance] Calendar sync failed:', err);
          }
          break;
        }
      }
    },
    {
      connection: redisConnection,
      concurrency: config.concurrency,
    },
  );
}

// ── Notification Worker ──────────────────────────────────

function createNotificationWorker(): Worker {
  const config = QUEUE_CONFIGS.notifications;

  return new Worker<NotificationJobData>(
    config.name,
    async (job: Job<NotificationJobData>) => {
      console.log(`[Worker:notifications] Processing ${job.data.channel} notification (${job.id})`);

      switch (job.data.channel) {
        case 'telegram': {
          try {
            const { sendTelegramMessage } = await import('../telegram/telegram-service');
            await sendTelegramMessage(job.data.message, job.data.metadata);
          } catch (err) {
            console.error('[Worker:notifications] Telegram send failed:', err);
            throw err; // Retry
          }
          break;
        }

        case 'email': {
          try {
            const { sendEmail } = await import('../services/email-service');
            await sendEmail({
              to: process.env.USER_EMAIL || '',
              subject: 'Calmant Notification',
              text: job.data.message,
            });
          } catch (err) {
            console.error('[Worker:notifications] Email send failed:', err);
            throw err;
          }
          break;
        }

        case 'in_app': {
          const { prisma } = await import('../prisma');
          await prisma.inAppNotification.create({
            data: {
              userId: job.data.userId,
              type: 'agent',
              title: 'Agent Update',
              message: job.data.message,
            },
          });
          break;
        }
      }
    },
    {
      connection: redisConnection,
      concurrency: config.concurrency,
      limiter: config.rateLimit ? {
        max: config.rateLimit.max,
        duration: config.rateLimit.duration,
      } : undefined,
    },
  );
}

// ── Lifecycle ────────────────────────────────────────────

/**
 * Start all workers. Call this once on process startup.
 */
export function startWorkers(): void {
  console.log('[Workers] Starting all BullMQ workers...');

  workers.push(createOrchestrationWorker());
  workers.push(createToolExecutionWorker());
  workers.push(createBrowserWorker());
  workers.push(createReportWorker());
  workers.push(createMaintenanceWorker());
  workers.push(createNotificationWorker());

  // Error handlers
  for (const worker of workers) {
    worker.on('failed', (job, err) => {
      console.error(`[Worker:${worker.name}] Job ${job?.id} failed:`, err.message);
    });

    worker.on('completed', (job) => {
      console.log(`[Worker:${worker.name}] Job ${job.id} completed`);
    });

    worker.on('error', (err) => {
      console.error(`[Worker:${worker.name}] Worker error:`, err.message);
    });
  }

  console.log(`[Workers] ${workers.length} workers started`);
}

/**
 * Gracefully shut down all workers. Call this on SIGTERM/SIGINT.
 */
export async function stopWorkers(): Promise<void> {
  console.log('[Workers] Shutting down workers...');
  const closePromises = workers.map(w => w.close());
  await Promise.all(closePromises);
  workers.length = 0;
  console.log('[Workers] All workers stopped');
}
