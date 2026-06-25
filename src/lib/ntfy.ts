import { prisma } from './prisma';

const NTFY_BASE_URL = process.env.NTFY_BASE_URL || 'https://ntfy.sh';

export async function sendPushNotification(userId: string, title: string, message: string, priority: number = 3) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.ntfyTopic) {
    console.log(`[ntfy] No topic for user ${userId}`);
    return false;
  }

  try {
    const response = await fetch(`${NTFY_BASE_URL}/${user.ntfyTopic}`, {
      method: 'POST',
      body: message,
      headers: {
        'Title': title,
        'Priority': priority.toString(),
        'Tags': 'warning,skull'
      }
    });
    return response.ok;
  } catch (err) {
    console.error('[ntfy] Failed to send push', err);
    return false;
  }
}
