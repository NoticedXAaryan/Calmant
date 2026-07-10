import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export type ActivityEvent = {
  id: string;
  type: string;
  title: string;
  summary: string;
  status: string;
  actor: "user" | "assistant" | "automation" | "integration" | "system";
  occurredAt: string;
  metadata?: Record<string, unknown>;
  level: "debug" | "info" | "warn" | "error";
};

export async function GET(req: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const typeFilter = searchParams.get("type");
    const levelFilter = searchParams.get("level");
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    const whereClause: any = { userId: session.user.id };
    if (typeFilter) {
      whereClause.type = typeFilter;
    }
    if (levelFilter) {
      whereClause.level = levelFilter;
    }

    const rawEvents = await prisma.agentEvent.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        run: {
          select: {
            id: true,
            prompt: true,
          }
        }
      }
    });

    const events: ActivityEvent[] = rawEvents.map(event => ({
      id: event.id,
      type: event.type,
      title: `Event: ${event.type}`,
      summary: event.message,
      status: "completed", // Since it's an event log, it's inherently completed
      actor: "system", // Or determine based on event type
      occurredAt: event.createdAt.toISOString(),
      metadata: (event.metadata as Record<string, unknown>) || undefined,
      level: event.level as any,
    }));

    return NextResponse.json({ success: true, data: events });
  } catch (error) {
    console.error("Error fetching activity events:", error);
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
  }
}
