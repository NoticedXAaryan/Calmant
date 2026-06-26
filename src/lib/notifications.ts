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

const inAppQueue: InAppNotification[] = [];

export function getInAppNotifications(since?: string): InAppNotification[] {
  if (since) {
    const sinceTime = new Date(since).getTime();
    return inAppQueue.filter(n => new Date(n.timestamp).getTime() > sinceTime);
  }
  return [...inAppQueue];
}

export function getUnreadNotifications(): InAppNotification[] {
  return inAppQueue.filter(n => !n.read);
}

export function markNotificationRead(id: string): void {
  const notification = inAppQueue.find(n => n.id === id);
  if (notification) {
    notification.read = true;
  }
}

export function markAllRead(): void {
  inAppQueue.forEach(n => { n.read = true; });
}

function pushInApp(type: NotificationType, title: string, message: string, taskId?: string): void {
  // Keep queue to last 50 notifications
  if (inAppQueue.length >= 50) {
    inAppQueue.shift();
  }

  inAppQueue.push({
    id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    type,
    title,
    message,
    taskId,
    timestamp: new Date().toISOString(),
    read: false,
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
  pushInApp(
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

  pushInApp(type, `${emoji} ${task.title}`, message, task.id);
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
export function getNotificationStatus(): {
  emailConfigured: boolean;
  inAppQueueSize: number;
  unreadCount: number;
} {
  return {
    emailConfigured: isEmailConfigured(),
    inAppQueueSize: inAppQueue.length,
    unreadCount: inAppQueue.filter(n => !n.read).length,
  };
}
