import { prisma } from './prisma';
import type { Task } from '@prisma/client';

export interface AlertPolicyResult {
  allowed: boolean;
  reason?: string;
}

export async function evaluateAlertPolicy(
  userId: string,
  task: Task,
  channel: string
): Promise<AlertPolicyResult> {
  const policy = await prisma.alertPolicy.findFirst({
    where: {
      userId,
      channel,
    },
  });

  // Default to opt-in / allow if no policy exists, to ensure notifications aren't silently dropped
  // before the user configures their preferences.
  if (!policy) {
    return { allowed: true };
  }

  if (!policy.enabled) {
    return { allowed: false, reason: 'Channel disabled by user policy' };
  }

  if (policy.minEntropy !== null && task.entropyScore < policy.minEntropy) {
    return {
      allowed: false,
      reason: `Task entropy (${task.entropyScore}) is below policy minimum (${policy.minEntropy})`,
    };
  }

  // TODO: Implement quietHours parsing and evaluation here.
  // if (policy.quietHours) {
  //   const now = new Date();
  //   // parse quietHours json and check if 'now' falls inside the range
  // }

  return { allowed: true };
}
