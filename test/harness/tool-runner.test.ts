import { expect, describe, it, vi, beforeEach } from 'vitest';
import { z } from 'zod';
import { ToolRunner } from '../../src/lib/tools/tool-runner';
import { ToolManifest } from '../../src/lib/tools/tool-manifest';
import { prisma } from '../../src/lib/prisma';
import { EventService } from '../../src/lib/agent-runtime/event-service';

vi.mock('../../src/lib/prisma', () => ({
  prisma: {
    toolCall: {
      create: vi.fn(),
      update: vi.fn(),
      findFirst: vi.fn(),
    }
  }
}));

vi.mock('../../src/lib/agent-runtime/event-service', () => ({
  EventService: {
    emit: vi.fn(),
  }
}));

describe('ToolRunner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (prisma.toolCall.findFirst as any).mockResolvedValue(null);
  });

  const dummyManifest: ToolManifest<any, any> = {
    name: 'dummy_tool',
    version: '1.0.0',
    description: 'A dummy tool',
    category: 'system',
    inputSchema: z.object({ value: z.string() }),
    outputSchema: z.object({ result: z.string() }),
    riskLevel: 'read',
    sideEffect: 'none',
    requiresApproval: 'never',
    timeoutMs: 1000,
    handler: async (args) => {
      if (args.value === 'fail') throw new Error('Dummy error');
      return { result: `Success: ${args.value}` };
    }
  };

  const context = {
    userId: 'user-1',
    runId: 'run-1',
    cwd: '/',
    env: {}
  };

  it('should successfully execute a tool, log to db, and emit events', async () => {
    const mockToolCallId = 'tc-123';
    (prisma.toolCall.create as any).mockResolvedValue({ id: mockToolCallId });

    const result = await ToolRunner.execute(dummyManifest, { value: 'test' }, context);

    expect(result).toEqual({ result: 'Success: test' });
    expect(prisma.toolCall.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        toolName: 'dummy_tool',
        status: 'running',
        args: { value: 'test' }
      })
    }));
    expect(EventService.emit).toHaveBeenCalledWith(
      'run-1', 'user-1', 'tool.started', expect.any(String), 'info', expect.any(Object)
    );
    expect(prisma.toolCall.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: mockToolCallId },
      data: expect.objectContaining({
        status: 'completed',
        result: { result: 'Success: test' }
      })
    }));
    expect(EventService.emit).toHaveBeenCalledWith(
      'run-1', 'user-1', 'tool.completed', expect.any(String), 'info', expect.any(Object)
    );
  });

  it('should handle tool failures gracefully, log to db, and emit error events', async () => {
    const mockToolCallId = 'tc-456';
    (prisma.toolCall.create as any).mockResolvedValue({ id: mockToolCallId });

    await expect(ToolRunner.execute(dummyManifest, { value: 'fail' }, context)).rejects.toThrow('Dummy error');

    expect(prisma.toolCall.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: mockToolCallId },
      data: expect.objectContaining({
        status: 'failed',
        error: 'Dummy error'
      })
    }));
    expect(EventService.emit).toHaveBeenCalledWith(
      'run-1', 'user-1', 'tool.failed', expect.any(String), 'error', expect.any(Object)
    );
  });

  it('should throw on invalid arguments', async () => {
    await expect(ToolRunner.execute(dummyManifest, { wrong: 'arg' }, context))
      .rejects.toThrow(/Invalid arguments/);
      
    expect(prisma.toolCall.create).not.toHaveBeenCalled();
  });
});
