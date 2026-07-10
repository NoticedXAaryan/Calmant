import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CommandCenterService } from '../lib/services/command-center-service';
import { prisma } from '../lib/prisma';
import { ProjectCellService } from '../lib/services/project-cell-service';

vi.mock('../lib/prisma', () => ({
  prisma: {
    goal: {
      create: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
    },
    projectCell: {
      findMany: vi.fn(),
    },
    approvalRequest: {
      findMany: vi.fn(),
    },
    report: {
      findFirst: vi.fn(),
    },
    auditEvent: {
      create: vi.fn(),
    }
  }
}));

vi.mock('../lib/services/project-cell-service', () => ({
  ProjectCellService: {
    create: vi.fn(),
    updateStatus: vi.fn(),
  }
}));

describe('CommandCenterService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createObjective', () => {
    it('creates a goal and a project cell', async () => {
      vi.mocked(prisma.goal.create).mockResolvedValue({ id: 'goal_1' } as any);
      vi.mocked(ProjectCellService.create).mockResolvedValue({ id: 'cell_1' } as any);

      const result = await CommandCenterService.createObjective('user_1', 'Test Goal', 'Test Obj');

      expect(result.goal.id).toBe('goal_1');
      expect(result.projectCell.id).toBe('cell_1');
      expect(prisma.goal.create).toHaveBeenCalled();
      expect(ProjectCellService.create).toHaveBeenCalledWith({
        userId: 'user_1',
        title: 'Test Goal',
        objective: 'Test Obj',
        goalId: 'goal_1'
      });
      expect(prisma.auditEvent.create).toHaveBeenCalled();
    });
  });

  describe('getToday', () => {
    it('returns aggregated today view', async () => {
      vi.mocked(prisma.goal.findMany).mockResolvedValue([{ id: 'g1' }] as any);
      vi.mocked(prisma.projectCell.findMany).mockResolvedValue([
        { id: 'c1', tasks: [{ status: 'blocked' }] }
      ] as any);
      vi.mocked(prisma.approvalRequest.findMany).mockResolvedValue([{ id: 'a1' }] as any);
      vi.mocked(prisma.report.findFirst).mockResolvedValue({ id: 'r1' } as any);

      const today = await CommandCenterService.getToday('user_1');

      expect(today.activeGoals.length).toBe(1);
      expect(today.activeProjectCells.length).toBe(1);
      expect(today.blockers.length).toBe(1);
      expect(today.approvals.length).toBe(1);
      expect(today.reportPreview?.id).toBe('r1');
    });
  });

  describe('pause', () => {
    it('pauses goal and its project cells', async () => {
      vi.mocked(prisma.projectCell.findMany).mockResolvedValue([{ id: 'c1' }] as any);

      await CommandCenterService.pause('user_1', 'goal_1');

      expect(prisma.goal.update).toHaveBeenCalledWith({
        where: { id: 'goal_1', userId: 'user_1' },
        data: { status: 'paused' }
      });
      expect(ProjectCellService.updateStatus).toHaveBeenCalledWith('c1', 'paused');
    });
  });
});
