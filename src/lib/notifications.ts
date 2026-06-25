// Unified Notification Dispatcher
// Escalation ladder: In-app toast → Email (Resend)
// Replaces the WhatsApp/SMS notification system from the original spec.

import { sendEmail, criticalAlertEmail, isEmailConfigured, type EmailResult } from './email';
import type { Task } from './types';
import { getEntropyLevel } from './entropy';

// --- Types ---

export interface NotificationResult {
  channel: 'in-app' | 'email';
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

/**
 * Send critical task alert through all configured channels.
 * Escalation: Always adds in-app, also sends email if configured.
 */
export async function notifyCriticalTasks(tasks: Task[]): Promise<NotificationResult[]> {
  const results: NotificationResult[] = [];

  if (tasks.length === 0) return results;

  // Level 0: In-app notification (always)
  const taskNames = tasks.slice(0, 3).map(t => t.title).join(', ');
  pushInApp(
    'critical',
    `🔴 ${tasks.length} critical task${tasks.length > 1 ? 's' : ''}`,
    `Urgent: ${taskNames}${tasks.length > 3 ? ` and ${tasks.length - 3} more` : ''}`,
    tasks[0]?.id
  );
  results.push({ channel: 'in-app', sent: true });

  // Level 1: Email (if configured)
  if (isEmailConfigured()) {
    const { subject, html } = criticalAlertEmail(tasks);
    const emailResult = await sendEmail(subject, html);
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
