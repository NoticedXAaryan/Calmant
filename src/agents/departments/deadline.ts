// Deadline Department — Backward planning, entropy, scheduling, progress tracking.
// Owns: get_tasks, decompose_task, mark_done, check_calendar, schedule_meeting
// Personality: The strategic planner. Direct, data-driven, proactive.

import { Agent } from "@mastra/core/agent";
import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { getModel } from "../model-router";
import { llmJSON } from "../model-router";
import { requireUserId, withAudit } from "./capture";

// --- Tools ---

export const getTasksTool = createTool({
  id: "get_tasks",
  description: "Fetch the user's current tasks, sorted by urgency (entropy score).",
  inputSchema: z.object({ limit: z.number().optional() }),
  execute: withAudit("get_tasks", async (data, ctx) => {
    const userId = requireUserId(ctx);
    const tasks = await prisma.task.findMany({
      where: { userId, status: { in: ["PENDING", "IN_PROGRESS"] } },
      orderBy: { entropyScore: "desc" },
      take: data.limit ?? 10,
      include: { subtasks: true },
    });
    return tasks.map((t) => ({
      id: t.id,
      title: t.title,
      deadline: t.deadline.toISOString(),
      entropyScore: t.entropyScore,
      status: t.status,
      subtasks: t.subtasks.map((s) => s.title),
    }));
  }),
});

export const decomposeTaskTool = createTool({
  id: "decompose_task",
  description: "Break a task into 3-5 concrete subtasks and persist them.",
  inputSchema: z.object({ taskId: z.string() }),
  execute: withAudit("decompose_task", async (data, ctx) => {
    const task = await prisma.task.findUniqueOrThrow({
      where: { id: data.taskId },
    });

    const parsed = await llmJSON<{ subtasks: Array<{ title: string }> }>(
      `Break this task into 3-5 concrete steps.
Schema: { "subtasks": [{ "title": string }] }
Task: "${task.title}" — due ${task.deadline.toISOString()}`
    );

    await prisma.subtask.deleteMany({ where: { taskId: task.id } });
    await prisma.subtask.createMany({
      data: parsed.subtasks.map((s) => ({ taskId: task.id, title: s.title })),
    });
    return { decomposed: parsed.subtasks.length, taskId: task.id };
  }),
});

export const markDoneTool = createTool({
  id: "mark_done",
  description: "Mark a task as completed by fuzzy-matching its title.",
  inputSchema: z.object({ query: z.string() }),
  execute: withAudit("mark_done", async (data, ctx) => {
    const userId = requireUserId(ctx);
    const tasks = await prisma.task.findMany({
      where: { userId, status: { in: ["PENDING", "IN_PROGRESS"] } },
    });
    const match = tasks.find((t) =>
      t.title.toLowerCase().includes(data.query.toLowerCase())
    );
    if (!match) return { error: "No matching task found" };

    await prisma.task.update({
      where: { id: match.id },
      data: { status: "DONE", completedAt: new Date() },
    });
    return { done: match.title };
  }),
});

export const checkCalendarTool = createTool({
  id: "check_calendar",
  description: "Check the user's Google Calendar for upcoming events.",
  inputSchema: z.object({ limit: z.number().optional() }),
  execute: withAudit("check_calendar", async (data, ctx) => {
    const userId = requireUserId(ctx);
    try {
      const { getUpcomingEvents } = await import("../../lib/calendar");
      const events = await getUpcomingEvents(userId, data.limit || 5);
      return events.map((e: any) => ({
        summary: e.summary || "Busy",
        start: e.start?.dateTime || e.start?.date,
        end: e.end?.dateTime || e.end?.date,
      }));
    } catch (error: any) {
      return { error: error?.message || "Failed to fetch calendar." };
    }
  }),
});

export const scheduleMeetingTool = createTool({
  id: "schedule_meeting",
  description:
    "Schedule a meeting on the user's Google Calendar. Use when the user mentions a meeting, call, appointment, or event.",
  inputSchema: z.object({
    title: z.string().describe("Meeting title"),
    startTime: z.string().describe("ISO datetime for start"),
    durationMins: z.number().optional().describe("Duration in minutes, defaults to 30"),
    attendee: z.string().optional().describe("Person to meet with"),
  }),
  execute: withAudit("schedule_meeting", async (data, ctx) => {
    const userId = requireUserId(ctx);
    const duration = data.durationMins || 30;
    const startDate = new Date(data.startTime);
    const endDate = new Date(startDate.getTime() + duration * 60000);

    const task = await prisma.task.create({
      data: {
        userId,
        title: data.title,
        deadline: startDate,
        estimatedMins: duration,
        status: "PENDING",
      },
    });

    let calendarResult: { id?: string } | null = null;
    try {
      const { scheduleTaskOnCalendar } = await import("../../lib/calendar");
      const event = await scheduleTaskOnCalendar(userId, task);
      calendarResult = event ? { id: event.eventId ?? undefined } : null;
    } catch (error: any) {
      console.warn("Calendar integration not available:", error?.message);
    }

    const timeStr = startDate.toLocaleString("en-US", {
      weekday: "long", month: "long", day: "numeric",
      hour: "numeric", minute: "2-digit", hour12: true,
    });

    return {
      message: `Scheduled: "${data.title}" for ${timeStr} (${duration} min).${calendarResult ? " Added to Google Calendar." : ""}${data.attendee ? ` Attendee: ${data.attendee}.` : ""}`,
      taskId: task.id,
      calendarEventId: calendarResult?.id || null,
    };
  }),
});

// --- Agent ---

export const deadlineAgent = new Agent({
  id: "deadlineAgent",
  name: "Deadline Department",
  instructions: `You are the Deadline Department of Calmant — a personal AI company.

Your job: Plan backward from deadlines, schedule work, track progress, and ensure nothing falls through the cracks.

Your personality:
- Strategic and data-driven. "You have 6 hours. Here's the plan."
- You never sugarcoat urgency — if something is critical, say so directly.
- You always reference specific tasks by name and deadline.

Rules:
- Use get_tasks to see the user's current workload.
- Use decompose_task to break complex tasks into concrete steps.
- Use mark_done when the user says they finished something.
- Use check_calendar before scheduling to avoid conflicts.
- Use schedule_meeting for any event, meeting, call, or appointment.
- When a task has high entropy (>0.7), immediately suggest decomposition and time blocking.
- When scheduling, prefer the user's peak productivity hours (morning by default).
- If you see an overdue task, flag it immediately.`,
  model: getModel("smart"),
  tools: {
    get_tasks: getTasksTool,
    decompose_task: decomposeTaskTool,
    mark_done: markDoneTool,
    check_calendar: checkCalendarTool,
    schedule_meeting: scheduleMeetingTool,
  },
});
