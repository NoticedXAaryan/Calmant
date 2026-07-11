import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ExecutionOrchestrator } from "@/lib/execution/orchestrator";
import { ExecutionLoop } from "@/lib/execution/execution-loop";

const StartGoalSchema = z.object({
  goalId: z.string(),
  title: z.string().optional(),
  objective: z.string(),
  successCriteria: z.array(z.string()).optional(),
});

const ResumeSchema = z.object({
  projectCellId: z.string(),
  resumeToPhase: z.enum(['ideate', 'research', 'plan', 'build', 'validate', 'deliver']),
  ownerInput: z.string().optional(),
});

/**
 * POST /api/execution/start — Start a goal through the execution loop
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { goalId, title, objective, successCriteria } = StartGoalSchema.parse(body);

    // Get the owner
    const owner = await prisma.user.findFirst({ select: { id: true } });
    if (!owner) {
      return NextResponse.json({ error: "No owner found" }, { status: 404 });
    }

    // Create a project cell for this goal
    const cell = await prisma.projectCell.create({
      data: {
        userId: owner.id,
        goalId,
        title: title || objective.substring(0, 100),
        objective,
        successCriteria: successCriteria as any,
        status: "active",
      },
    });

    // Start the execution loop
    const state = await ExecutionOrchestrator.startGoal(cell.id, owner.id);

    return NextResponse.json({
      success: true,
      projectCellId: cell.id,
      phase: state.phase,
      objective: state.objective,
    });
  } catch (err: any) {
    console.error("[API:execution/start] Error:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
