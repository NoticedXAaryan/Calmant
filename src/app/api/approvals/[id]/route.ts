import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth-utils";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const action = body.action; // "approve" or "reject"

    if (action !== "approve" && action !== "reject") {
      return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
    }

    const { id } = await params;
    const approval = await prisma.approvalRequest.findUnique({
      where: { id },
    });

    if (!approval || approval.userId !== sessionUser.id) {
      return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    }

    if (approval.status !== "pending") {
      return NextResponse.json({ success: false, error: "Already processed" }, { status: 400 });
    }



    // Process approval based on type
    try {
      const { ApprovalService } = await import("@/lib/agent-runtime/approval-service");
      await ApprovalService.resolveApproval(approval.id, action as "approve" | "reject", sessionUser.id);
      
      if (action === "approve" && approval.agentRunId) {
        // Resume the pipeline in the background
        const { AgentPipeline } = await import("@/lib/harness/pipeline");
        const pipeline = new AgentPipeline();
        
        // We don't await this because we want to respond to the API quickly
        pipeline.resume(approval.agentRunId, {
          apiKey: process.env.GEMINI_API_KEY || process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY || ""
        }).then(async (synthesis) => {
           // We can notify the user via Telegram here or update DB again, but pipeline.resume already updates agentRun
           const { prisma } = await import("@/lib/prisma");
           await prisma.agentRun.update({
             where: { id: approval.agentRunId! },
             data: { status: "completed", response: synthesis.response }
           });
        }).catch(async (err) => {
           console.error("[Resume Error]", err);
           const { prisma } = await import("@/lib/prisma");
           await prisma.agentRun.update({
             where: { id: approval.agentRunId! },
             data: { status: "failed", response: "Execution failed: " + err.message }
           });
        });
      }
      
      return NextResponse.json({ success: true, status: action });
    } catch (execError: any) {
      console.error("[Approval Execute Error]", execError);
      return NextResponse.json({ success: false, error: "Execution failed: " + execError.message }, { status: 500 });
    }
  } catch (error: any) {
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
