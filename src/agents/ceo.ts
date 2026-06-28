// CEO Agent — The brain of Calmant.
// Receives every user message, classifies intent, delegates to the right department.
// Never does the work itself — it orchestrates.

import { Agent } from "@mastra/core/agent";
import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { prisma } from "../lib/prisma";
import { getModel, llmJSON } from "./model-router";
import { buildUserContext, formatContextForPrompt } from "../lib/agent-context";

// Import all department agents
import { captureAgent } from "./departments/capture";
import { deadlineAgent } from "./departments/deadline";
import { commsAgent } from "./departments/comms";
import { recoveryAgent } from "./departments/recovery";
import { intelAgent } from "./departments/intel";
import { creatorAgent } from "./departments/creator";
import { browserAgent } from "./departments/browser";

// --- Department registry ---

const departments: Record<string, Agent> = {
  capture: captureAgent,
  deadline: deadlineAgent,
  comms: commsAgent,
  recovery: recoveryAgent,
  intel: intelAgent,
  creator: creatorAgent,
  browser: browserAgent,
};

// --- CEO's delegation tool ---

const delegateTool = createTool({
  id: "delegate",
  description: `Delegate a task to a specific department. Available departments:
- capture: Parse inputs, create tasks, extract info from URLs
- deadline: Plan, schedule, check calendar, decompose tasks, mark done
- comms: Send Telegram/email, schedule reminders
- recovery: Handle overdue tasks, reschedule, crisis management
- intel: Store/search memory, summarize URLs, research, query learnings
- creator: Generate documents, summaries, reports, outlines
- browser: Navigate websites, fill forms, take screenshots, extract page data`,
  inputSchema: z.object({
    department: z.enum(["capture", "deadline", "comms", "recovery", "intel", "creator", "browser"]),
    objective: z.string().describe("Clear instruction for the department"),
  }),
  execute: async (data: any, ctx: any) => {
    const combined = ctx.runId || "";
    const parts = combined.split("|");
    const runId = parts.length === 2 ? parts[0] : combined;
    const userId = parts.length === 2 ? parts[1] : combined;

    const agent = departments[data.department];
    if (!agent) return { error: `Unknown department: ${data.department}` };

    // Track the department run
    const deptRun = await prisma.departmentRun.create({
      data: {
        userId,
        parentRunId: runId !== userId ? runId : null,
        department: data.department,
        objective: data.objective,
        status: "running",
        startedAt: new Date(),
      },
    });

    try {
      // Execute the department agent with the same runId context
      const result = await agent.generate(data.objective, { runId: combined });
      const output = result.text || "(No response)";

      // Update department run
      await prisma.departmentRun.update({
        where: { id: deptRun.id },
        data: {
          status: "completed",
          output: { response: output },
          completedAt: new Date(),
        },
      });

      return {
        department: data.department,
        result: output,
      };
    } catch (error: any) {
      await prisma.departmentRun.update({
        where: { id: deptRun.id },
        data: {
          status: "failed",
          output: { error: error?.message || String(error) },
          completedAt: new Date(),
        },
      });
      return { department: data.department, error: error?.message || "Department failed" };
    }
  },
});

// --- CEO Agent ---

export const ceoAgent = new Agent({
  id: "ceoAgent",
  name: "CEO — Calmant AI Company",
  instructions: `You are the CEO of Calmant — the user's personal AI company. You are NOT a chatbot. You are the person behind the screen who makes things happen.

## Your Identity
- You are warm, direct, and proactive.
- You speak like a trusted chief of staff, not a robot.
- You never say "I'm an AI" or "As an AI assistant."
- You never say "Would you like me to..." — you just DO things and tell the user what you did.
- You remember everything about the user and reference it naturally.

## How You Work
You have 7 departments at your disposal. You NEVER do the work yourself — you delegate to the right department:

- **capture** → When the user mentions creating, scheduling, or tracking something. When they share a URL. When they want something captured.
- **deadline** → When they ask about their tasks, schedule, calendar. When they say they finished something. When they need planning.
- **comms** → When they need to send a message, email, or schedule a reminder. When you need to notify them about something.
- **recovery** → When they missed a deadline or feel overwhelmed. When overdue tasks need triage.
- **intel** → When they share personal info you should remember. When they ask "what did I tell you about X?" When they want to summarize or research something.
- **creator** → When they want a document, report, outline, summary, email draft, or presentation.
- **browser** → When they need you to open a website, fill a form, sign up for something, or extract data from a web page. ALWAYS requires user approval before submitting forms.

## CRITICAL: Honest Failure Rules
1. If a task is genuinely outside your capabilities (e.g., "hack this website", "make a payment", "call someone on the phone"), say so IMMEDIATELY. Do NOT attempt it, do NOT loop, do NOT pretend you're working on it.
2. If a delegation fails, you may retry ONCE with a different approach. After that, tell the user honestly what happened and what options remain.
3. NEVER create busy work to hide inability. If you can't do something, say: "I can't do [X] because [reason]. Here's what I CAN do instead: [alternatives]."
4. If a task would require capabilities you don't have yet (like browsing the web, making phone calls, accessing external apps), be upfront: "I don't have [capability] yet, but I can [alternative]."

## What You CAN Do
- Create, plan, schedule, and track tasks
- Decompose complex work into subtasks
- Check and manage Google Calendar
- Send messages via Telegram and email
- Schedule future reminders
- Store and recall user memories/preferences
- Generate documents, summaries, outlines, reports
- Navigate websites, fill forms, take screenshots (via Browser Dept)
- Summarize web page content
- Analyze and rescue overdue tasks
- Learn user patterns and improve over time

## What You CANNOT Do (Yet)
- Make phone calls
- Access the user's personal files on their computer
- Make purchases or payments
- Access social media accounts on the user's behalf
- Send messages to people the user hasn't connected

## Learning System
After every meaningful interaction, delegate to intel to store what you learned:
- If a method worked well for a task → store as a "method" memory: "For [task type], [approach] worked well"
- If the user corrected you → store as a "preference" memory: "User prefers [X] over [Y]"
- If a tool failed → store as a "pattern" memory: "Tool [X] fails for [scenario], use [Y] instead"
- If you discover a user habit → store as a "pattern" memory

This way, every future interaction benefits from past experience. You get SMARTER over time.

## Rules
1. ALWAYS delegate. You are the orchestrator, not the executor.
2. For multi-step tasks, chain multiple delegations. Max 4 delegations per request — if you need more, the task is too complex and should be broken into separate conversations.
3. After every delegation, synthesize the department's response into a natural, human reply.
4. Store learnings via intel after every meaningful interaction — this is how you grow.
5. Be proactive: if you see an overdue task while answering, mention it. If you notice a pattern, flag it.
6. Keep responses concise. No walls of text. Action over advice.
7. Use the user's name when you know it. Reference past interactions naturally.
8. When delegating, write a clear, specific objective for the department — not a vague instruction.
9. When intel returns relevant memories about past methods, USE them. Don't re-discover what you already know.`,
  model: getModel("smart"),
  tools: { delegate: delegateTool },
});

// --- Main entry point (replaces old agentReply) ---

const MAX_REPLY_TIMEOUT_MS = 120_000; // 2 minutes max for any reply

export async function agentReply(message: string, userId: string): Promise<string> {
  // Create an AgentRun record
  const run = await prisma.agentRun.create({
    data: { userId, prompt: message, status: "running" },
  });

  try {
    // Build user context
    const ctx = await buildUserContext(userId);
    const contextPrompt = formatContextForPrompt(ctx);

    // Pull relevant learned methods from knowledge graph
    const relevantMemories = await prisma.agentMemory.findMany({
      where: {
        userId,
        category: { in: ["method", "pattern", "preference"] },
      },
      orderBy: { updatedAt: "desc" },
      take: 10,
    });

    const learningsSection = relevantMemories.length > 0
      ? `\n\nLEARNED METHODS & PATTERNS (use these — they worked before):\n${relevantMemories.map((m) => `- [${m.category}] ${m.fact}`).join("\n")}`
      : "";

    // Create the full prompt with context + learnings
    const fullPrompt = `${contextPrompt}${learningsSection}\n\nUser message: ${message}`;

    // Run the CEO agent with timeout protection
    const result = await Promise.race([
      ceoAgent.generate(fullPrompt, { runId: `${run.id}|${userId}` }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Agent response timed out after 2 minutes")), MAX_REPLY_TIMEOUT_MS)
      ),
    ]);

    const response = result.text || "I processed your request but have nothing to report.";

    // Update the run
    await prisma.agentRun.update({
      where: { id: run.id },
      data: { response, status: "completed" },
    });

    return response;
  } catch (error: any) {
    console.error("[CEO] Agent error:", error);

    const isTimeout = error?.message?.includes("timed out");
    const userMessage = isTimeout
      ? "That took too long and I had to stop. This usually means the task is too complex for a single request. Can you break it into smaller pieces? For example, tell me the first step you need."
      : "I ran into an issue. I've logged it so I can learn from it. Can you try rephrasing, or tell me a simpler version of what you need?";

    await prisma.agentRun.update({
      where: { id: run.id },
      data: {
        response: `Error: ${error?.message || "Unknown error"}`,
        status: "failed",
      },
    });

    // Store the failure as a learning
    try {
      await prisma.agentMemory.create({
        data: {
          userId,
          fact: `Agent failed on: "${message.slice(0, 100)}" — Error: ${error?.message?.slice(0, 200) || "unknown"}`,
          category: "pattern",
        },
      });
    } catch {
      // Don't let learning-storage failure crash the error handler
    }

    return userMessage;
  }
}

