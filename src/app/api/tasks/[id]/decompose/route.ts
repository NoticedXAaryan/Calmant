import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/auth-utils";
import { fallbackDecomposeTask, type DecomposedSubtask } from "@/lib/task-planning";
import { TaskService } from "@/services/taskService";

async function decomposeWithOpenRouter(task: {
  title: string;
  description: string | null;
  deadline: Date;
  estimatedMins: number | null;
}): Promise<DecomposedSubtask[] | null> {
  if (!process.env.OPENROUTER_API_KEY) return null;

  try {
    const prompt = `Break this task into 3 to 5 concrete next actions.
Return only valid JSON.

Schema:
{
  "subtasks": [
    { "title": "specific action", "estimatedMins": number, "rationale": "short reason" }
  ]
}

Rules:
- Each subtask must be directly actionable.
- Avoid vague steps like "work on it" or "research".
- Keep each step between 10 and 60 minutes when possible.

Task: ${task.title}
Description: ${task.description || "None"}
Deadline: ${task.deadline.toISOString()}
Estimated minutes: ${task.estimatedMins ?? 60}`;

    const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "openrouter/free",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" }
      })
    });
    
    const resultData = await res.json();
    const text = resultData?.choices?.[0]?.message?.content || "{}";
    const parsed = JSON.parse(text);
    if (!Array.isArray(parsed.subtasks)) return null;

    return parsed.subtasks
      .filter((subtask: Partial<DecomposedSubtask>) => subtask.title)
      .slice(0, 5)
      .map((subtask: Partial<DecomposedSubtask>) => ({
        title: String(subtask.title),
        estimatedMins: Number(subtask.estimatedMins) || 20,
        rationale: String(subtask.rationale || "Concrete next action."),
      }));
  } catch (error) {
    console.warn("[Task Decompose Fallback]", error);
    return null;
  }
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = await getUserId();
    const task = await TaskService.getTaskById(id, userId);

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const subtasks = (await decomposeWithOpenRouter(task)) ?? fallbackDecomposeTask(task);

    await prisma.$transaction([
      prisma.subtask.deleteMany({ where: { taskId: task.id } }),
      prisma.subtask.createMany({
        data: subtasks.map((subtask) => ({
          taskId: task.id,
          title: subtask.title,
        })),
      }),
    ]);

    const updated = await TaskService.getTaskById(task.id, userId);

    return NextResponse.json({
      success: true,
      data: {
        task: updated,
        subtasks,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[POST /api/tasks/[id]/decompose]", error);
    return NextResponse.json(
      { success: false, error: "Failed to decompose task", timestamp: new Date().toISOString() },
      { status: 500 }
    );
  }
}
