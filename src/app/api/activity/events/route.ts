import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export type ActivityEvent = {
  id: string;
  type: "ai" | "tool" | "automation" | "notification" | "system" | "task";
  title: string;
  summary: string;
  status: "queued" | "running" | "completed" | "failed" | "sent" | "delivered";
  actor: "user" | "assistant" | "automation" | "integration" | "system";
  objectType?: string;
  objectId?: string;
  occurredAt: string;
  metadata?: Record<string, unknown>;
  related?: Array<{ type: string; id: string; label: string }>;
};

export async function GET(req: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const typeFilter = searchParams.get("type");
    const statusFilter = searchParams.get("status");
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    const events: ActivityEvent[] = [];

    // 1. Fetch AgentRuns (type: "ai")
    if (!typeFilter || typeFilter === "ai") {
      const aiRuns = await prisma.agentRun.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: 'desc' },
        take: limit,
        include: { toolCalls: true }
      });
      for (const run of aiRuns) {
        if (!statusFilter || run.status === statusFilter) {
          events.push({
            id: `ai_${run.id}`,
            type: "ai",
            title: "AI Assistant Request",
            summary: run.prompt.substring(0, 100) + (run.prompt.length > 100 ? "..." : ""),
            status: run.status as any,
            actor: "user",
            occurredAt: run.createdAt.toISOString(),
            metadata: {
              response: run.response,
              toolCallsCount: run.toolCalls.length
            }
          });
        }
      }
    }

    // 2. Fetch DepartmentRuns (type: "automation")
    if (!typeFilter || typeFilter === "automation") {
      const deptRuns = await prisma.departmentRun.findMany({
        where: { userId: session.user.id },
        orderBy: { startedAt: 'desc' },
        take: limit
      });
      for (const run of deptRuns) {
        if (!statusFilter || run.status === statusFilter) {
          events.push({
            id: `dept_${run.id}`,
            type: "automation",
            title: `Department Run: ${run.department}`,
            summary: run.objective,
            status: run.status as any,
            actor: "system",
            occurredAt: (run.startedAt || new Date()).toISOString(),
            metadata: { output: run.output }
          });
        }
      }
    }

    // 3. Fetch NotificationDelivery (type: "notification")
    if (!typeFilter || typeFilter === "notification") {
      const notifications = await prisma.notificationDelivery.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: 'desc' },
        take: limit
      });
      for (const notif of notifications) {
        if (!statusFilter || notif.status === statusFilter) {
          events.push({
            id: `notif_${notif.id}`,
            type: "notification",
            title: `Notification via ${notif.channel}`,
            summary: `Intent: ${notif.intent}`,
            status: notif.status as any,
            actor: "system",
            occurredAt: notif.createdAt.toISOString(),
            metadata: { error: notif.error, payload: notif.payload }
          });
        }
      }
    }

    // Sort combined events by occurredAt descending
    events.sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());

    // Slice to limit
    const paginatedEvents = events.slice(0, limit);

    return NextResponse.json({ success: true, data: paginatedEvents });
  } catch (error) {
    console.error("Error fetching activity events:", error);
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
  }
}
