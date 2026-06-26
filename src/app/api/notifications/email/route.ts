// Notification Email API
// POST: Send a notification email (critical, morning, evening, digest)
// GET: Get notification status and in-app queue

import { respond, respondError } from '@/lib/api-helpers';
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
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action') || 'status';

    if (action === 'status') {
      return respond(getNotificationStatus());
    }

    if (action === 'unread') {
      return respond(getUnreadNotifications());
    }

    if (action === 'all') {
      const since = searchParams.get('since') || undefined;
      return respond(getInAppNotifications(since));
    }

    return respondError('Invalid action. Use: status, unread, all', 400);
  } catch (error) {
    console.error('[GET /api/notifications/email]', error);
    return respondError('Failed to get notification status');
  }
}

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId(true);
    const body = await req.json();
    const { type, notificationId } = body;

    // Handle mark-read requests
    if (type === 'mark-read' && notificationId) {
      markNotificationRead(notificationId);
      return respond({ marked: true });
    }

    if (type === 'mark-all-read') {
      markAllRead();
      return respond({ marked: true });
    }

    // Handle send-test
    if (type === 'test') {
      if (!isEmailConfigured()) {
        return respond({
          sent: false,
          reason: 'Email not configured. Set RESEND_API_KEY and USER_EMAIL environment variables.',
        });
      }

      const result = await sendEmail(
        'Test Email - Life Saver is Connected',
        `<div style="font-family:Inter,system-ui;padding:20px;background:#18181b;border-radius:12px;border:1px solid #27272a;">
          <h2 style="color:#f1f5f9;margin:0 0 12px;">Email Connected</h2>
          <p style="color:#94a3b8;margin:0;">Your Last-Minute Life Saver is now connected to email notifications via Resend.</p>
        </div>`
      );
      return respond(result);
    }

    // Handle critical alert
    if (type === 'critical') {
      const tasks = await prisma.task.findMany({ where: { userId, status: { in: ['PENDING', 'IN_PROGRESS'] } } });
      const critical = tasks.filter((task) => task.entropyScore >= 0.7);

      if (critical.length === 0) {
        return respond({ sent: false, reason: 'No critical tasks found' });
      }

      const { subject, html } = criticalAlertEmail(critical);
      const result = await sendEmail(subject, html);
      return respond(result);
    }

    return respondError('Invalid type. Use: test, critical, mark-read, mark-all-read', 400);
  } catch (error) {
    console.error('[POST /api/notifications/email]', error);
    return respondError('Failed to process notification request');
  }
}
