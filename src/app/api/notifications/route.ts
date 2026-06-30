import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/auth-utils";
import { isAuthError, respondUnauthorized } from "@/lib/api-helpers";

export async function GET() {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const notifications = await prisma.notificationDelivery.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return NextResponse.json({
      success: true,
      data: notifications,
    });
  } catch (error) {
    console.error("Failed to fetch notifications:", error);
    if (isAuthError(error)) return respondUnauthorized();
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
