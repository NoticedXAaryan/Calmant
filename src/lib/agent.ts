import { Mastra } from "@mastra/core";
import { Agent } from "@mastra/core/agent";
import { createTool } from "@mastra/core/tools";
import { prisma } from "./prisma";
import { z } from "zod";

// --- Tools ---

const getTasksTool = createTool({
  id: "get_tasks",
  description: "Fetch the user's current tasks, sorted by urgency score.",
  inputSchema: z.object({ limit: z.number().optional() }),
  execute: async (data, { context }: any) => {
    const userId = context?.userId as string;
    if (!userId) throw new Error("Missing userId in context");

    const tasks = await prisma.task.findMany({
      where:   { userId, status: { in: ["PENDING", "IN_PROGRESS"] } },
      orderBy: { entropyScore: "desc" },
      take:    context.limit ?? 10,
      include: { subtasks: true },
    });
    return tasks.map((t) => ({
      id: t.id, title: t.title,
      deadline: t.deadline.toISOString(),
      entropyScore: t.entropyScore,
      subtasks: t.subtasks.map((s) => s.title),
    }));
  },
});

const decomposeTaskTool = createTool({
  id: "decompose_task",
  description: "Break a task into concrete subtasks and persist them.",
  inputSchema: z.object({ taskId: z.string() }),
  execute: async (data, { context }: any) => {
    const task = await prisma.task.findUniqueOrThrow({ where: { id: data.taskId } });
    
    const prompt = `Break this task into 3-5 concrete steps. Return ONLY valid JSON.
Schema: { "subtasks": [{ "title": string }] }
Task: "${task.title}" — due ${task.deadline.toISOString()}`;
    
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" }
      })
    });
    const resultData = await res.json();
    const text = resultData.choices[0].message.content;
    const parsed = JSON.parse(text.replace(/```json|```/g, "").trim());
    
    await prisma.subtask.deleteMany({ where: { taskId: task.id } });
    await prisma.subtask.createMany({
      data: parsed.subtasks.map((s: { title: string }) => ({
        taskId: task.id, title: s.title,
      })),
    });
    return { decomposed: parsed.subtasks.length, taskId: task.id };
  },
});

const markDoneTool = createTool({
  id: "mark_done",
  description: "Mark a task as completed by fuzzy-matching its title.",
  inputSchema: z.object({ query: z.string() }),
  execute: async (data, { context }: any) => {
    const userId = context?.userId as string;
    if (!userId) throw new Error("Missing userId in context");

    const tasks = await prisma.task.findMany({
      where: { userId, status: { in: ["PENDING", "IN_PROGRESS"] } },
    });
    const match = tasks.find((t) =>
      t.title.toLowerCase().includes(data.query.toLowerCase())
    );
    if (!match) return { error: "No matching task found" };
    
    await prisma.task.update({
      where: { id: match.id },
      data:  { status: "DONE", completedAt: new Date() },
    });
    return { done: match.title };
  },
});

const draftTaskTool = createTool({
  id: "draft_task",
  description: "Drafts a new task but requires user confirmation. Use this when the user asks to create or schedule a task.",
  inputSchema: z.object({
    title: z.string(),
    deadline: z.string().describe("ISO datetime string"),
    estimatedMins: z.number().optional(),
  }),
  execute: async (data, { context }: any) => {
    const userId = context?.userId as string;
    if (!userId) throw new Error("Missing userId in context");

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
      message: `Drafted: "${task.title}" for ${task.deadline.toLocaleString()}. Please ask the user to reply 'yes' to confirm.`,
      taskId: task.id,
    };
  },
});

const confirmTaskTool = createTool({
  id: "confirm_task",
  description: "Confirms a DRAFT task and moves it to PENDING.",
  inputSchema: z.object({ taskId: z.string().optional() }),
  execute: async (data, { context }: any) => {
    const userId = context?.userId as string;
    if (!userId) throw new Error("Missing userId in context");

    let idToConfirm = data.taskId;
    
    if (!idToConfirm) {
      const latestDraft = await prisma.task.findFirst({
        where: { userId, status: "DRAFT" },
        orderBy: { createdAt: "desc" },
      });
      if (!latestDraft) return { error: "No pending drafts found to confirm." };
      idToConfirm = latestDraft.id;
    }

    const task = await prisma.task.update({
      where: { id: idToConfirm },
      data: { status: "PENDING" },
    });
    
    return { confirmed: task.title, status: task.status };
  },
});

const checkCalendarTool = createTool({
  id: "check_calendar",
  description: "Check the user's Google Calendar for upcoming events to avoid scheduling conflicts.",
  inputSchema: z.object({ limit: z.number().optional() }),
  execute: async (data, { context }: any) => {
    const userId = context?.userId as string;
    if (!userId) throw new Error("Missing userId in context");

    try {
      const { getUpcomingEvents } = await import("./calendar");
      const events = await getUpcomingEvents(userId, data.limit || 5);
      return events.map((e: any) => ({
        summary: e.summary,
        start: e.start.dateTime || e.start.date,
        end: e.end.dateTime || e.end.date,
      }));
    } catch (error: any) {
      return { error: error.message || "Failed to fetch calendar." };
    }
  },
});

// --- Agent ---

export const lifeSaverAgent = new Agent({
  id: "lifeSaverAgent",
  name: "Life Saver",
  instructions: `You are an AI productivity assistant. You help users manage tasks, track habits, and never miss deadlines. Be concise — replies go to WhatsApp.
Always act: 
- If the user wants to add/create a task, use 'draft_task' and tell them to reply 'yes' to confirm.
- If the user replies 'yes' or confirms, use 'confirm_task'.
- If the user says "plan X", call decompose_task.
- If they say "done X", call mark_done. 
- You can use 'check_calendar' to see their schedule before suggesting deadlines.
Never just describe what you could do.`,
  model: {
    provider: "GROQ",
    name: "llama-3.3-70b-versatile",
    toolChoice: "auto",
  } as any,
  tools: { 
    get_tasks: getTasksTool, 
    decompose_task: decomposeTaskTool, 
    mark_done: markDoneTool, 
    draft_task: draftTaskTool, 
    confirm_task: confirmTaskTool,
    check_calendar: checkCalendarTool
  },
});

export const mastra = new Mastra({
  agents: { lifeSaverAgent },
});

export async function agentReply(message: string, userId: string): Promise<string> {
  const agent = mastra.getAgent("lifeSaverAgent");

  try {
    const result = await agent.generate(message, {
      context: { userId },
    } as any);
    
    // Store interaction in AgentMemory for future personalization
    await prisma.agentMemory.create({
      data: {
        userId,
        fact:     `User asked: "${message.slice(0, 100)}"`,
        category: "interaction",
      },
    }).catch(() => {});   // non-blocking
    
    return result.text;
  } catch (err: any) {
    if (err?.status === 429 || err?.message?.includes("429")) {
      return hermesChat(message);
    }
    throw err;
  }
}

async function hermesChat(prompt: string): Promise<string> {
  const url = process.env.HERMES_URL ?? "http://localhost:11434";
  try {
    const res = await fetch(`${url}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: "hermes3", prompt, stream: false }),
    });
    if (!res.ok) return "AI temporarily unavailable. Try again in a moment.";
    const data = await res.json();
    return data.response;
  } catch (e) {
    return "AI temporarily unavailable. Try again in a moment.";
  }
}
