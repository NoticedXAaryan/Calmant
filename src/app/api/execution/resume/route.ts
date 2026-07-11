import { NextResponse } from "next/server";
import { z } from "zod";
import { ExecutionOrchestrator } from "@/lib/execution/orchestrator";
import { ExecutionLoop } from "@/lib/execution/execution-loop";

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
    const body = await req.json();
    const { projectCellId, resumeToPhase, ownerInput } = ResumeSchema.parse(body);

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
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
