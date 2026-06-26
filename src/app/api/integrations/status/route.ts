import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth-utils";
import { getNotificationStatus } from "@/lib/notifications";
import {
  checkEmailHealth,
  checkGoogleCalendarHealth,
  checkTelegramHealth,
  checkWhatsAppHealth,
  checkInAppHealth
} from "@/lib/integration-health";

export async function GET() {
  const sessionUser = await getSessionUser();
  const userId = sessionUser?.id;

  const emailHealth = await checkEmailHealth(userId);
  const calendarHealth = await checkGoogleCalendarHealth(userId);
  const telegramHealth = await checkTelegramHealth(userId);
  const whatsappHealth = await checkWhatsAppHealth(userId);
  const inAppHealth = checkInAppHealth();

  const notifications = getNotificationStatus();

  return NextResponse.json({
    success: true,
    data: {
      email: {
        provider: "email",
        ...emailHealth,
        unreadCount: notifications.unreadCount,
      },
      telegram: {
        provider: "telegram",
        ...telegramHealth,
      },
      googleCalendar: {
        provider: "google_calendar",
        ...calendarHealth,
      },
      whatsapp: {
        provider: "whatsapp",
        ...whatsappHealth,
      },
      inApp: {
        provider: "in_app",
        ...inAppHealth,
        unreadCount: notifications.unreadCount,
        queueSize: notifications.inAppQueueSize,
      },
    },
    timestamp: new Date().toISOString(),
  });
}
