import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Groq from "groq-sdk";

export async function POST(req: Request) {
  try {
    const session = await auth.api.getSession({
      headers: req.headers,
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { command } = await req.json();

    if (!command) {
      return NextResponse.json({ error: "Command is required" }, { status: 400 });
    }

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    const prompt = `You are a task parsing AI. The user entered a natural language command to create a task.
Extract the task details and return ONLY a valid JSON object.
Current time: ${new Date().toISOString()}

Schema:
{
  "title": "string (clear and concise)",
  "deadline": "ISO datetime string (infer from text, default to end of day if unclear)",
  "estimatedMins": "number (infer or 30 default)",
  "priority": "number 0.0 to 1.0 (infer urgency, 0.5 default)"
}

User Command: "${command}"`;

    const chatCompletion = await groq.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "llama-3.3-70b-versatile",
      response_format: { type: "json_object" },
    });

    const text = chatCompletion.choices[0].message.content || "{}";
    const parsed = JSON.parse(text);

    const task = await prisma.task.create({
      data: {
        userId: session.user.id,
        title: parsed.title || command,
        deadline: parsed.deadline ? new Date(parsed.deadline) : new Date(Date.now() + 86400000),
        estimatedMins: parsed.estimatedMins || 30,
        priority: parsed.priority || 0.5,
        status: "PENDING",
      },
    });

    return NextResponse.json(task);
  } catch (error) {
    console.error("[NLP Task Error]", error);
    return NextResponse.json(
      { error: "Failed to parse and create task" },
      { status: 500 }
    );
  }
}
