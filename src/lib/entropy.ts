import type { Subtask, Task } from "@prisma/client";

export function calculateEntropy(task: Task & { subtasks?: Subtask[] }): number {
  const now = Date.now();
  const deadlineMs = task.deadline.getTime();
  const estimatedMs = (task.estimatedMins ?? 60) * 60 * 1000;

  // Overdue tasks should always cut through the queue.
  if (deadlineMs < now) return 0.99;

  const remainingMs = deadlineMs - now;
  const slackMs = remainingMs - estimatedMs;
  const slackRatio = slackMs / Math.max(estimatedMs, 1);
  const timePressure =
    slackRatio <= 0 ? 0.82 :
    slackRatio <= 0.5 ? 0.68 :
    slackRatio <= 1 ? 0.52 :
    slackRatio <= 3 ? 0.32 :
    0.12;
  const snoozePenalty = Math.min(0.22, task.snoozeCount * 0.07);
  const priorityLift = Math.min(0.16, (task.priority ?? 0.5) * 0.16);
  const noPlanPenalty =
    task.subtasks && task.subtasks.length === 0 && (task.estimatedMins ?? 60) >= 45 ? 0.1 : 0;
  const rawScore = timePressure + snoozePenalty + priorityLift + noPlanPenalty;

  return Math.min(0.98, Math.max(0, rawScore));
}

export function getEntropyLevel(score: number): "cool" | "warm" | "hot" | "critical" {
  if (score >= 0.85) return "critical";
  if (score >= 0.65) return "hot";
  if (score >= 0.40) return "warm";
  return "cool";
}

export const ENTROPY_COLORS = {
  cool: "#10b981",
  warm: "#f59e0b",
  hot: "#ef4444",
  critical: "#dc2626",
} as const;

export function getEntropyColor(score: number): string {
  const level = getEntropyLevel(score);
  return ENTROPY_COLORS[level];
}
