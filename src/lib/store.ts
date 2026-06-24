// In-Memory Data Store
// Source: Architecture.md → Data Store, 04-context-and-skills → Skill 2
// Referenced by: T-004, every API route
//
// Abstract interface allows future swap to Firestore without code changes.
// RULE: Never access the Map directly in API routes. Always use store.xxx().

import type { Task, Subtask, ScheduleBlock, Habit, AgentMemory } from './types';
import { generateId } from './api-helpers';
import { calculateEntropy } from './entropy';

// --- Store Interface ---

export interface DataStore {
  // Tasks
  getTasks(userId: string): Promise<Task[]>;
  getTask(taskId: string): Promise<Task | null>;
  createTask(task: Omit<Task, 'id' | 'entropyScore'>): Promise<Task>;
  updateTask(taskId: string, updates: Partial<Task>): Promise<Task | null>;
  deleteTask(taskId: string): Promise<boolean>;

  // Schedule Blocks
  getScheduleBlocks(userId: string, startDate?: string, endDate?: string): Promise<ScheduleBlock[]>;
  createScheduleBlock(block: Omit<ScheduleBlock, 'id'>): Promise<ScheduleBlock>;
  updateScheduleBlock(blockId: string, updates: Partial<ScheduleBlock>): Promise<ScheduleBlock | null>;

  // Habits
  getHabits(userId: string): Promise<Habit[]>;
  getHabit(habitId: string): Promise<Habit | null>;
  createHabit(habit: Omit<Habit, 'id'>): Promise<Habit>;
  updateHabit(habitId: string, updates: Partial<Habit>): Promise<Habit | null>;
  deleteHabit(habitId: string): Promise<boolean>;

  // Agent Memory
  getMemories(userId: string): Promise<AgentMemory[]>;
  createMemory(memory: Omit<AgentMemory, 'id'>): Promise<AgentMemory>;
}

// --- In-Memory Implementation ---

class InMemoryStore implements DataStore {
  private tasks = new Map<string, Task>();
  private scheduleBlocks = new Map<string, ScheduleBlock>();
  private habits = new Map<string, Habit>();
  private memories = new Map<string, AgentMemory>();

  // --- Tasks ---

  async getTasks(userId: string): Promise<Task[]> {
    const userTasks = Array.from(this.tasks.values())
      .filter(t => t.userId === userId)
      .map(t => ({
        ...t,
        entropyScore: calculateEntropy(t),
      }))
      .sort((a, b) => b.entropyScore - a.entropyScore); // Highest entropy first
    return userTasks;
  }

  async getTask(taskId: string): Promise<Task | null> {
    const task = this.tasks.get(taskId);
    if (!task) return null;
    return {
      ...task,
      entropyScore: calculateEntropy(task),
    };
  }

  async createTask(input: Omit<Task, 'id' | 'entropyScore'>): Promise<Task> {
    const task: Task = {
      ...input,
      id: generateId(),
      entropyScore: 0, // Will be calculated on read
    };
    task.entropyScore = calculateEntropy(task);
    this.tasks.set(task.id, task);
    return task;
  }

  async updateTask(taskId: string, updates: Partial<Task>): Promise<Task | null> {
    const existing = this.tasks.get(taskId);
    if (!existing) return null;
    
    const updated: Task = {
      ...existing,
      ...updates,
      id: taskId, // Prevent id override
    };
    updated.entropyScore = calculateEntropy(updated);
    this.tasks.set(taskId, updated);
    return updated;
  }

  async deleteTask(taskId: string): Promise<boolean> {
    return this.tasks.delete(taskId);
  }

  // --- Schedule Blocks ---

  async getScheduleBlocks(userId: string, startDate?: string, endDate?: string): Promise<ScheduleBlock[]> {
    let blocks = Array.from(this.scheduleBlocks.values())
      .filter(b => b.userId === userId);
    
    if (startDate) {
      const start = new Date(startDate).getTime();
      blocks = blocks.filter(b => new Date(b.startTime).getTime() >= start);
    }
    if (endDate) {
      const end = new Date(endDate).getTime();
      blocks = blocks.filter(b => new Date(b.endTime).getTime() <= end);
    }
    
    return blocks.sort((a, b) => 
      new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    );
  }

  async createScheduleBlock(input: Omit<ScheduleBlock, 'id'>): Promise<ScheduleBlock> {
    const block: ScheduleBlock = {
      ...input,
      id: generateId(),
    };
    this.scheduleBlocks.set(block.id, block);
    return block;
  }

  async updateScheduleBlock(blockId: string, updates: Partial<ScheduleBlock>): Promise<ScheduleBlock | null> {
    const existing = this.scheduleBlocks.get(blockId);
    if (!existing) return null;
    const updated: ScheduleBlock = { ...existing, ...updates, id: blockId };
    this.scheduleBlocks.set(blockId, updated);
    return updated;
  }

  // --- Habits ---

  async getHabits(userId: string): Promise<Habit[]> {
    return Array.from(this.habits.values())
      .filter(h => h.userId === userId)
      .sort((a, b) => b.streak - a.streak); // Highest streak first
  }

  async getHabit(habitId: string): Promise<Habit | null> {
    return this.habits.get(habitId) || null;
  }

  async createHabit(input: Omit<Habit, 'id'>): Promise<Habit> {
    const habit: Habit = {
      ...input,
      id: generateId(),
    };
    this.habits.set(habit.id, habit);
    return habit;
  }

  async updateHabit(habitId: string, updates: Partial<Habit>): Promise<Habit | null> {
    const existing = this.habits.get(habitId);
    if (!existing) return null;
    const updated: Habit = { ...existing, ...updates, id: habitId };
    this.habits.set(habitId, updated);
    return updated;
  }

  async deleteHabit(habitId: string): Promise<boolean> {
    return this.habits.delete(habitId);
  }

  // --- Agent Memory ---

  async getMemories(userId: string): Promise<AgentMemory[]> {
    return Array.from(this.memories.values())
      .filter(m => m.userId === userId)
      .sort((a, b) => b.confidence - a.confidence);
  }

  async createMemory(input: Omit<AgentMemory, 'id'>): Promise<AgentMemory> {
    const memory: AgentMemory = {
      ...input,
      id: generateId(),
    };
    this.memories.set(memory.id, memory);
    return memory;
  }
}

// --- Singleton Export ---
// 04-context-and-skills Skill 2: "Export singleton"
export const store: DataStore = new InMemoryStore();
