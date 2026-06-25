import cron from 'node-cron';
import { prisma } from './lib/prisma';
import { sendPushNotification } from './lib/ntfy';

console.log('[Worker] Starting background worker process...');

// Scan tasks every 5 minutes
cron.schedule('*/5 * * * *', async () => {
  console.log('[Worker] Scanning tasks for high entropy...');
  try {
    const activeTasks = await prisma.task.findMany({
      where: { status: { in: ['PENDING', 'IN_PROGRESS'] } }
    });

    for (const task of activeTasks) {
      if (task.entropyScore > 0.8) {
        await sendPushNotification(task.userId, '🚨 CRITICAL TASK', `Your task "${task.title}" is reaching critical entropy!`, 5);
      }
    }
  } catch (error) {
    console.error('[Worker] Error scanning tasks:', error);
  }
});

// Morning brief every day at 8:00 AM
cron.schedule('0 8 * * *', async () => {
  console.log('[Worker] Running morning brief job...');
});

// Evening review every day at 8:00 PM
cron.schedule('0 20 * * *', async () => {
  console.log('[Worker] Running evening review job...');
});
