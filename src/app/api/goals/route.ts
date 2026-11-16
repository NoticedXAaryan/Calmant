import { NextResponse } from "next/server";
import { getUserId } from "@/lib/auth-utils";
import { isAuthError, respondUnauthorized } from "@/lib/api-helpers";
import { CommandCenterService } from "@/lib/services/command-center-service";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const userId = await getUserId();
    const goals = await prisma.goal.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { projectCells: true }
    });

    return NextResponse.json({
      success: true,
      data: goals,
    });
  } catch (error) {
    console.error("[GET /api/goals]", error);
    if (isAuthError(error)) return respondUnauthorized();
    return NextResponse.json(
      { success: false, error: "Failed to fetch goals" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const userId = await getUserId();
    const body = await request.json();
    const title = typeof body?.title === "string" ? body.title.trim() : "";
    const explicitObjective = typeof body?.objective === "string" ? body.objective.trim() : "";
    const description = typeof body?.description === "string" ? body.description.trim() : "";
    const objective = explicitObjective || description || title;
    const successCriteria = Array.isArray(body?.successCriteria)
      ? body.successCriteria.filter((item: unknown): item is string => typeof item === "string" && item.trim().length > 0)
      : undefined;

    if (!title || !objective) {
      return NextResponse.json(
        { success: false, error: "Title and objective are required" },
        { status: 400 }
      );
    }

    const { goal, projectCell } = await CommandCenterService.createObjective(
      userId,
      title,
      objective,
      { successCriteria },
    );

    return NextResponse.json({
      success: true,
      data: { goal, projectCell },
    });
  } catch (error) {
    console.error("[POST /api/goals]", error);
    if (isAuthError(error)) return respondUnauthorized();
    return NextResponse.json(
      { success: false, error: "Failed to create objective" },
      { status: 500 }
    );
  }
}
