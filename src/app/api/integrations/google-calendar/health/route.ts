import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";
import { getUpcomingEvents } from "@/lib/calendar";

export async function POST() {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    try {
      // Try to fetch 3 events to prove read access
      await getUpcomingEvents(sessionUser.id, 3);
      
      const existingConnection = await prisma.integrationConnection.findFirst({
        where: { userId: sessionUser.id, provider: "google_calendar" },
      });

      if (existingConnection) {
        await prisma.integrationConnection.update({
          where: { id: existingConnection.id },
          data: {
            status: "live_verified",
            lastSuccessAt: new Date(),
            lastCheckedAt: new Date(),
            lastError: null,
          },
        });
      } else {
        await prisma.integrationConnection.create({
          data: {
            userId: sessionUser.id,
            provider: "google_calendar",
            status: "live_verified",
            lastSuccessAt: new Date(),
            lastCheckedAt: new Date(),
          },
        });
      }

      return NextResponse.json({ success: true });
    } catch (apiError: any) {
      console.error("Calendar Health API Error:", apiError);
      const message = apiError instanceof Error ? apiError.message : "Failed to read calendar";
      
      const existingConnection = await prisma.integrationConnection.findFirst({
        where: { userId: sessionUser.id, provider: "google_calendar" },
      });

      if (existingConnection) {
        await prisma.integrationConnection.update({
          where: { id: existingConnection.id },
          data: {
            status: "degraded",
            lastFailureAt: new Date(),
            lastCheckedAt: new Date(),
            lastError: message,
          },
        });
      }

      return NextResponse.json({
        success: false,
        error: message,
      }, { status: 500 });
    }
  } catch (error) {
    console.error("Calendar Health Internal Error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
