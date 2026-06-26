import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkEmailHealth, checkGoogleCalendarHealth } from '@/lib/integration-health';
import { prisma } from '@/lib/prisma';
import * as emailUtils from '@/lib/email';

vi.mock('@/lib/email', () => ({
  isEmailConfigured: vi.fn(),
}));

describe('Integration Health Checks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GOOGLE_CLIENT_ID = 'test-id';
    process.env.GOOGLE_CLIENT_SECRET = 'test-secret';
  });

  describe('checkEmailHealth', () => {
    it('should return not_configured when email is not set up', async () => {
      vi.mocked(emailUtils.isEmailConfigured).mockReturnValue(false);
      const health = await checkEmailHealth();
      expect(health.status).toBe('not_configured');
      expect(health.configured).toBe(false);
    });

    it('should return live_verified when DB connection says so', async () => {
      vi.mocked(emailUtils.isEmailConfigured).mockReturnValue(true);
      
      // Mock prisma response
      // @ts-expect-error mock
      prisma.integrationConnection.findFirst.mockResolvedValue({
        id: '1',
        userId: 'u1',
        provider: 'email',
        status: 'live_verified',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const health = await checkEmailHealth('u1');
      expect(health.status).toBe('live_verified');
      expect(health.liveVerified).toBe(true);
      expect(health.nextAction).toBe('No action needed');
    });
  });

  describe('checkGoogleCalendarHealth', () => {
    it('should return configured if env vars exist but no connection', async () => {
      // @ts-expect-error mock
      prisma.integrationConnection.findFirst.mockResolvedValue(null);
      const health = await checkGoogleCalendarHealth('u1');
      
      expect(health.status).toBe('configured');
      expect(health.connected).toBe(false);
    });

    it('should return not_configured if env vars are missing', async () => {
      delete process.env.GOOGLE_CLIENT_ID;
      const health = await checkGoogleCalendarHealth('u1');
      
      expect(health.status).toBe('not_configured');
      expect(health.configured).toBe(false);
    });
  });
});
