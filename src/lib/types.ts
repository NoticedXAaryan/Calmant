// Types — Single source of truth for all data structures
// Source: Architecture.md → Database Schema
// Referenced by: T-003, T-004, T-005, T-007, T-008, T-009, T-010-T-016

export interface Task {
  id: string;
  userId: string;
  title: string;
  description: string;
  deadline: string;        // ISO 8601
  estimatedMins: number;
  priority: number;        // 0.0–1.0, Gemini-computed
  entropyScore: number;    // 0.0–1.0, calculated real-time
  status: TaskStatus;
  subtasks: Subtask[];
  calendarBlocks: string[]; // IDs of ScheduleBlock
  snoozeCount: number;
  createdAt: string;       // ISO 8601
  completedAt?: string;    // ISO 8601
}

export type TaskStatus = 'pending' | 'in_progress' | 'done' | 'skipped' | 'deferred';

export interface Subtask {
  id: string;
  title: string;
  estimatedMins: number;
  status: 'pending' | 'done';
  scheduledBlockId?: string;
}

export interface ScheduleBlock {
  id: string;
  userId: string;
  taskId: string;
  subtaskId?: string;
  title: string;
  startTime: string;       // ISO 8601
  endTime: string;         // ISO 8601
  type: 'work' | 'break' | 'focus';
  status: 'scheduled' | 'completed' | 'missed';
}

export interface Habit {
  id: string;
  userId: string;
  name: string;
  emoji: string;
  frequency: 'daily' | 'weekly';
  streak: number;
  completions: Record<string, boolean>; // ISO date string → completed
  createdAt: string;       // ISO 8601
}

export interface AgentMemory {
  id: string;
  userId: string;
  fact: string;            // e.g., "avoids exam prep until last day"
  category: 'behavior' | 'preference' | 'pattern';
  confidence: number;      // 0.0–1.0
  createdAt: string;       // ISO 8601
  lastUsed: string;        // ISO 8601
}

// API response shape — Validation.md requires all routes use this
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

// Agent-specific types
export interface DecomposeResult {
  subtasks: Array<{
    title: string;
    estimatedMins: number;
    rationale: string;
  }>;
  adjustedTotalMins: number;
  reasoning: string;
}

export interface PriorityScore {
  taskId: string;
  score: number;
  reason: string;
}

export interface AgentAction {
  type: 'decompose' | 'schedule' | 'score' | 'memory' | 'notify';
  taskId?: string;
  description: string;
  timestamp: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  actions?: AgentAction[];
  timestamp: string;
}
