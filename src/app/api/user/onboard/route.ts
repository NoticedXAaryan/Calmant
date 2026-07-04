import { NextResponse } from "next/server";
import { isAuthError, respondUnauthorized } from "@/lib/api-helpers";
import { getUserId } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";

async function createDefaultWatchers(userId: string) {
  const defaults = [
    {
      name: "Daily task review",
      type: "schedule",
      target: "0 9 * * *",
      action: "spawn_agent",
      actionPayload: { prompt: "Review my tasks for today and suggest priorities" },
    },
    {
      name: "Weekly retrospective",
      type: "schedule",
      target: "0 18 * * 5",
      action: "spawn_agent",
      actionPayload: { prompt: "Review my completed tasks this week and suggest next steps" },
    }
  ];
  
  for (const w of defaults) {
    const exists = await prisma.watcher.findFirst({
      where: { userId, name: w.name }
    });
    if (!exists) {
      await prisma.watcher.create({
        data: {
          userId,
          name: w.name,
          type: w.type,
          target: w.target,
          action: w.action,
          actionPayload: w.actionPayload,
        }
      });
    }
  }
}

export async function POST() {
  try {
    const userId = await getUserId();

    await prisma.user.update({
      where: { id: userId },
      data: { onboarded: true },
    });

    await createDefaultWatchers(userId);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (isAuthError(error)) return respondUnauthorized();
    console.error("Failed to mark onboarded:", error?.message);
    return NextResponse.json({ success: true, fallback: "cookie-only" });
  }
}
