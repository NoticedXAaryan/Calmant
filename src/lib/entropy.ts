import type { Task } from "@prisma/client";

export function calculateEntropy(task: Task): number {
  const now        = Date.now();
  const deadlineMs = task.deadline.getTime();
  const estimatedMs = (task.estimatedMins ?? 60) * 60 * 1000;

  // Overdue — max urgency
  if (deadlineMs < now) return 0.99;

  const remainingMs      = deadlineMs - now;
  const timeRatioUsed    = 1 - Math.min(1, remainingMs / estimatedMs);
  const snoozePenalty    = Math.min(0.3, task.snoozeCount * 0.08);
  const rawScore         = timeRatioUsed * 0.6 + snoozePenalty;

  return Math.min(0.98, Math.max(0, rawScore));
}

export function getEntropyLevel(score: number): "cool" | "warm" | "hot" | "critical" {
  if (score >= 0.85) return "critical";
  if (score >= 0.65) return "hot";
  if (score >= 0.40) return "warm";
  return "cool";
}

export const ENTROPY_COLORS = {
  cool:     "#10b981", // emerald-500
  warm:     "#f59e0b", // amber-500
  hot:      "#ef4444", // red-500
  critical: "#dc2626", // red-600
} as const;

export function getEntropyColor(score: number): string {
  const level = getEntropyLevel(score);
  return ENTROPY_COLORS[level];
}
