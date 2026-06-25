import { prisma } from '@/lib/prisma';
import { Habit, HabitCompletion, Prisma } from '@prisma/client';

export class HabitService {
  static async getUserHabits(userId: string): Promise<(Habit & { completions: HabitCompletion[] })[]> {
    return prisma.habit.findMany({
      where: { userId },
      include: {
        completions: {
          orderBy: { date: 'desc' },
          take: 7, // get last 7 days of completions
        },
      },
    });
  }

  static async getHabitById(habitId: string, userId: string): Promise<(Habit & { completions: HabitCompletion[] }) | null> {
    return prisma.habit.findFirst({
      where: { id: habitId, userId },
      include: {
        completions: true,
      },
    });
  }

  static async createHabit(userId: string, data: { name: string; frequency: 'DAILY' | 'WEEKLY' | 'CUSTOM' }): Promise<Habit> {
    return prisma.habit.create({
      data: {
        userId,
        name: data.name,
        frequency: data.frequency,
        streak: 0,
      },
    });
  }

  static async deleteHabit(habitId: string, userId: string): Promise<void> {
    const existing = await this.getHabitById(habitId, userId);
    if (!existing) throw new Error('Habit not found');

    await prisma.habit.delete({
      where: { id: habitId },
    });
  }

  static async toggleHabitCompletion(habitId: string, userId: string, date: Date): Promise<HabitCompletion | { deleted: true }> {
    const existing = await this.getHabitById(habitId, userId);
    if (!existing) throw new Error('Habit not found');

    // Strip time from date to get a reliable midnight Date
    const startOfDay = new Date(date);
    startOfDay.setUTCHours(0, 0, 0, 0);

    // Check if completion exists
    const completion = await prisma.habitCompletion.findFirst({
      where: {
        habitId,
        date: {
          gte: startOfDay,
          lt: new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000),
        },
      },
    });

    if (completion) {
      await prisma.habitCompletion.delete({ where: { id: completion.id } });
      
      // Decrease streak if removing completion
      await prisma.habit.update({
        where: { id: habitId },
        data: { streak: { decrement: 1 } },
      });
      
      return { deleted: true };
    } else {
      const newCompletion = await prisma.habitCompletion.create({
        data: {
          habitId,
          date: startOfDay,
        },
      });
      
      // Increase streak
      await prisma.habit.update({
        where: { id: habitId },
        data: { streak: { increment: 1 } },
      });
      
      return newCompletion;
    }
  }
}
