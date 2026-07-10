import { expect, describe, it, vi, beforeEach } from 'vitest';
import { z } from 'zod';
import { ToolRunner } from '../../src/lib/tools/tool-runner';
import { ToolManifest } from '../../src/lib/tools/tool-manifest';
import { ApprovalService } from '../../src/lib/agent-runtime/approval-service';
import { TaskExecutor, PipelinePausedError } from '../../src/lib/harness/executor';
import { prisma } from '../../src/lib/prisma';
import { EventService } from '../../src/lib/agent-runtime/event-service';
import { registry } from '../../src/lib/tools/registry';

vi.mock('../../src/lib/prisma', () => ({
  prisma: {
    toolCall: {
      create: vi.fn(),
      update: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
    },
    agentRun: {
      update: vi.fn(),
    },
    approvalRequest: {
      create: vi.fn(),
      update: vi.fn(),
      findUnique: vi.fn(),
    }
  }
}));

vi.mock('../../src/lib/agent-runtime/event-service', () => ({
  EventService: {
    emit: vi.fn(),
  }
}));

describe('Approval Pausing and Resuming', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const dummyManifest: ToolManifest<any, any> = {
    name: 'destructive_tool',
    version: '1.0.0',
    description: 'A tool that requires approval',
    category: 'system',
    inputSchema: z.object({ value: z.string() }),
    outputSchema: z.object({ result: z.string() }),
    riskLevel: 'destructive',
    sideEffect: 'none',
    requiresApproval: 'always',
    timeoutMs: 1000,
    handler: async (args) => {
      return { result: `Success: ${args.value}` };
    }
  };

  const context = {
    userId: 'user-1',
    runId: 'run-1',
    cwd: '/',
    env: {}
  };

  it('should pause execution and create approval request', async () => {
    // 1. ToolRunner should throw ApprovalRequiredError
    (prisma.toolCall.findFirst as any).mockResolvedValue(null);
    const mockToolCallId = 'tc-123';
    (prisma.toolCall.create as any).mockResolvedValue({ id: mockToolCallId, toolName: 'destructive_tool', args: { value: 'test' } });
    (prisma.toolCall.findUnique as any).mockResolvedValue({ id: mockToolCallId, toolName: 'destructive_tool', args: { value: 'test' }, run: { id: 'run-1', userId: 'user-1' } });
    (prisma.approvalRequest.create as any).mockResolvedValue({ id: 'app-1' });

    // Mock registry execute to use our manifest
    vi.spyOn(registry, 'execute').mockImplementation(async (name, args, ctx) => {
      return ToolRunner.execute(dummyManifest, args, ctx);
    });

    const plan = {
      goal: 'test',
      steps: [
        {
          id: 'step-1',
          description: 'test step',
          tool: 'destructive_tool',
          argumentsTemplate: { value: 'test' },
          fallbackStrategy: 'skip'
        }
      ]
    };

    const executor = new TaskExecutor();

    // 2. Executor should catch the error and pause
    await expect(executor.executePlan(plan, context)).rejects.toThrow(PipelinePausedError);

    // Verify state updates
    expect(prisma.approvalRequest.create).toHaveBeenCalled();
    expect(prisma.agentRun.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'run-1' },
      data: expect.objectContaining({
        status: "waiting_approval",
      }) // From ApprovalService
    }));
  });

  it('should resume execution if approval is approved', async () => {
    // Mock the approved tool call existing
    const approvedToolCall = { id: 'tc-123', status: 'approved' };
    (prisma.toolCall.findFirst as any).mockResolvedValue(approvedToolCall);
    (prisma.toolCall.update as any).mockResolvedValue({ ...approvedToolCall, status: 'running' });
    
    const result = await ToolRunner.execute(dummyManifest, { value: 'test' }, context);
    expect(result).toEqual({ result: 'Success: test' });

    // Check that we updated the status to running
    expect(prisma.toolCall.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'tc-123' },
      data: expect.objectContaining({
        status: 'running'
      })
    }));
  });

  it('ApprovalService.resolveApproval should update records and emit events', async () => {
    (prisma.approvalRequest.findUnique as any).mockResolvedValue({
      id: 'app-1',
      userId: 'user-1',
      status: 'pending',
      agentRunId: 'run-1'
    });
    
    (prisma.toolCall.findFirst as any).mockResolvedValue({
      id: 'tc-123'
    });

    await ApprovalService.resolveApproval('app-1', 'approve', 'user-1');

    expect(prisma.approvalRequest.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'app-1' },
      data: expect.objectContaining({ status: 'approved' })
    }));

    expect(prisma.toolCall.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'tc-123' },
      data: { status: 'approved' }
    }));
  });
});
