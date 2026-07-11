/**
 * Queue Topology — Proper BullMQ queue setup for the Personal Company OS.
 * 
 * Replaces the Prisma-based polling queue with real BullMQ queues.
 * Each queue has a specific purpose and concurrency limit.
 * 
 * Queue Architecture:
 * ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
 * │  orchestration   │  │  tool-execution  │  │    browser      │
 * │  (goal → phases) │  │  (tool calls)    │  │  (Playwright)   │
 * │  concurrency: 2  │  │  concurrency: 5  │  │  concurrency: 1 │
 * └─────────────────┘  └─────────────────┘  └─────────────────┘
 * ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
 * │    reports       │  │   maintenance   │  │  notifications  │
 * │  (daily briefs)  │  │  (memory, sync) │  │  (alerts, msgs) │
 * │  concurrency: 1  │  │  concurrency: 1 │  │  concurrency: 3 │
 * └─────────────────┘  └─────────────────┘  └─────────────────┘
 */
import { Queue, Worker, type ConnectionOptions, type Job } from 'bullmq';

// ── Connection ───────────────────────────────────────────

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

function parseRedisUrl(url: string): ConnectionOptions {
  try {
    const parsed = new URL(url);
    return {
      host: parsed.hostname || 'localhost',
      port: parseInt(parsed.port) || 6379,
      password: parsed.password || undefined,
      username: parsed.username || undefined,
    };
  } catch {
    return { host: 'localhost', port: 6379 };
  }
}

export const redisConnection: ConnectionOptions = parseRedisUrl(REDIS_URL);

// ── Queue Definitions ────────────────────────────────────

export interface QueueConfig {
  name: string;
  concurrency: number;
  maxRetries: number;
  backoffType: 'exponential' | 'fixed';
  backoffDelay: number;
  /** Rate limit: max jobs per duration (ms) */
  rateLimit?: { max: number; duration: number };
}

export const QUEUE_CONFIGS: Record<string, QueueConfig> = {
  orchestration: {
    name: 'orchestration',
    concurrency: 2,
    maxRetries: 3,
    backoffType: 'exponential',
    backoffDelay: 5000,
  },
  'tool-execution': {
    name: 'tool-execution',
    concurrency: 5,
    maxRetries: 2,
    backoffType: 'exponential',
    backoffDelay: 2000,
  },
  browser: {
    name: 'browser',
    concurrency: 1,
    maxRetries: 2,
    backoffType: 'fixed',
    backoffDelay: 3000,
    rateLimit: { max: 10, duration: 60000 }, // 10 actions per minute
  },
  reports: {
    name: 'reports',
    concurrency: 1,
    maxRetries: 1,
    backoffType: 'fixed',
    backoffDelay: 10000,
  },
  maintenance: {
    name: 'maintenance',
    concurrency: 1,
    maxRetries: 1,
    backoffType: 'fixed',
    backoffDelay: 30000,
  },
  notifications: {
    name: 'notifications',
    concurrency: 3,
    maxRetries: 3,
    backoffType: 'exponential',
    backoffDelay: 1000,
    rateLimit: { max: 30, duration: 60000 }, // 30 per minute
  },
};

// ── Queue Instances ──────────────────────────────────────

const queues = new Map<string, Queue>();

export function getQueue(name: string): Queue {
  if (!queues.has(name)) {
    const config = QUEUE_CONFIGS[name];
    if (!config) throw new Error(`Unknown queue: ${name}`);

    const queue = new Queue(config.name, {
      connection: redisConnection,
      defaultJobOptions: {
        attempts: config.maxRetries + 1,
        backoff: {
          type: config.backoffType,
          delay: config.backoffDelay,
        },
        removeOnComplete: { age: 86400, count: 1000 }, // Keep 24h or 1000 jobs
        removeOnFail: { age: 604800, count: 5000 },    // Keep 7 days for debugging
      },
    });

    queues.set(name, queue);
  }

  return queues.get(name)!;
}

// ── Job Types ────────────────────────────────────────────

export interface OrchestrationJobData {
  type: 'run_phase' | 'run_goal' | 'resume_run';
  projectCellId?: string;
  agentRunId?: string;
  phase?: string;
  objective?: string;
  userId: string;
}

export interface ToolExecutionJobData {
  type: 'execute_tool';
  toolName: string;
  args: Record<string, any>;
  runId: string;
  toolCallId: string;
  userId: string;
}

export interface BrowserJobData {
  type: 'navigate' | 'action' | 'screenshot' | 'scrape';
  url?: string;
  action?: string;
  selector?: string;
  sessionId?: string;
  projectCellId?: string;
  userId: string;
}

export interface ReportJobData {
  type: 'morning_briefing' | 'evening_review' | 'ad_hoc';
  userId: string;
  projectCellId?: string;
}

export interface MaintenanceJobData {
  type: 'memory_consolidation' | 'entropy_refresh' | 'calendar_sync' | 'provider_health' | 'sandbox_health';
  userId?: string;
}

export interface NotificationJobData {
  type: 'send_notification';
  channel: 'telegram' | 'email' | 'in_app';
  userId: string;
  message: string;
  metadata?: Record<string, any>;
}

// ── Enqueue Helpers ──────────────────────────────────────

export async function enqueueOrchestration(data: OrchestrationJobData, opts?: { delay?: number; priority?: number }): Promise<Job> {
  const queue = getQueue('orchestration');
  return queue.add(`orch:${data.type}`, data, {
    delay: opts?.delay,
    priority: opts?.priority,
  });
}

export async function enqueueToolExecution(data: ToolExecutionJobData): Promise<Job> {
  const queue = getQueue('tool-execution');
  return queue.add(`tool:${data.toolName}`, data);
}

export async function enqueueBrowserAction(data: BrowserJobData): Promise<Job> {
  const queue = getQueue('browser');
  return queue.add(`browser:${data.type}`, data);
}

export async function enqueueReport(data: ReportJobData, opts?: { delay?: number }): Promise<Job> {
  const queue = getQueue('reports');
  return queue.add(`report:${data.type}`, data, { delay: opts?.delay });
}

export async function enqueueMaintenance(data: MaintenanceJobData): Promise<Job> {
  const queue = getQueue('maintenance');
  return queue.add(`maint:${data.type}`, data);
}

export async function enqueueNotification(data: NotificationJobData): Promise<Job> {
  const queue = getQueue('notifications');
  return queue.add(`notif:${data.channel}`, data);
}

// ── Repeating Jobs ───────────────────────────────────────

export async function registerRepeatingJobs(): Promise<void> {
  console.log('[Queue] Registering repeating jobs via BullMQ...');

  const maintenanceQueue = getQueue('maintenance');
  const reportQueue = getQueue('reports');

  // Remove old repeating jobs first
  const existingRepeatable = await maintenanceQueue.getRepeatableJobs();
  for (const job of existingRepeatable) {
    await maintenanceQueue.removeRepeatableByKey(job.key);
  }

  const existingReportRepeatable = await reportQueue.getRepeatableJobs();
  for (const job of existingReportRepeatable) {
    await reportQueue.removeRepeatableByKey(job.key);
  }

  // Maintenance jobs
  await maintenanceQueue.add('maint:entropy_refresh', { type: 'entropy_refresh' }, {
    repeat: { every: 15 * 60 * 1000 }, // Every 15 minutes
    jobId: 'repeat-entropy-refresh',
  });

  await maintenanceQueue.add('maint:memory_consolidation', { type: 'memory_consolidation' }, {
    repeat: { every: 6 * 60 * 60 * 1000 }, // Every 6 hours
    jobId: 'repeat-memory-consolidation',
  });

  await maintenanceQueue.add('maint:provider_health', { type: 'provider_health' }, {
    repeat: { every: 10 * 60 * 1000 }, // Every 10 minutes
    jobId: 'repeat-provider-health',
  });

  await maintenanceQueue.add('maint:sandbox_health', { type: 'sandbox_health' }, {
    repeat: { every: 5 * 60 * 1000 }, // Every 5 minutes
    jobId: 'repeat-sandbox-health',
  });

  await maintenanceQueue.add('maint:calendar_sync', { type: 'calendar_sync' }, {
    repeat: { every: 15 * 60 * 1000 }, // Every 15 minutes
    jobId: 'repeat-calendar-sync',
  });

  // Report jobs (morning 8am, evening 8pm — via cron)
  await reportQueue.add('report:morning_briefing', { type: 'morning_briefing', userId: '' }, {
    repeat: { pattern: '0 8 * * *' }, // 8:00 AM daily
    jobId: 'repeat-morning-briefing',
  });

  await reportQueue.add('report:evening_review', { type: 'evening_review', userId: '' }, {
    repeat: { pattern: '0 20 * * *' }, // 8:00 PM daily
    jobId: 'repeat-evening-review',
  });

  console.log('[Queue] Repeating jobs registered');
}

// ── Graceful Shutdown ────────────────────────────────────

export async function closeAllQueues(): Promise<void> {
  const closePromises = Array.from(queues.values()).map(q => q.close());
  await Promise.all(closePromises);
  queues.clear();
  console.log('[Queue] All queues closed');
}

// ── Legacy Compatibility ─────────────────────────────────
// The old worker.ts imports enqueueJob. Keep it available.

import { prisma } from './prisma';

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
