import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRecordService } from '../lib/services/memory-record-service';
import { prisma } from '../lib/prisma';
import type { MemoryRecord } from '@prisma/client';

// Mock Prisma
vi.mock('../lib/prisma', () => ({
  prisma: {
    memoryRecord: {
      create: vi.fn(),
      update: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      findMany: vi.fn(),
    }
  }
}));

describe('MemoryRecordService', () => {
  const mockUserId = 'user_123';
  const mockRecord: MemoryRecord = {
    id: 'mem_1',
    userId: mockUserId,
    projectCellId: null,
    type: 'fact',
    content: 'User likes concise reports',
    confidence: 1.0,
    status: 'proposed',
    supersededById: null,
    sourceRunId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('create', () => {
    it('creates a proposed memory record', async () => {
      vi.mocked(prisma.memoryRecord.create).mockResolvedValue(mockRecord);

      const result = await MemoryRecordService.create({
        userId: mockUserId,
        type: 'fact',
        content: 'User likes concise reports',
      });

      expect(result).toEqual(mockRecord);
      expect(prisma.memoryRecord.create).toHaveBeenCalledWith({
        data: {
          userId: mockUserId,
          projectCellId: undefined,
          type: 'fact',
          content: 'User likes concise reports',
          confidence: 1.0,
          status: 'proposed',
          sourceRunId: undefined,
        }
      });
    });
  });

  describe('trust', () => {
    it('updates status to trusted', async () => {
      const trustedRecord = { ...mockRecord, status: 'trusted' };
      vi.mocked(prisma.memoryRecord.update).mockResolvedValue(trustedRecord);

      const result = await MemoryRecordService.trust('mem_1');

      expect(result.status).toBe('trusted');
      expect(prisma.memoryRecord.update).toHaveBeenCalledWith({
        where: { id: 'mem_1' },
        data: { status: 'trusted' },
      });
    });
  });

  describe('reject', () => {
    it('updates status to rejected', async () => {
      const rejectedRecord = { ...mockRecord, status: 'rejected' };
      vi.mocked(prisma.memoryRecord.update).mockResolvedValue(rejectedRecord);

      const result = await MemoryRecordService.reject('mem_1');

      expect(result.status).toBe('rejected');
      expect(prisma.memoryRecord.update).toHaveBeenCalledWith({
        where: { id: 'mem_1' },
        data: { status: 'rejected' },
      });
    });
  });

  describe('correct', () => {
    it('creates a new trusted memory and supersedes the old one', async () => {
      const newRecord = { ...mockRecord, id: 'mem_2', content: 'User likes extremely concise reports', status: 'trusted' };
      
      vi.mocked(prisma.memoryRecord.findUniqueOrThrow).mockResolvedValue(mockRecord);
      vi.mocked(prisma.memoryRecord.create).mockResolvedValue(newRecord);
      vi.mocked(prisma.memoryRecord.update).mockResolvedValue({ ...mockRecord, status: 'superseded', supersededById: 'mem_2' });

      const result = await MemoryRecordService.correct('mem_1', 'User likes extremely concise reports');

      expect(result.old.status).toBe('superseded');
      expect(result.new.id).toBe('mem_2');
      expect(prisma.memoryRecord.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ content: 'User likes extremely concise reports', status: 'trusted' })
      }));
      expect(prisma.memoryRecord.update).toHaveBeenCalledWith({
        where: { id: 'mem_1' },
        data: { status: 'superseded', supersededById: 'mem_2' },
      });
    });
  });
});
