import { prisma } from '@/lib/prisma';
import { calculateEntropy } from '@/lib/entropy';
import { Task, Prisma, Subtask } from '@prisma/client';

type TaskWithSubtasks = Task & { subtasks: Subtask[] };

export class TaskService {
  private static async refreshEntropy(tasks: TaskWithSubtasks[]): Promise<TaskWithSubtasks[]> {
    const updates = tasks
      .map((task) => ({ task, entropyScore: calculateEntropy(task) }))
      .filter(({ task, entropyScore }) => Math.abs((task.entropyScore ?? 0) - entropyScore) >= 0.01);

    if (updates.length > 0) {
      await prisma.$transaction(
        updates.map(({ task, entropyScore }) =>
          prisma.task.update({
            where: { id: task.id },
            data: { entropyScore },
          })
        )
      );
    }

    return tasks.map((task) => {
      const updated = updates.find((item) => item.task.id === task.id);
      return updated ? { ...task, entropyScore: updated.entropyScore } : task;
    });
  }

  static async getUserTasks(userId: string): Promise<TaskWithSubtasks[]> {
    const tasks = await prisma.task.findMany({
      where: { userId },
      orderBy: { entropyScore: 'desc' },
      include: { subtasks: true },
    });
    const refreshed = await this.refreshEntropy(tasks);
    return refreshed.sort((a, b) => b.entropyScore - a.entropyScore);
  }

  static async getTaskById(taskId: string, userId: string): Promise<TaskWithSubtasks | null> {
    const task = await prisma.task.findFirst({
      where: { id: taskId, userId },
      include: { subtasks: true },
    });
    if (!task) return null;
    const [refreshed] = await this.refreshEntropy([task]);
    return refreshed;
  }

  static async createTask(userId: string, data: { title: string; deadline: Date; description?: string; estimatedMins?: number; priority?: number }): Promise<TaskWithSubtasks> {
    const task = await prisma.task.create({
      data: {
        userId,
        title: data.title,
        description: data.description || '',
        deadline: data.deadline,
        estimatedMins: data.estimatedMins || 60,
        priority: data.priority ?? 0.5,
        status: 'PENDING',
        snoozeCount: 0,
      },
      include: { subtasks: true },
    });
    const entropyScore = calculateEntropy(task);
    return prisma.task.update({
      where: { id: task.id },
      data: { entropyScore },
      include: { subtasks: true },
    });
  }

  static async updateTask(taskId: string, userId: string, data: Prisma.TaskUpdateInput): Promise<TaskWithSubtasks> {
    // Ensure task belongs to user
    const existing = await this.getTaskById(taskId, userId);
    if (!existing) throw new Error('Task not found');

    const task = await prisma.task.update({
      where: { id: taskId },
      data,
      include: { subtasks: true },
    });
    const entropyScore = calculateEntropy(task);
    if (Math.abs(task.entropyScore - entropyScore) < 0.01) return task;

    return prisma.task.update({
      where: { id: taskId },
      data: { entropyScore },
      include: { subtasks: true },
    });
  }

  static async deleteTask(taskId: string, userId: string): Promise<void> {
    const existing = await this.getTaskById(taskId, userId);
    if (!existing) throw new Error('Task not found');

    await prisma.task.delete({
      where: { id: taskId },
    });
  }
}
