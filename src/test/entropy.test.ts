import { describe, it, expect } from 'vitest';
import { calculateEntropy, getEntropyLevel } from '@/lib/entropy';
import type { Task } from '@prisma/client';

describe('Entropy Calculation', () => {
  it('should return critical entropy (0.99) for overdue tasks', () => {
    const task = {
      id: '1',
      deadline: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago
      estimatedMins: 60,
      snoozeCount: 0,
      priority: 0.5,
      createdAt: new Date(),
      updatedAt: new Date(),
      title: 'Task',
      userId: 'u1',
      description: null,
      context: null,
      status: 'pending',
      completedAt: null,
      delegatedToId: null,
      delegatedStatus: null,
    } as unknown as Task;

    expect(calculateEntropy(task)).toBe(0.99);
  });

  it('should calculate high entropy when there is no slack', () => {
    const task = {
      id: '2',
      deadline: new Date(Date.now() + 1000 * 60 * 30), // 30 mins left
      estimatedMins: 60, // requires 60 mins
      snoozeCount: 0,
      priority: 0.5,
      createdAt: new Date(),
      updatedAt: new Date(),
      title: 'Task',
      userId: 'u1',
      description: null,
      context: null,
      status: 'pending',
      completedAt: null,
      delegatedToId: null,
      delegatedStatus: null,
    } as unknown as Task;

    const entropy = calculateEntropy(task);
    expect(entropy).toBeGreaterThan(0.8);
    expect(getEntropyLevel(entropy)).toBe('critical');
  });

  it('should add penalty for multiple snoozes', () => {
    const task = {
      id: '3',
      deadline: new Date(Date.now() + 1000 * 60 * 60 * 24), // 1 day left
      estimatedMins: 60,
      snoozeCount: 3, // Snoozed 3 times
      priority: 0.5,
      createdAt: new Date(),
      updatedAt: new Date(),
      title: 'Task',
      userId: 'u1',
      description: null,
      context: null,
      status: 'pending',
      completedAt: null,
      delegatedToId: null,
      delegatedStatus: null,
    } as unknown as Task;

    const entropySnoozed = calculateEntropy(task);
    const entropyNormal = calculateEntropy({ ...task, snoozeCount: 0 } as unknown as Task);
    
    expect(entropySnoozed).toBeGreaterThan(entropyNormal);
  });
});
