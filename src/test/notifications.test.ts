import { describe, it, expect, vi, beforeEach } from 'vitest';
import { notifyCriticalTasks, markAllRead, getUnreadNotifications } from '@/lib/notifications';
import { prisma } from '@/lib/prisma';
import * as email from '@/lib/email';
import * as telegram from '@/lib/telegram';
import * as alertPolicy from '@/lib/alert-policy';
import type { Task } from '@prisma/client';

vi.mock('@/lib/email', () => ({
  isEmailConfigured: vi.fn(),
  sendEmail: vi.fn(),
  criticalAlertEmail: vi.fn(),
}));

vi.mock('@/lib/telegram', () => ({
  sendTelegramMessage: vi.fn(),
}));

vi.mock('@/lib/alert-policy', () => ({
  evaluateAlertPolicy: vi.fn(),
}));

describe('Notifications Dispatch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    markAllRead();
  });

  it('should push in-app notification and try telegram then email', async () => {
    const task = {
      id: 't1',
      title: 'Urgent Task',
      userId: 'u1',
    } as Task;

    vi.mocked(telegram.sendTelegramMessage).mockResolvedValue(false); // Telegram fails/not connected
    vi.mocked(email.isEmailConfigured).mockReturnValue(true);
    vi.mocked(alertPolicy.evaluateAlertPolicy).mockResolvedValue({ allowed: true });
    
    vi.mocked(email.criticalAlertEmail).mockReturnValue({ subject: 'subj', html: 'html', text: 'text' });
    vi.mocked(email.sendEmail).mockResolvedValue({ sent: true, id: 'msg-id-123' });

    // @ts-expect-error mock
    prisma.notificationDelivery.create.mockResolvedValue({ id: 'del-1' });

    const results = await notifyCriticalTasks('u1', [task], 'test@example.com');
    
    // In-app should be sent
    const unread = getUnreadNotifications();
    expect(unread.length).toBe(1);
    expect(unread[0].type).toBe('critical');
    
    // Check results array
    expect(results).toContainEqual({ channel: 'in-app', sent: true });
    expect(results).toContainEqual({ channel: 'email', sent: true, emailId: 'msg-id-123' });

    // Verify DB call
    expect(prisma.notificationDelivery.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          channel: 'email',
          intent: 'critical',
          status: 'queued'
        })
      })
    );
    
    expect(prisma.notificationDelivery.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'sent'
        })
      })
    );
  });

  it('should stop at telegram if telegram is successful', async () => {
    const task = {
      id: 't2',
      title: 'Urgent Task',
      userId: 'u1',
    } as Task;

    vi.mocked(telegram.sendTelegramMessage).mockResolvedValue(true); 
    
    // @ts-expect-error mock
    prisma.notificationDelivery.create.mockResolvedValue({ id: 'del-2' });

    const results = await notifyCriticalTasks('u1', [task], 'test@example.com');
    
    expect(results).toContainEqual({ channel: 'telegram', sent: true });
    
    // Email should not be called
    expect(email.isEmailConfigured).not.toHaveBeenCalled();
    
    // Delivery record should be telegram
    expect(prisma.notificationDelivery.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          channel: 'telegram'
        })
      })
    );
  });
});
