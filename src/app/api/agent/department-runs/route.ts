import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/auth-utils";

export async function GET() {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const runs = await prisma.departmentRun.findMany({
      where: { userId },
      orderBy: { startedAt: "desc" },
      take: 50,
      select: {
        id: true,
        department: true,
        objective: true,
        status: true,
        output: true,
        startedAt: true,
        completedAt: true,
      },
    });

    return NextResponse.json({ success: true, data: runs });
  } catch (error) {
    console.error("Failed to fetch department runs:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
