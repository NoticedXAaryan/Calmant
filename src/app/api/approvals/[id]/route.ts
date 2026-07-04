import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth-utils";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const action = body.action; // "approve" or "reject"

    if (action !== "approve" && action !== "reject") {
      return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
    }

    const approval = await prisma.approvalRequest.findUnique({
      where: { id: params.id },
    });

    if (!approval || approval.userId !== sessionUser.id) {
      return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    }

    if (approval.status !== "pending") {
      return NextResponse.json({ success: false, error: "Already processed" }, { status: 400 });
    }

    if (action === "reject") {
      await prisma.approvalRequest.update({
        where: { id: approval.id },
        data: { status: "rejected", reviewedAt: new Date() },
      });
      return NextResponse.json({ success: true, status: "rejected" });
    }

    // Process approval based on type
    let result: any = null;
    try {
      if (approval.type === "email") {
        const { sendEmail } = await import("@/lib/email");
        const payload = approval.payload as { to: string; subject: string; html: string };
        await sendEmail(payload.subject, payload.html, payload.to);
        result = "Email sent";
      } else if (approval.type === "task") {
        // e.g. payload contains task fields
        const payload = approval.payload as any;
        await prisma.task.create({
          data: {
            userId: sessionUser.id,
            title: payload.title,
            description: payload.description,
            deadline: payload.deadline ? new Date(payload.deadline) : new Date(),
          }
        });
        result = "Task created";
      } else {
        // Mock generic execution
        result = "Executed payload generic handler";
        console.log(`[Approval] Executed ${approval.type}:`, approval.payload);
      }
      
      await prisma.approvalRequest.update({
        where: { id: approval.id },
        data: { status: "executed", reviewedAt: new Date(), executedAt: new Date() },
      });
      
      return NextResponse.json({ success: true, status: "executed", result });
    } catch (execError: any) {
      console.error("[Approval Execute Error]", execError);
      return NextResponse.json({ success: false, error: "Execution failed: " + execError.message }, { status: 500 });
    }
  } catch (error: any) {
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
