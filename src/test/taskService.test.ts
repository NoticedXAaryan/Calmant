import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TaskService } from '@/services/taskService';
import { prisma } from '@/lib/prisma';
import type { Task, Subtask } from '@prisma/client';

describe('TaskService Ownership', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch only tasks belonging to the specified user', async () => {
    // @ts-expect-error mock
    prisma.task.findMany.mockResolvedValue([
      { id: 't1', userId: 'user-1', title: 'Task 1', entropyScore: 0.5, deadline: new Date(), subtasks: [] },
    ]);

    // @ts-expect-error mock
    prisma.$transaction.mockResolvedValue([]);

    const tasks = await TaskService.getUserTasks('user-1');

    expect(prisma.task.findMany).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      orderBy: { entropyScore: 'desc' },
      include: { subtasks: true },
    });
    
    expect(tasks.length).toBe(1);
    expect(tasks[0].userId).toBe('user-1');
  });

  it('should throw an error if attempting to update a task not owned by the user', async () => {
    // @ts-expect-error mock
    prisma.task.findFirst.mockResolvedValue(null); // Simulate task not found or owned by someone else

    await expect(TaskService.updateTask('t1', 'user-2', { title: 'New Title' })).rejects.toThrow('Task not found');

    expect(prisma.task.findFirst).toHaveBeenCalledWith({
      where: { id: 't1', userId: 'user-2' },
      include: { subtasks: true },
    });
  });

  it('should delete task only if owned by the user', async () => {
    // @ts-expect-error mock
    prisma.task.findFirst.mockResolvedValue({ id: 't1', userId: 'user-1', entropyScore: 0.5, deadline: new Date(), subtasks: [] });
    
    // @ts-expect-error mock
    prisma.$transaction.mockResolvedValue([]);
    // @ts-expect-error mock
    prisma.task.delete.mockResolvedValue({ id: 't1' });

    await TaskService.deleteTask('t1', 'user-1');

    expect(prisma.task.delete).toHaveBeenCalledWith({
      where: { id: 't1' }
    });
  });
});
