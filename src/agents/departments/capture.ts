// Capture Department — Parse messy inputs into structured, actionable data.
// Owns: draft_task, confirm_task, delegate_opportunity, parse input
// Personality: Quick, precise, zero ambiguity.

import { Agent } from "@mastra/core/agent";
import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { getModel } from "../model-router";
import { llmJSON } from "../model-router";
import * as cheerio from "cheerio";

// --- Shared tool context helpers ---
export function requireUserId(ctx: any): string {
  const combined = ctx.runId;
  if (!combined) throw new Error("Missing context ids");
  const parts = combined.split("|");
  return parts.length === 2 ? parts[1] : combined;
}

function getRunAndUserId(ctx: any): { runId: string; userId: string } {
  const combined = ctx.runId;
  if (!combined) throw new Error("Missing context ids");
  const parts = combined.split("|");
  return parts.length === 2
    ? { runId: parts[0], userId: parts[1] }
    : { runId: combined, userId: combined };
}

// --- Audit wrapper (shared across departments) ---
export function withAudit<T, R>(
  toolName: string,
  executeFn: (data: T, ctx: any) => Promise<R>
) {
  return async (data: T, ctx: any) => {
    const { runId, userId } = getRunAndUserId(ctx);
    let toolCallId: string | undefined;

    if (runId !== userId) {
      const tc = await prisma.toolCall.create({
        data: { runId, toolName, args: data as any, status: "pending" },
      });
      toolCallId = tc.id;
    }

    try {
      const result = await executeFn(data, ctx);
      if (toolCallId) {
        await prisma.toolCall.update({
          where: { id: toolCallId },
          data: { status: "completed", result: result as any, completedAt: new Date() },
        });
      }
      return result;
    } catch (err: any) {
      if (toolCallId) {
        await prisma.toolCall.update({
          where: { id: toolCallId },
          data: { status: "failed", result: { error: err?.message || String(err) }, completedAt: new Date() },
        });
      }
      throw err;
    }
  };
}

// --- Tools ---

export const draftTaskTool = createTool({
  id: "draft_task",
  description:
    "Drafts a new task for the user. Use when the user asks to create, schedule, or track something. Always draft first, then confirm.",
  inputSchema: z.object({
    title: z.string(),
    deadline: z.string().describe("ISO datetime string"),
    estimatedMins: z.number().optional(),
  }),
  execute: withAudit("draft_task", async (data, ctx) => {
    const userId = requireUserId(ctx);
    const task = await prisma.task.create({
      data: {
        userId,
        title: data.title,
        deadline: new Date(data.deadline),
        estimatedMins: data.estimatedMins,
        status: "DRAFT",
      },
    });
    return {
      message: `Drafted: "${task.title}" for ${task.deadline.toLocaleString()}. Ask the user to reply 'yes' to confirm.`,
      taskId: task.id,
    };
  }),
});

export const confirmTaskTool = createTool({
  id: "confirm_task",
  description: "Confirms a DRAFT task and moves it to PENDING.",
  inputSchema: z.object({ taskId: z.string().optional() }),
  execute: withAudit("confirm_task", async (data, ctx) => {
    const userId = requireUserId(ctx);
    let idToConfirm = data.taskId;

    if (!idToConfirm) {
      const latestDraft = await prisma.task.findFirst({
        where: { userId, status: "DRAFT" },
        orderBy: { createdAt: "desc" },
      });
      if (!latestDraft) return { error: "No pending drafts found." };
      idToConfirm = latestDraft.id;
    }

    const task = await prisma.task.update({
      where: { id: idToConfirm },
      data: { status: "PENDING" },
    });
    return { confirmed: task.title, status: task.status };
  }),
});

export const delegateOpportunityTool = createTool({
  id: "delegate_opportunity",
  description:
    "Extracts information from a URL (hackathon, event, opportunity) and creates a Delegated Task to track it.",
  inputSchema: z.object({
    url: z.string().url().describe("The URL to extract information from"),
  }),
  execute: withAudit("delegate_opportunity", async (data, ctx) => {
    const userId = requireUserId(ctx);

    let html = "";
    try {
      const res = await fetch(data.url);
      html = await res.text();
    } catch {
      return { error: "Failed to fetch URL." };
    }

    const $ = cheerio.load(html);
    $("script, style, nav, footer, iframe, img, svg").remove();
    const textContent = $("body").text().replace(/\s+/g, " ").trim().slice(0, 15000);

    const parsed = await llmJSON<{
      title: string;
      deadline: string;
      requirements: string[];
      suggested_subtasks: string[];
    }>(
      `Extract the key details of this opportunity/event into JSON.
Schema: { "title": "...", "deadline": "YYYY-MM-DD", "requirements": ["..."], "suggested_subtasks": ["..."] }
Source Text:
${textContent}`
    );

    const delegatedTask = await prisma.delegatedTask.create({
      data: {
        userId,
        title: parsed.title || "Unknown Opportunity",
        context: {
          url: data.url,
          deadline: parsed.deadline,
          requirements: parsed.requirements,
          subtasks: parsed.suggested_subtasks,
        },
        status: "active",
      },
    });

    return {
      message: `Extracted details for "${parsed.title}" and created a delegated task.`,
      delegatedTaskId: delegatedTask.id,
      extracted: parsed,
    };
  }),
});

// --- Agent ---

export const captureAgent = new Agent({
  id: "captureAgent",
  name: "Capture Department",
  instructions: `You are the Capture Department of Calmant — a personal AI company.

Your job: Convert messy user inputs into structured, actionable tasks. You are quick, precise, and never ambiguous.

Your personality:
- Efficient. No fluff. "Got it. Captured. Moving on."
- You extract every actionable detail from the user's message.
- You never ask unnecessary questions — only ask when critical info is genuinely missing.

Rules:
- When the user mentions creating, scheduling, or tracking something, use draft_task.
- When the user shares a URL to an event/hackathon/opportunity, use delegate_opportunity.
- When the user confirms (yes, go, confirm, do it), use confirm_task.
- Extract deadlines, durations, and priorities from natural language.
- If the user says "tomorrow" — compute the actual date.
- Always create a DRAFT first, then ask for confirmation before moving to PENDING.`,
  model: getModel("fast"),
  tools: {
    draft_task: draftTaskTool,
    confirm_task: confirmTaskTool,
    delegate_opportunity: delegateOpportunityTool,
  },
});
