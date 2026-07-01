import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/auth-utils";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserId();
    const resolvedParams = await params;
    const policyId = resolvedParams.id;

    if (!policyId) {
      return NextResponse.json({ error: "Policy ID is required" }, { status: 400 });
    }

    const { enabled } = await req.json();

    if (typeof enabled !== "boolean") {
      return NextResponse.json({ error: "Invalid payload: 'enabled' must be a boolean" }, { status: 400 });
    }

    // Verify ownership
    const policy = await prisma.alertPolicy.findUnique({
      where: { id: policyId },
    });

    if (!policy) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (policy.userId !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Update
    const updated = await prisma.alertPolicy.update({
      where: { id: policyId },
      data: { enabled },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error("Failed to toggle automation rule:", error);
    if (error?.status === 401 || error?.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
