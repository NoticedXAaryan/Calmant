import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/auth-utils";

export async function GET() {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const runs = await prisma.agentRun.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        prompt: true,
        response: true,
        status: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ success: true, data: runs });
  } catch (error) {
    console.error("Failed to fetch agent runs:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
