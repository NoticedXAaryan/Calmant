import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateEntropy } from "@/lib/entropy";
import { isEmailConfigured, sendEmail } from "@/lib/email";
import {
  analyzeTaskCommand,
  parseTaskCommandFallback,
  type ParsedTaskCommand,
} from "@/lib/task-planning";
import Groq from "groq-sdk";

interface ConfirmedDraft {
  title: string;
  deadline: string;
  estimatedMins: number;
  priority?: number;
  description?: string;
}

async function parseWithGroq(command: string): Promise<ParsedTaskCommand | null> {
  if (!process.env.GROQ_API_KEY) return null;

  try {
    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    const prompt = `Extract a task from the user's natural language command.
Return only valid JSON.
Current time: ${new Date().toISOString()}

Schema:
{
  "title": "clear concise task title",
  "deadline": "ISO datetime string",
  "estimatedMins": number,
  "priority": number
}

Rules:
- If the user mentions an exam, meeting, interview, or appointment at a time, use that as the deadline/event time.
- If the user says "remind me in X minutes", do not treat X as the task duration unless they clearly say the work takes X minutes.
- If deadline is unclear, default to today at 23:59.
- If duration is unclear, infer a realistic effort estimate.
- priority is 0.0 to 1.0 based on urgency and importance.

Command: "${command}"`;

    const chatCompletion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.3-70b-versatile",
      response_format: { type: "json_object" },
    });

    const text = chatCompletion.choices[0].message.content || "{}";
    const parsed = JSON.parse(text);

    if (!parsed.title || !parsed.deadline) return null;

    return {
      title: String(parsed.title),
      deadline: new Date(parsed.deadline),
      estimatedMins: Number(parsed.estimatedMins) || 45,
      priority: Number(parsed.priority) || 0.5,
    };
  } catch (error) {
    console.warn("[NLP Task Fallback]", error);
    return null;
  }
}

function serializeDraft(parsed: ParsedTaskCommand, description?: string) {
  return {
    title: parsed.title,
    deadline: parsed.deadline.toISOString(),
    estimatedMins: parsed.estimatedMins,
    priority: parsed.priority,
    description: description || "",
  };
}

async function createConfirmedTask(userId: string, draft: ConfirmedDraft) {
  const created = await prisma.task.create({
    data: {
      userId,
      title: draft.title,
      description: draft.description || "",
      deadline: new Date(draft.deadline),
      estimatedMins: draft.estimatedMins,
      priority: draft.priority ?? 0.5,
      status: "PENDING",
    },
    include: { subtasks: true },
  });

  const task = await prisma.task.update({
    where: { id: created.id },
    data: { entropyScore: calculateEntropy(created) },
    include: { subtasks: true },
  });

  const notification = isEmailConfigured()
    ? await sendEmail(
        `Captured: ${task.title}`,
        `<p>Your task was captured and added to Calmant.</p>
         <p><strong>${task.title}</strong></p>
         <p>Deadline: ${task.deadline.toLocaleString()}</p>
         <p>Estimated effort: ${task.estimatedMins ?? 60} minutes</p>`
      )
    : { sent: false, reason: "Email is not configured" };

  return { task, notification };
}

export async function POST(req: Request) {
  try {
    const session = await auth.api.getSession({
      headers: req.headers,
    });

    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    if (body.confirmed) {
      const result = await createConfirmedTask(session.user.id, body.draft as ConfirmedDraft);
      return NextResponse.json({
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
      });
    }

    const command = body.command;
    if (!command || typeof command !== "string") {
      return NextResponse.json({ success: false, error: "Command is required" }, { status: 400 });
    }

    const parsed = (await parseWithGroq(command)) ?? parseTaskCommandFallback(command);
    const analysis = analyzeTaskCommand(command, parsed);

    return NextResponse.json({
      success: true,
      data: {
        draft: serializeDraft(parsed, command),
        analysis,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[NLP Task Error]", error);
    return NextResponse.json(
      { success: false, error: "Failed to parse task", timestamp: new Date().toISOString() },
      { status: 500 }
    );
  }
}
