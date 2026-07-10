import { NextResponse } from "next/server";
import { getUserId } from "@/lib/auth-utils";
import { isAuthError, respondUnauthorized } from "@/lib/api-helpers";
import { ProjectCellService } from "@/lib/services/project-cell-service";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const userId = await getUserId();
    const { status } = await request.json();

    // Verify ownership
    const task = await prisma.projectTask.findUnique({
      where: { id: params.id },
      include: { projectCell: true },
    });

    if (!task || task.projectCell.userId !== userId) {
      return NextResponse.json(
        { success: false, error: "Task not found or unauthorized" },
        { status: 404 }
      );
    }

    if (!status) {
      return NextResponse.json(
        { success: false, error: "Status is required" },
        { status: 400 }
      );
    }

    const updatedTask = await ProjectCellService.updateTaskStatus(params.id, status);

    return NextResponse.json({
      success: true,
      data: updatedTask,
    });
  } catch (error) {
    console.error("[PATCH /api/project-tasks/[id]]", error);
    if (isAuthError(error)) return respondUnauthorized();
    return NextResponse.json(
      { success: false, error: "Failed to update project task" },
      { status: 500 }
    );
  }
}
