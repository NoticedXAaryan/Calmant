import { prisma } from '@/lib/prisma';
import { Task, Prisma } from '@prisma/client';

export class TaskService {
  static async getUserTasks(userId: string): Promise<Task[]> {
    return prisma.task.findMany({
      where: { userId },
      orderBy: { entropyScore: 'desc' },
      include: { subtasks: true },
    });
  }

  static async getTaskById(taskId: string, userId: string): Promise<Task | null> {
    return prisma.task.findFirst({
      where: { id: taskId, userId },
      include: { subtasks: true },
    });
  }

  static async createTask(userId: string, data: { title: string; deadline: Date; description?: string; estimatedMins?: number }): Promise<Task> {
    return prisma.task.create({
      data: {
        userId,
        title: data.title,
        description: data.description || '',
        deadline: data.deadline,
        estimatedMins: data.estimatedMins || 60,
        priority: 0.5,
        status: 'PENDING',
        snoozeCount: 0,
      },
      include: { subtasks: true },
    });
  }

  static async updateTask(taskId: string, userId: string, data: Prisma.TaskUpdateInput): Promise<Task> {
    // Ensure task belongs to user
    const existing = await this.getTaskById(taskId, userId);
    if (!existing) throw new Error('Task not found');

    return prisma.task.update({
      where: { id: taskId },
      data,
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
