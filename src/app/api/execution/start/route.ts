import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ExecutionOrchestrator } from "@/lib/execution/orchestrator";
import { getUserId } from "@/lib/auth-utils";
import { isAuthError, respondUnauthorized } from "@/lib/api-helpers";

const StartGoalSchema = z.object({
  goalId: z.string(),
  title: z.string().optional(),
  objective: z.string(),
  successCriteria: z.array(z.string()).optional(),
  projectCellId: z.string().optional(),
});

/**
 * POST /api/execution/start — Start a goal through the execution loop.
 * Reuses the project cell created with the goal instead of opening a second one.
 */
export async function POST(req: Request) {
  try {
    const userId = await getUserId();
    const body = await req.json();
    const { goalId, title, objective, successCriteria, projectCellId } = StartGoalSchema.parse(body);

    const goal = await prisma.goal.findFirst({
      where: { id: goalId, userId },
      select: { id: true },
    });
    if (!goal) {
      return NextResponse.json({ error: "Goal not found" }, { status: 404 });
    }

    let cell = projectCellId
      ? await prisma.projectCell.findFirst({
          where: { id: projectCellId, userId, goalId },
        })
      : await prisma.projectCell.findFirst({
          where: { userId, goalId },
          orderBy: { createdAt: "desc" },
        });

    if (!cell) {
      cell = await prisma.projectCell.create({
        data: {
          userId,
          goalId,
          title: title || objective.substring(0, 100),
          objective,
          successCriteria: successCriteria ?? undefined,
          status: "active",
        },
      });
    }

    const state = await ExecutionOrchestrator.startGoal(cell.id, userId);

    return NextResponse.json({
      success: true,
      projectCellId: cell.id,
      phase: state.phase,
      objective: state.objective,
    });
  } catch (err: any) {
    console.error("[API:execution/start] Error:", err);
    if (isAuthError(err)) return respondUnauthorized();
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
