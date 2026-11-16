import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { ExecutionOrchestrator } from "@/lib/execution/orchestrator";
import { getUserId } from "@/lib/auth-utils";
import { isAuthError, respondUnauthorized } from "@/lib/api-helpers";

const ResumeSchema = z.object({
  projectCellId: z.string(),
  resumeToPhase: z.enum(['ideate', 'research', 'plan', 'build', 'validate', 'deliver']),
  ownerInput: z.string().optional(),
});

/**
 * POST /api/execution/resume — Resume a blocked execution loop
 */
export async function POST(req: Request) {
  try {
    const userId = await getUserId();
    const body = await req.json();
    const { projectCellId, resumeToPhase, ownerInput } = ResumeSchema.parse(body);

    const cell = await prisma.projectCell.findFirst({
      where: { id: projectCellId, userId },
      select: { id: true },
    });
    if (!cell) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const state = await ExecutionOrchestrator.resumeFromBlocked(
      projectCellId,
      resumeToPhase,
      ownerInput,
    );

    return NextResponse.json({
      success: true,
      projectCellId,
      phase: state.phase,
      iteration: state.iterationCount,
    });
  } catch (err: any) {
    console.error("[API:execution/resume] Error:", err);
    if (isAuthError(err)) return respondUnauthorized();
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
