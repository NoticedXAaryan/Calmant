// Entropy Score Calculator
// Source: Architecture.md → entropyScore field, 04-context-and-skills → Skill 6
// Referenced by: T-005, T-007 (auto-calculate on read)
//
// Entropy score is a 0.0–1.0 urgency indicator combining:
// - Time remaining as fraction of estimated duration
// - Snooze penalty (each snooze increases urgency)
// - Status penalty (untouched tasks are more urgent)
// - Overdue penalty (past deadline = critical)

import type { Task } from './types';

/**
 * Calculate real-time entropy (urgency) score for a task.
 * 
 * 0.0 = cool (plenty of time)
 * 0.5 = warm (getting close)
 * 0.7 = hot (should start now)
 * 0.9 = critical (likely to miss)
 * 1.0 = overdue or impossible
 * 
 * Validation requirements (from Tasks.md T-005):
 * - Overdue task → score > 0.9
 * - Task due in 7 days → score < 0.3
 * - Snoozed task → higher score than un-snoozed equivalent
 */
export function calculateEntropy(task: Task): number {
  // Completed/skipped tasks have zero entropy
  if (task.status === 'done' || task.status === 'skipped') {
    return 0;
  }

  const now = Date.now();
  const deadline = new Date(task.deadline).getTime();
  const timeRemaining = deadline - now;
  const estimatedMs = (task.estimatedMins || 60) * 60 * 1000;

  // Factor 1: Time pressure (0–0.5)
  // How much of the "buffer" time has been consumed?
  // Buffer = 3x estimated duration (generous margin)
  const bufferMs = estimatedMs * 3;
  let timePressure: number;
  
  if (timeRemaining <= 0) {
    // Overdue
    timePressure = 0.5;
  } else if (timeRemaining >= bufferMs) {
    // Plenty of time
    timePressure = 0;
  } else {
    // Linear ramp from 0 to 0.5 as buffer depletes
    timePressure = 0.5 * (1 - timeRemaining / bufferMs);
  }

  // Factor 2: Snooze penalty (0–0.2)
  // Each snooze adds 0.05, capped at 0.2
  const snoozePenalty = Math.min(task.snoozeCount * 0.05, 0.2);

  // Factor 3: Status penalty (0–0.15)
  // Untouched (pending) tasks are more urgent than in-progress ones
  const statusPenalty = task.status === 'pending' ? 0.15 : 0;

  // Factor 4: Overdue penalty (0 or 0.3)
  const overduePenalty = timeRemaining < 0 ? 0.3 : 0;

  // Factor 5: No subtasks penalty (0 or 0.05)
  // Tasks without decomposition are riskier
  const noSubtasksPenalty = task.subtasks.length === 0 ? 0.05 : 0;

  // Combine all factors, clamp to [0, 1]
  const raw = timePressure + snoozePenalty + statusPenalty + overduePenalty + noSubtasksPenalty;
  return Math.min(1, Math.max(0, Math.round(raw * 100) / 100));
}

/**
 * Get the entropy level label for display.
 */
export function getEntropyLevel(score: number): 'cool' | 'warm' | 'hot' | 'critical' {
  if (score < 0.3) return 'cool';
  if (score < 0.6) return 'warm';
  if (score < 0.8) return 'hot';
  return 'critical';
}

/**
 * Get CSS color for entropy level.
 * Uses design tokens from globals.css (04-context-and-skills → CSS Convention)
 */
export function getEntropyColor(score: number): string {
  if (score < 0.3) return '#10b981'; // emerald-500
  if (score < 0.6) return '#f59e0b'; // amber-500
  if (score < 0.8) return '#ef4444'; // red-500
  return '#dc2626';                   // red-600
}
