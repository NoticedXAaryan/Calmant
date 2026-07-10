import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ReportService } from '../lib/services/report-service';
import { prisma } from '../lib/prisma';

vi.mock('../lib/prisma', () => ({
  prisma: {
    goal: { findMany: vi.fn() },
    approvalRequest: { findMany: vi.fn() },
    projectTask: { findMany: vi.fn() },
    report: { create: vi.fn() },
  }
}));

describe('ReportService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generateMorningReport', () => {
    it('creates a morning report', async () => {
      vi.mocked(prisma.goal.findMany).mockResolvedValue([{ id: 'g1' }, { id: 'g2' }] as any);
      vi.mocked(prisma.approvalRequest.findMany).mockResolvedValue([{ id: 'a1' }] as any);
      vi.mocked(prisma.projectTask.findMany).mockResolvedValue([
        { id: 't1', title: 'Task 1' },
        { id: 't2', title: 'Task 2' }
      ] as any);
      
      const mockReport = { id: 'r1', type: 'morning' };
      vi.mocked(prisma.report.create).mockResolvedValue(mockReport as any);

      const result = await ReportService.generateMorningReport('user_1');

      expect(result.id).toBe('r1');
      expect(prisma.report.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          type: 'morning',
          userId: 'user_1',
          data: expect.objectContaining({
            activeGoalsCount: 2,
            pendingApprovalsCount: 1,
            plannedTasksCount: 2,
          })
        })
      }));
    });
  });

  describe('generateEveningReport', () => {
    it('creates an evening report', async () => {
      vi.mocked(prisma.projectTask.findMany).mockImplementation(async ({ where }: any) => {
        if (where.status === 'completed') return [{ id: 't1', title: 'Done 1' }];
        if (where.status === 'blocked') return [{ id: 't2', title: 'Blocked 1' }];
        if (where.status === 'pending') return [{ id: 't3', title: 'Next 1' }];
        return [];
      });

      const mockReport = { id: 'r2', type: 'evening' };
      vi.mocked(prisma.report.create).mockResolvedValue(mockReport as any);

      const result = await ReportService.generateEveningReport('user_1');

      expect(result.id).toBe('r2');
      expect(prisma.report.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          type: 'evening',
          data: expect.objectContaining({
            completedTasksCount: 1,
            blockedTasksCount: 1,
          })
        })
      }));
    });
  });
});
