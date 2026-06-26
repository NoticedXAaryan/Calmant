import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/auth-utils";

export async function GET() {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const jobs = await prisma.backgroundJob.findMany({
      orderBy: { runAt: "desc" },
      take: 50,
    });

    const policies = await prisma.alertPolicy.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      data: {
        jobs,
        policies,
      }
    });
  } catch (error) {
    console.error("Failed to fetch automations:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
