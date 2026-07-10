import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProjectCellService } from '../lib/services/project-cell-service';
import { prisma } from '../lib/prisma';

vi.mock('../lib/prisma', () => ({
  prisma: {
    projectCell: {
      create: vi.fn(),
      update: vi.fn(),
      findUniqueOrThrow: vi.fn(),
    },
    projectTask: {
      create: vi.fn(),
      update: vi.fn(),
    },
    auditEvent: {
      create: vi.fn(),
    }
  }
}));

describe('ProjectCellService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('create', () => {
    it('creates a project cell and emits an event', async () => {
      const mockCell = { id: 'cell_1', userId: 'user_1', title: 'Test Cell' };
      vi.mocked(prisma.projectCell.create).mockResolvedValue(mockCell as any);
      vi.mocked(prisma.auditEvent.create).mockResolvedValue({} as any);

      const result = await ProjectCellService.create({
        userId: 'user_1',
        title: 'Test Cell',
        objective: 'Test objective'
      });

      expect(result).toEqual(mockCell);
      expect(prisma.auditEvent.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          action: 'project_cell.created',
          targetId: 'cell_1'
        })
      }));
    });
  });

  describe('getSummary', () => {
    it('returns a summary with nextAction and blockers', async () => {
      vi.mocked(prisma.projectCell.findUniqueOrThrow).mockResolvedValue({
        id: 'cell_1',
        title: 'Test',
        status: 'active',
        objective: 'Obj',
        tasks: [
          { id: 't1', status: 'completed' },
          { id: 't2', status: 'blocked' },
          { id: 't3', status: 'pending' },
          { id: 't4', status: 'pending' }
        ],
        approvals: [{ id: 'app_1', status: 'pending' }],
        artifacts: [{ id: 'art_1' }]
      } as any);

      const summary = await ProjectCellService.getSummary('cell_1');

      expect(summary.totalTasks).toBe(4);
      expect(summary.completedTasks).toBe(1);
      expect(summary.blockers.length).toBe(1);
      expect(summary.blockers[0].id).toBe('t2');
      expect(summary.nextAction?.id).toBe('t3');
      expect(summary.pendingApprovals.length).toBe(1);
      expect(summary.recentArtifacts.length).toBe(1);
    });
  });
});
