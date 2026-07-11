/**
 * Calendar Sync Service — Syncs Google Calendar events.
 * Stub for now; the actual sync logic depends on Google OAuth tokens.
 */
import { prisma } from '../prisma';

export const calendarSyncService = {
  async syncAll(): Promise<void> {
    const syncStates = await prisma.calendarSyncState.findMany({
      where: { status: { not: 'not_configured' } },
    });

    for (const state of syncStates) {
      try {
        // Get the user's Google OAuth token
        const connection = await prisma.integrationConnection.findFirst({
          where: { userId: state.userId, provider: 'google_calendar' },
        });

        if (!connection?.accessToken) {
          console.warn(`[CalendarSync] No access token for user ${state.userId}`);
          continue;
        }

        // TODO: Implement actual Google Calendar sync
        // For now, just update the lastSyncedAt timestamp
        await prisma.calendarSyncState.update({
          where: { id: state.id },
          data: { lastSyncedAt: new Date() },
        });
      } catch (err: any) {
        console.error(`[CalendarSync] Sync failed for user ${state.userId}:`, err.message);
        await prisma.calendarSyncState.update({
          where: { id: state.id },
          data: { lastError: err.message },
        });
      }
    }
  },
};
