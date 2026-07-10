import { NextResponse } from "next/server";
import { getUserId } from "@/lib/auth-utils";
import { isAuthError, respondUnauthorized } from "@/lib/api-helpers";
import { CommandCenterService } from "@/lib/services/command-center-service";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await getUserId();
    const goal = await prisma.goal.findUnique({
      where: { id: params.id, userId },
      include: { projectCells: true },
    });

    if (!goal) {
      return NextResponse.json(
        { success: false, error: "Goal not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: goal,
    });
  } catch (error) {
    console.error("[GET /api/goals/[id]]", error);
    if (isAuthError(error)) return respondUnauthorized();
    return NextResponse.json(
      { success: false, error: "Failed to fetch goal" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await getUserId();
    const { action } = await request.json();

    let updatedGoal;
    if (action === "pause") {
      updatedGoal = await CommandCenterService.pause(userId, params.id);
    } else if (action === "resume") {
      updatedGoal = await CommandCenterService.resume(userId, params.id);
    } else if (action === "archive") {
      updatedGoal = await CommandCenterService.archive(userId, params.id);
    } else {
      return NextResponse.json(
        { success: false, error: "Invalid action" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: updatedGoal,
    });
  } catch (error) {
    console.error("[PATCH /api/goals/[id]]", error);
    if (isAuthError(error)) return respondUnauthorized();
    return NextResponse.json(
      { success: false, error: "Failed to update goal" },
      { status: 500 }
    );
  }
}
