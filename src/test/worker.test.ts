import { describe, it, expect, vi, beforeEach } from 'vitest';
import { pollJobs } from '@/lib/worker';
import { prisma } from '@/lib/prisma';
import * as queue from '@/lib/queue';

vi.mock('@/lib/queue', () => ({
  enqueueJob: vi.fn(),
  registerRepeatingJobs: vi.fn(),
}));

// Mock the internal handlers
vi.mock('@/lib/notifications', () => ({
  dispatchDurableNotification: vi.fn(),
  notifyCriticalTasks: vi.fn(),
  notifyTaskEvent: vi.fn(),
}));

describe('Worker Polling Logic', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should process a due job and mark it as completed', async () => {
    const mockJob = {
      id: 'job-1',
      name: 'morning-briefing',
      payload: {},
      runAt: new Date(Date.now() - 1000), // In the past
      status: 'queued',
      attempts: 0,
      maxAttempts: 3,
    };

    // @ts-expect-error mock
    prisma.backgroundJob.findFirst.mockResolvedValue(mockJob);
    // @ts-expect-error mock
    prisma.backgroundJob.updateMany.mockResolvedValue({ count: 1 }); // Successfully locked

    await pollJobs();

    // Verify it searched for jobs
    expect(prisma.backgroundJob.findFirst).toHaveBeenCalled();
    
    // Verify it locked the job
    expect(prisma.backgroundJob.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'job-1', status: 'queued' },
        data: expect.objectContaining({ status: 'processing' })
      })
    );

    // Verify it updated the job to completed
    expect(prisma.backgroundJob.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'job-1' },
        data: { status: 'completed' }
      })
    );
  });

  it('should retry a failed job and increment attempts', async () => {
    const mockJob = {
      id: 'job-2',
      name: 'error-prone-job', // Not in the switch, will just console warn, but let's say the handler throws.
      payload: {},
      runAt: new Date(Date.now() - 1000),
      status: 'queued',
      attempts: 1,
      maxAttempts: 3,
    };

    // @ts-expect-error mock
    prisma.backgroundJob.findFirst.mockResolvedValue(mockJob);
    // @ts-expect-error mock
    prisma.backgroundJob.updateMany.mockResolvedValue({ count: 1 });

    // Mock prisma.backgroundJob.update to throw an error during execution?
    // Wait, handleJob doesn't throw for unknown jobs, it just warns.
    // To test failure, we need `handleJob` to fail.
    // We can just spy on prisma to throw an error inside the try block (e.g., when it tries to mark complete)
    // or we can test `maxAttempts`. Let's assume `handleJob` throws if we mock it, or we can mock prisma.task.findMany which is used by due-notification-sender.
    
    const jobThatFails = { ...mockJob, name: 'due-notification-sender' };
    // @ts-expect-error mock
    prisma.backgroundJob.findFirst.mockResolvedValue(jobThatFails);
    // @ts-expect-error mock
    prisma.task.findMany.mockRejectedValue(new Error('DB connection lost'));

    await pollJobs();

    // It should catch the error and update status to queued with backoff
    expect(prisma.backgroundJob.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'job-2' },
        data: expect.objectContaining({
          status: 'queued',
          attempts: 2,
          lastError: 'DB connection lost'
        })
      })
    );
  });

  it('should mark job as failed if maxAttempts reached', async () => {
    const mockJob = {
      id: 'job-3',
      name: 'due-notification-sender',
      payload: {},
      runAt: new Date(Date.now() - 1000),
      status: 'queued',
      attempts: 2,
      maxAttempts: 3,
    };

    // @ts-expect-error mock
    prisma.backgroundJob.findFirst.mockResolvedValue(mockJob);
    // @ts-expect-error mock
    prisma.backgroundJob.updateMany.mockResolvedValue({ count: 1 });
    // @ts-expect-error mock
    prisma.task.findMany.mockRejectedValue(new Error('DB connection lost'));

    await pollJobs();

    // It should mark as failed because attempts (2) + 1 >= maxAttempts (3)
    expect(prisma.backgroundJob.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'job-3' },
        data: expect.objectContaining({
          status: 'failed',
          attempts: 3
        })
      })
    );
  });
});
