import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/auth-utils";

export async function GET() {
  try {
    const userId = await getUserId();

    const jobs = await prisma.backgroundJob.groupBy({
      by: ["name", "status"],
      _count: { _all: true },
    });

    const policies = await prisma.alertPolicy.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      data: {
        jobs: jobs.map((job) => ({
          id: `${job.name}:${job.status}`,
          name: job.name,
          status: job.status,
          count: job._count._all,
        })),
        policies,
      },
    });
  } catch (error: any) {
    console.error("Failed to fetch automations:", error);
    if (error?.status === 401) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
