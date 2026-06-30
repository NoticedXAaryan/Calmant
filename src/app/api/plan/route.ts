import { NextResponse } from "next/server";
import { getUserId } from "@/lib/auth-utils";
import { isAuthError, respondUnauthorized } from "@/lib/api-helpers";
import { buildExecutionPlan } from "@/lib/task-planning";
import { TaskService } from "@/services/taskService";

export async function GET() {
  try {
    const userId = await getUserId();
    const tasks = await TaskService.getUserTasks(userId);
    const plan = buildExecutionPlan(tasks);

    return NextResponse.json({
      success: true,
      data: plan,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[GET /api/plan]", error);
    if (isAuthError(error)) return respondUnauthorized();
    return NextResponse.json(
      { success: false, error: "Failed to build execution plan", timestamp: new Date().toISOString() },
      { status: 500 }
    );
  }
}
