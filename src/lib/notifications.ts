// Unified Notification Dispatcher
// Escalation ladder: In-app toast → Email (Resend)
// Replaces the WhatsApp/SMS notification system from the original spec.

import { sendEmail, criticalAlertEmail, isEmailConfigured } from './email';
import type { Task } from './types';
import { getEntropyLevel } from './entropy';

// --- Types ---

export interface NotificationResult {
  channel: 'in-app' | 'email' | 'telegram';
  sent: boolean;
  reason?: string;
  emailId?: string;
}

export type NotificationType = 'critical' | 'morning' | 'evening' | 'digest' | 'task-complete';

// --- In-App Notification Queue ---
// These are polled by the frontend for real-time in-app alerts.

interface InAppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  taskId?: string;
  timestamp: string;
  read: boolean;
}

export async function getInAppNotifications(userId: string, since?: string) {
  return await prisma.inAppNotification.findMany({
    where: {
      userId,
      ...(since ? { createdAt: { gt: new Date(since) } } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
}

export async function getUnreadNotifications(userId: string) {
  return await prisma.inAppNotification.findMany({
    where: { userId, read: false },
    orderBy: { createdAt: 'desc' },
  });
}

export async function markNotificationRead(id: string) {
  await prisma.inAppNotification.update({
    where: { id },
    data: { read: true },
  });
}

export async function markAllRead(userId: string) {
  await prisma.inAppNotification.updateMany({
    where: { userId, read: false },
    data: { read: true },
  });
}

async function pushInApp(userId: string, type: NotificationType, title: string, message: string, taskId?: string) {
  await prisma.inAppNotification.create({
    data: {
      userId,
      type,
      title,
      message,
      taskId,
    }
  });
}

// --- Notification Dispatcher ---

import { prisma } from './prisma';
import { evaluateAlertPolicy } from './alert-policy';

/**
 * Send critical task alert through all configured channels.
 * Escalation: Always adds in-app, also sends email if configured.
 */
export async function notifyCriticalTasks(userId: string, tasks: Task[], userEmail?: string): Promise<NotificationResult[]> {
  const results: NotificationResult[] = [];

  if (tasks.length === 0) return results;

  const topTask = tasks[0];

  // Level 0: In-app notification (always)
  const taskNames = tasks.slice(0, 3).map(t => t.title).join(', ');
  await pushInApp(
    userId,
    'critical',
    `🔴 ${tasks.length} critical task${tasks.length > 1 ? 's' : ''}`,
    `Urgent: ${taskNames}${tasks.length > 3 ? ` and ${tasks.length - 3} more` : ''}`,
    topTask?.id
  );
  results.push({ channel: 'in-app', sent: true });

  // Level 1: Telegram (if configured and linked)
  let telegramSent = false;
  try {
    const { sendTelegramMessage } = await import('./telegram');
    const message = `🔴 Urgent: ${tasks.length} critical task(s)\n${taskNames}`;
    telegramSent = await sendTelegramMessage(userId, message);
    if (telegramSent) {
      await prisma.notificationDelivery.create({
        data: {
          userId,
          taskId: topTask?.id,
          channel: 'telegram',
          intent: 'critical',
          status: 'sent',
          sentAt: new Date(),
        }
      });
      results.push({ channel: 'telegram', sent: true });
    }
  } catch (err) {
    console.error("[Notification] Telegram dispatch failed:", err);
  }

  // Level 2: Email (if Telegram failed or not configured)
  if (!telegramSent && isEmailConfigured() && userEmail) {
    const policyResult = await evaluateAlertPolicy(userId, topTask as any, 'email');

    if (!policyResult.allowed) {
      console.log(`[Notification] Email skipped for user ${userId}: ${policyResult.reason}`);
      results.push({ channel: 'email', sent: false, reason: policyResult.reason });
      return results;
    }

    const { subject, html } = criticalAlertEmail(tasks);

    // Create durable record
    const delivery = await prisma.notificationDelivery.create({
      data: {
        userId,
        taskId: topTask?.id,
        channel: 'email',
        intent: 'critical',
        status: 'queued',
      }
    });

    const emailResult = await sendEmail(subject, html, userEmail);

    // Update durable record
    await prisma.notificationDelivery.update({
      where: { id: delivery.id },
      data: {
        status: emailResult.sent ? 'sent' : 'failed',
        error: emailResult.reason,
        sentAt: emailResult.sent ? new Date() : null,
        providerId: emailResult.id,
      }
    });

    results.push({
      channel: 'email',
      sent: emailResult.sent,
      reason: emailResult.reason,
      emailId: emailResult.id,
    });
  }

  return results;
}

/**
 * Send notification for a specific task event.
 */
export async function notifyTaskEvent(
  type: NotificationType,
  task: Task,
  message: string
): Promise<NotificationResult> {
  const level = getEntropyLevel(task.entropyScore);
  const emoji = level === 'critical' ? '🔴' : level === 'hot' ? '🟠' : level === 'warm' ? '🟡' : '🟢';

  await pushInApp(task.userId, type, `${emoji} ${task.title}`, message, task.id);
  return { channel: 'in-app', sent: true };
}



export async function dispatchDurableNotification(
  userId: string,
  taskId: string | null,
  intent: string,
  subject: string,
  html: string,
  userEmail: string
): Promise<NotificationResult> {
  const policyResult = await evaluateAlertPolicy(
    userId,
    { id: taskId, entropyScore: 0 } as any, // Mock task for policy if not available, can be improved
    'email'
  );

  if (!policyResult.allowed) {
    return { channel: 'email', sent: false, reason: policyResult.reason };
  }

  // Level 1: Telegram
  let telegramSent = false;
  try {
    const { sendTelegramMessage } = await import('./telegram');
    // Extract plain text from HTML (very basic)
    const plainText = html.replace(/<[^>]+>/g, '\n').replace(/\n\s*\n/g, '\n').trim();
    const message = `*${subject}*\n${plainText}`;
    telegramSent = await sendTelegramMessage(userId, message);
    
    if (telegramSent) {
      await prisma.notificationDelivery.create({
        data: {
          userId,
          taskId,
          channel: 'telegram',
          intent,
          status: 'sent',
          sentAt: new Date(),
        }
      });
      return { channel: 'telegram', sent: true };
    }
  } catch (err) {
    console.error("[Notification] Telegram durable dispatch failed:", err);
  }

  // Level 2: Email
  const delivery = await prisma.notificationDelivery.create({
    data: {
      userId,
      taskId,
      channel: 'email',
      intent,
      status: 'queued',
    }
  });

  const emailResult = await sendEmail(subject, html, userEmail);

  await prisma.notificationDelivery.update({
    where: { id: delivery.id },
    data: {
      status: emailResult.sent ? 'sent' : 'failed',
      error: emailResult.reason,
      sentAt: emailResult.sent ? new Date() : null,
      providerId: emailResult.id,
    }
  });

  return {
    channel: 'email',
    sent: emailResult.sent,
    reason: emailResult.reason,
    emailId: emailResult.id,
  };
}

/**
 * Get notification system status.
 */
export async function getNotificationStatus(userId: string): Promise<{
  emailConfigured: boolean;
  inAppQueueSize: number;
  unreadCount: number;
}> {
  const inAppQueueSize = await prisma.inAppNotification.count({ where: { userId } });
  const unreadCount = await prisma.inAppNotification.count({ where: { userId, read: false } });

  return {
    emailConfigured: isEmailConfigured(),
    inAppQueueSize,
    unreadCount,
  };
}
