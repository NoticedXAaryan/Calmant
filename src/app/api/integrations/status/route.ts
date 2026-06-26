import { NextResponse } from "next/server";
import { isEmailConfigured } from "@/lib/email";
import { getNotificationStatus } from "@/lib/notifications";
import { getSessionUser } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";
import { getTelegramStatus } from "@/lib/telegram";

export async function GET() {
  const notifications = getNotificationStatus();
  const whatsappConfigured = Boolean(
    process.env.WHATSAPP_ACCESS_TOKEN &&
    process.env.WHATSAPP_PHONE_ID &&
    process.env.WHATSAPP_VERIFY_TOKEN
  );
  const googleConfigured = Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
  const sessionUser = await getSessionUser();
  const googleAccount = sessionUser
    ? await prisma.account.findFirst({
        where: { userId: sessionUser.id, providerId: "google" },
        select: { id: true, scope: true, accessToken: true, refreshToken: true },
      })
    : null;
  const calendarScopes = googleAccount?.scope?.includes("calendar") ?? false;
  const calendarLinked = Boolean(googleAccount?.accessToken && calendarScopes);
  const telegram = getTelegramStatus();

  return NextResponse.json({
    success: true,
    data: {
      email: {
        configured: isEmailConfigured(),
        unreadCount: notifications.unreadCount,
      },
      telegram: {
        configured: telegram.configured,
        running: telegram.running,
        startedAt: telegram.startedAt,
        userLinked: telegram.userLinked,
        label: telegram.label,
      },
      googleCalendar: {
        configured: googleConfigured,
        linked: calendarLinked,
        label: !googleConfigured
          ? "OAuth setup needed"
          : calendarLinked
            ? "Connected"
            : sessionUser
              ? "Sign in with Google to connect"
              : "Sign in to check",
      },
      whatsapp: {
        configured: whatsappConfigured,
        label: whatsappConfigured ? "Webhook configured" : "Admin setup needed",
      },
      inApp: {
        configured: true,
        unreadCount: notifications.unreadCount,
        queueSize: notifications.inAppQueueSize,
      },
    },
    timestamp: new Date().toISOString(),
  });
}
