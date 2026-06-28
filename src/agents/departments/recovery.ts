// Recovery Department — Handle overdue tasks and crisis situations.
// Owns: analyze_overdue, reschedule_task
// Personality: No blame, all action.

import { Agent } from "@mastra/core/agent";
import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { getModel, llmChat } from "../model-router";
import { requireUserId, withAudit } from "./capture";

// --- Tools ---

export const analyzeOverdueTool = createTool({
  id: "analyze_overdue",
  description: "Analyze all overdue tasks and produce a rescue plan.",
  inputSchema: z.object({}),
  execute: withAudit("analyze_overdue", async (_data, ctx) => {
    const userId = requireUserId(ctx);
    const overdue = await prisma.task.findMany({
      where: {
        userId,
        status: { in: ["PENDING", "IN_PROGRESS"] },
        deadline: { lt: new Date() },
      },
      orderBy: { deadline: "asc" },
      include: { subtasks: true },
    });

    if (overdue.length === 0) return { status: "clean", message: "No overdue tasks!" };

    const taskSummary = overdue
      .map((t) => {
        const overdueMins = Math.round((Date.now() - t.deadline.getTime()) / 60000);
        return `- "${t.title}" — ${overdueMins}min overdue, ${t.subtasks.length} subtasks`;
      })
      .join("\n");

    const plan = await llmChat(
      `The user has ${overdue.length} overdue tasks. Propose a concise rescue plan.
No shaming. Just action. What can still be saved, what should be rescheduled, what should be dropped.

Overdue tasks:
${taskSummary}`,
      { systemPrompt: "You are a crisis manager. Be direct, empathetic, and solution-focused." }
    );

    return {
      overdue: overdue.map((t) => ({ id: t.id, title: t.title, deadline: t.deadline.toISOString() })),
      rescuePlan: plan,
    };
  }),
});

export const rescheduleTaskTool = createTool({
  id: "reschedule_task",
  description: "Reschedule an overdue or problematic task to a new deadline.",
  inputSchema: z.object({
    taskId: z.string(),
    newDeadline: z.string().describe("New ISO datetime deadline"),
    reason: z.string().optional().describe("Why we are rescheduling"),
  }),
  execute: withAudit("reschedule_task", async (data, ctx) => {
    const userId = requireUserId(ctx);
    const task = await prisma.task.findFirst({
      where: { id: data.taskId, userId },
    });
    if (!task) return { error: "Task not found" };

    const oldDeadline = task.deadline;
    await prisma.task.update({
      where: { id: task.id },
      data: {
        deadline: new Date(data.newDeadline),
        status: "PENDING",
        entropyScore: Math.max(0, task.entropyScore - 0.2),
      },
    });

    // Store the reschedule as an audit event
    await prisma.auditEvent.create({
      data: {
        userId,
        action: "task_rescheduled",
        targetType: "task",
        targetId: task.id,
        details: {
          oldDeadline: oldDeadline.toISOString(),
          newDeadline: data.newDeadline,
          reason: data.reason || "Recovery reschedule",
        },
      },
    });

    return {
      rescheduled: task.title,
      from: oldDeadline.toISOString(),
      to: data.newDeadline,
    };
  }),
});

// --- Agent ---

export const recoveryAgent = new Agent({
  id: "recoveryAgent",
  name: "Recovery Department",
  instructions: `You are the Recovery Department of Calmant — a personal AI company.

Your job: Handle overdue tasks, missed deadlines, and crisis situations. You never shame the user.

Your personality:
- No blame, all action. "We missed this. Here's what we can still save."
- You are calm under pressure.
- You focus on what is still possible, not what was lost.

Rules:
- Use analyze_overdue to assess the damage and propose a rescue plan.
- Use reschedule_task to move overdue tasks to realistic new deadlines.
- Never tell the user "you should have done this earlier." Focus on forward action.
- When rescheduling, reduce entropy scores to give the user a fresh start.
- Always propose concrete next steps — never vague advice.
- If a task is truly unsalvageable, say so honestly and suggest marking it as SKIPPED.`,
  model: getModel("smart"),
  tools: {
    analyze_overdue: analyzeOverdueTool,
    reschedule_task: rescheduleTaskTool,
  },
});
