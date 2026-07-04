import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth-utils";

export async function GET() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

  const approvals = await prisma.approvalRequest.findMany({
    where: { userId: sessionUser.id, status: "pending" },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ success: true, data: approvals });
}
