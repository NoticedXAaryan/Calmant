import { NextResponse } from "next/server";
import { getUserId } from "@/lib/auth-utils";
import { isAuthError, respondUnauthorized } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await getUserId();
    
    // Check ownership
    const projectCell = await prisma.projectCell.findUnique({
      where: { id: params.id, userId },
      include: {
        tasks: {
          orderBy: { createdAt: 'asc' }
        },
        approvals: {
          orderBy: { createdAt: 'desc' }
        },
        artifacts: {
          orderBy: { createdAt: 'desc' }
        },
        events: {
          orderBy: { createdAt: 'desc' },
          take: 50
        }
      }
    });

    if (!projectCell) {
      return NextResponse.json(
        { success: false, error: "Project cell not found" },
        { status: 404 }
      );
    }

    // Detail includes task graph, events, artifacts, approvals, QA, memory candidates.
    // Fetch QA results and memories connected to runs of these tasks
    const taskIds = projectCell.tasks.map(t => t.id);
    const qaResults = await prisma.qaResult.findMany({
      where: { run: { projectTaskId: { in: taskIds } } }
    });
    
    const memoryCandidates = await prisma.agentMemory.findMany({
      where: { sourceRun: { projectTaskId: { in: taskIds } }, status: "pending_review" }
    });

    return NextResponse.json({
      success: true,
      data: {
        ...projectCell,
        qaResults,
        memoryCandidates
      },
    });
  } catch (error) {
    console.error("[GET /api/project-cells/[id]]", error);
    if (isAuthError(error)) return respondUnauthorized();
    return NextResponse.json(
      { success: false, error: "Failed to fetch project cell" },
      { status: 500 }
    );
  }
}
