import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/auth-utils";
import { isAuthError, respondUnauthorized } from "@/lib/api-helpers";

export async function GET() {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const delegatedTasks = await prisma.delegatedTask.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(delegatedTasks);
  } catch (error) {
    console.error("Failed to fetch delegated tasks:", error);
    if (isAuthError(error)) return respondUnauthorized();
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "DelegatedTask ID required" }, { status: 400 });
    }

    const task = await prisma.delegatedTask.findUnique({
      where: { id },
    });

    if (!task || task.userId !== userId) {
      return NextResponse.json({ error: "Not found or unauthorized" }, { status: 404 });
    }

    await prisma.delegatedTask.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete delegated task:", error);
    if (isAuthError(error)) return respondUnauthorized();
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
