/**
 * Provider Health Service — Probes all integration connections for health.
 * Stub for now; will be expanded with per-provider health checks.
 */
import { prisma } from '../prisma';

export const providerHealthService = {
  async probeAllProviders(): Promise<void> {
    const connections = await prisma.integrationConnection.findMany({
      where: { status: { in: ['connected', 'live_verified'] } },
    });

    for (const conn of connections) {
      try {
        // Basic connectivity check per provider
        switch (conn.provider) {
          case 'telegram': {
            const token = process.env.TELEGRAM_BOT_TOKEN;
            if (token) {
              const res = await fetch(`https://api.telegram.org/bot${token}/getMe`, {
                signal: AbortSignal.timeout(5000),
              });
              const healthy = res.ok;
              await prisma.integrationConnection.update({
                where: { id: conn.id },
                data: {
                  lastCheckedAt: new Date(),
                  ...(healthy
                    ? { lastSuccessAt: new Date(), status: 'live_verified', lastError: null }
                    : { lastFailureAt: new Date(), status: 'degraded', lastError: `HTTP ${res.status}` }),
                },
              });
            }
            break;
          }

          case 'google_calendar':
          case 'email':
            // These are checked by their respective sync services
            await prisma.integrationConnection.update({
              where: { id: conn.id },
              data: { lastCheckedAt: new Date() },
            });
            break;

          default:
            await prisma.integrationConnection.update({
              where: { id: conn.id },
              data: { lastCheckedAt: new Date() },
            });
        }
      } catch (err: any) {
        console.warn(`[ProviderHealth] Probe failed for ${conn.provider}:`, err.message);
        await prisma.integrationConnection.update({
          where: { id: conn.id },
          data: {
            lastCheckedAt: new Date(),
            lastFailureAt: new Date(),
            status: 'degraded',
            lastError: err.message,
          },
        });
      }
    }
  },
};
