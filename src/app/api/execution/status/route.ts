import { NextResponse } from "next/server";
import { ExecutionLoop } from "@/lib/execution/execution-loop";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/execution/status?projectCellId=xxx — Get execution loop status
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const projectCellId = url.searchParams.get("projectCellId");

    if (!projectCellId) {
      return NextResponse.json({ error: "projectCellId required" }, { status: 400 });
    }

    const state = await ExecutionLoop.loadState(projectCellId);
    if (!state) {
      return NextResponse.json({ error: "No execution state found" }, { status: 404 });
    }

    // Get project cell info
    const cell = await prisma.projectCell.findUnique({
      where: { id: projectCellId },
      include: {
        tasks: { select: { id: true, title: true, status: true } },
        _count: { select: { artifacts: true, agentRuns: true } },
      },
    });

    return NextResponse.json({
      state: {
        phase: state.phase,
        iterationCount: state.iterationCount,
        maxIterations: state.maxIterations,
        objective: state.objective,
        successCriteria: state.successCriteria,
        researchCount: state.researchData.length,
        artifactCount: state.artifacts.length,
        validationResults: state.validationResults,
        loopBackReasons: state.loopBackReasons,
        startedAt: state.startedAt,
        lastUpdatedAt: state.lastUpdatedAt,
      },
      summary: ExecutionLoop.summarize(state),
      cell,
    });
  } catch (err: any) {
    console.error("[API:execution/status] Error:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error" },
      { status: 500 }
    );
  }
}
