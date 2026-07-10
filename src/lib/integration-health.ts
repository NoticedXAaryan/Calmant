import { prisma } from "@/lib/prisma";
import { isEmailConfigured } from "@/lib/email";

export type ProviderStatus = "not_configured" | "configured" | "connected" | "live_verified" | "degraded";

export interface IntegrationHealth {
  status: ProviderStatus;
  configured: boolean;
  connected: boolean;
  liveVerified: boolean;
  lastCheckedAt?: Date | null;
  lastError?: string | null;
  nextAction: string;
}

export async function checkEmailHealth(userId?: string): Promise<IntegrationHealth> {
  const configured = isEmailConfigured();
  if (!configured) {
    return {
      status: "not_configured",
      configured: false,
      connected: false,
      liveVerified: false,
      lastError: "RESEND_API_KEY or RESEND_FROM_EMAIL is missing",
      nextAction: "Add Resend credentials to environment",
    };
  }

  if (userId) {
    const connection = await prisma.integrationConnection.findFirst({
      where: { userId, provider: "email" },
    });
    
    if (connection) {
      return {
        status: connection.status as ProviderStatus,
        configured: true,
        connected: true,
        liveVerified: connection.status === "live_verified",
        lastCheckedAt: connection.lastCheckedAt,
        lastError: connection.lastError,
        nextAction: connection.status === "live_verified" ? "No action needed" : "Send a test email to verify delivery",
      };
    }
  }

  // Configured at app level, but no user connection verified
  return {
    status: "configured",
    configured: true,
    connected: false,
    liveVerified: false,
    nextAction: "Send a test email to verify delivery",
  };
}

export async function checkGoogleCalendarHealth(userId?: string): Promise<IntegrationHealth> {
  const configured = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
  if (!configured) {
    return {
      status: "not_configured",
      configured: false,
      connected: false,
      liveVerified: false,
      lastError: "Google OAuth credentials missing",
      nextAction: "Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET",
    };
  }

  if (!userId) {
    return {
      status: "configured",
      configured: true,
      connected: false,
      liveVerified: false,
      nextAction: "Sign in with Google to connect Calendar",
    };
  }

  const account = await prisma.account.findFirst({
    where: { userId, providerId: "google" },
  });

  const calendarScopes = account?.scope?.includes("calendar") ?? false;
  const connected = Boolean(account?.accessToken && calendarScopes);

  if (!connected) {
    return {
      status: "configured",
      configured: true,
      connected: false,
      liveVerified: false,
      nextAction: "Sign in with Google to connect Calendar",
    };
  }

  const connection = await prisma.integrationConnection.findFirst({
    where: { userId, provider: "google_calendar" },
  });

  if (connection) {
    return {
      status: connection.status as ProviderStatus,
      configured: true,
      connected: true,
      liveVerified: connection.status === "live_verified",
      lastCheckedAt: connection.lastCheckedAt,
      lastError: connection.lastError,
      nextAction: connection.status === "live_verified" ? "No action needed" : "Run Calendar health check",
    };
  }

  return {
    status: "connected",
    configured: true,
    connected: true,
    liveVerified: false,
    lastError: "Live probe has not run",
    nextAction: "Run Calendar health check",
  };
}

export async function probeGoogleCalendarHealth(userId: string): Promise<IntegrationHealth> {
  const current = await checkGoogleCalendarHealth(userId);
  if (!current.connected) return current;

  try {
    const { getUpcomingEvents } = await import("./calendar");
    await getUpcomingEvents(userId, 1);
    return {
      ...current,
      status: "live_verified",
      liveVerified: true,
      lastError: null,
      nextAction: "No action needed",
    };
  } catch (err: any) {
    return {
      ...current,
      status: "degraded",
      liveVerified: false,
      lastError: err.message || "Failed to fetch from Google Calendar",
      nextAction: "Run Calendar health check to reconnect",
    };
  }
}

export async function checkTelegramHealth(userId?: string): Promise<IntegrationHealth> {
  const configured = Boolean(process.env.TELEGRAM_BOT_TOKEN);
  if (!configured) {
    return {
      status: "not_configured",
      configured: false,
      connected: false,
      liveVerified: false,
      lastError: "Bot token missing",
      nextAction: "Add TELEGRAM_BOT_TOKEN to .env",
    };
  }

  if (!userId) {
    return {
      status: "connected",
      configured: true,
      connected: true,
      liveVerified: false,
      nextAction: "No action needed",
    };
  }

  const connection = await prisma.integrationConnection.findFirst({
    where: { userId, provider: "telegram" },
  });

  if (connection) {
    let liveVerified = connection.status === "live_verified";
    
    try {
      const { TelegramService } = await import("./services/telegram-service");
      const isHealthy = await TelegramService.probeHealth(userId);
      if (isHealthy) {
        liveVerified = true;
      } else {
        liveVerified = false;
        // The probe implicitly handles updating DB on errors, but we can also handle degraded state here
      }
    } catch (e) {
      liveVerified = false;
    }

    return {
      status: liveVerified ? "live_verified" : "degraded",
      configured: true,
      connected: true,
      liveVerified,
      lastCheckedAt: connection.lastCheckedAt,
      lastError: liveVerified ? null : "Failed to verify Telegram connectivity",
      nextAction: liveVerified ? "No action needed" : "Send /start in Telegram or reconnect",
    };
  }

  return {
    status: "not_configured",
    configured: true,
    connected: false,
    liveVerified: false,
    lastError: "Account not linked",
    nextAction: "Send /connect in Telegram",
  };
}

export async function checkWhatsAppHealth(userId?: string): Promise<IntegrationHealth> {
  const configured = Boolean(
    process.env.WHATSAPP_ACCESS_TOKEN &&
    process.env.WHATSAPP_PHONE_ID &&
    process.env.WHATSAPP_VERIFY_TOKEN
  );
  if (!configured) {
    return {
      status: "not_configured",
      configured: false,
      connected: false,
      liveVerified: false,
      lastError: "WhatsApp credentials missing",
      nextAction: "Add WHATSAPP_ACCESS_TOKEN and related keys to environment",
    };
  }

  if (userId) {
    const connection = await prisma.integrationConnection.findFirst({
      where: { userId, provider: "whatsapp" },
    });

    if (connection) {
      return {
        status: connection.status as ProviderStatus,
        configured: true,
        connected: true,
        liveVerified: connection.status === "live_verified",
        lastCheckedAt: connection.lastCheckedAt,
        lastError: connection.lastError,
        nextAction: connection.status === "live_verified" ? "No action needed" : "Send a message to link your phone",
      };
    }
  }

  return {
    status: "configured",
    configured: true,
    connected: false,
    liveVerified: false,
    nextAction: "Send a message from your phone to connect",
  };
}

export function checkInAppHealth(): IntegrationHealth {
  return {
    status: "live_verified",
    configured: true,
    connected: true,
    liveVerified: true,
    nextAction: "No action needed",
  };
}
