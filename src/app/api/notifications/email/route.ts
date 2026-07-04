// Notification Email API
// POST: Send a notification email (critical, morning, evening, digest)
// GET: Get notification status and in-app queue

import { isAuthError, respond, respondError, respondUnauthorized } from '@/lib/api-helpers';
import { getUserId } from '@/lib/auth-utils';
import { sendEmail, criticalAlertEmail, isEmailConfigured } from '@/lib/email';
import {
  getInAppNotifications,
  getUnreadNotifications,
  markNotificationRead,
  markAllRead,
  getNotificationStatus,
} from '@/lib/notifications';
import { prisma } from '@/lib/prisma';
import type { NextRequest } from 'next/server';



export async function GET(req: NextRequest) {
  try {
    const userId = await getUserId();
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action') || 'status';

    if (action === 'status') {
      return respond(await getNotificationStatus(userId));
    }

    if (action === 'unread') {
      return respond(await getUnreadNotifications(userId));
    }

    if (action === 'all') {
      const since = searchParams.get('since') || undefined;
      return respond(await getInAppNotifications(userId, since));
    }

    return respondError('Invalid action. Use: status, unread, all', 400);
  } catch (error) {
    console.error('[GET /api/notifications/email]', error);
    if (isAuthError(error)) return respondUnauthorized();
    return respondError('Failed to get notification status');
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId();
    const body = await req.json();
    const { type, notificationId } = body;

    // Handle mark-read requests
    if (type === 'mark-read' && notificationId) {
      await markNotificationRead(notificationId); // Note: ideally verify userId owns notification
      return respond({ marked: true });
    }

    if (type === 'mark-all-read') {
      await markAllRead(userId);
      return respond({ marked: true });
    }

    // Handle send-test
    if (type === 'test') {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user?.email) {
         return respond({ sent: false, reason: 'User email not found' });
      }

      if (!isEmailConfigured()) {
        return respond({
          sent: false,
          reason: 'Email not configured. Set RESEND_API_KEY.',
        });
      }

      const { dispatchDurableNotification } = await import('@/lib/notifications');
      const result = await dispatchDurableNotification(
        userId,
        null,
        'test',
        'Test Email - Life Saver is Connected',
        `<div style="font-family:Inter,system-ui;padding:20px;background:#18181b;border-radius:12px;border:1px solid #27272a;">
          <h2 style="color:#f1f5f9;margin:0 0 12px;">Email Connected</h2>
          <p style="color:#94a3b8;margin:0;">Your Last-Minute Life Saver is now connected to email notifications via Resend.</p>
        </div>`,
        user.email
      );
      return respond(result);
    }

    // Handle critical alert
    if (type === 'critical') {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user?.email) {
         return respond({ sent: false, reason: 'User email not found' });
      }

      const tasks = await prisma.task.findMany({ where: { userId, status: { in: ['PENDING', 'IN_PROGRESS'] } } });
      const critical = tasks.filter((task) => task.entropyScore >= 0.7);

      if (critical.length === 0) {
        return respond({ sent: false, reason: 'No critical tasks found' });
      }

      const { notifyCriticalTasks } = await import('@/lib/notifications');
      const results = await notifyCriticalTasks(userId, critical as any, user.email);
      const emailResult = results.find(r => r.channel === 'email') || results[0];
      return respond(emailResult);
    }

    return respondError('Invalid type. Use: test, critical, mark-read, mark-all-read', 400);
  } catch (error) {
    console.error('[POST /api/notifications/email]', error);
    if (isAuthError(error)) return respondUnauthorized();
    return respondError('Failed to process notification request');
  }
}
