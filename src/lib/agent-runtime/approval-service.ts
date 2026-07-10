import { prisma } from "../prisma";
import { EventService } from "./event-service";
import { TelegramService } from "../services/telegram-service";

export class ApprovalService {
  static async createApproval(toolCallId: string): Promise<string> {
    const toolCall = await prisma.toolCall.findUnique({
      where: { id: toolCallId },
      include: { run: true }
    });

    if (!toolCall) {
      throw new Error(`ToolCall ${toolCallId} not found`);
    }

    const run = toolCall.run;

    // We don't have approvalId on ToolCall, so we store toolCallId in the payload
    const payload = {
      ...(typeof toolCall.args === 'object' && toolCall.args !== null ? toolCall.args : {}),
      _toolCallId: toolCall.id
    };

    // Create the approval request
    const approval = await prisma.approvalRequest.create({
      data: {
        userId: run.userId,
        type: toolCall.toolName,
        title: `Approval required for ${toolCall.toolName}`,
        description: `The agent wants to execute ${toolCall.toolName} which requires your explicit approval.`,
        payload: payload,
        agentRunId: run.id,
      }
    });

    // Update the AgentRun status to waiting_approval
    await prisma.agentRun.update({
      where: { id: run.id },
      data: { status: "waiting_approval" }
    });

    // Emit event
    await EventService.emit(
      run.id,
      run.userId,
      "approval.required",
      `Approval required for tool ${toolCall.toolName}`,
      "warn",
      { approvalId: approval.id, toolCallId: toolCall.id, toolName: toolCall.toolName }
    );

    // Send Telegram Notification
    await TelegramService.sendApprovalPrompt(run.userId, approval);

    return approval.id;
  }

  static async resolveApproval(approvalId: string, action: "approve" | "reject", userId: string): Promise<void> {
    const approval = await prisma.approvalRequest.findUnique({
      where: { id: approvalId }
    });

    if (!approval || approval.userId !== userId) {
      throw new Error("Approval request not found or unauthorized");
    }

    if (approval.status !== "pending") {
      throw new Error(`Approval is already in ${approval.status} state`);
    }

    // Update the approval status
    await prisma.approvalRequest.update({
      where: { id: approval.id },
      data: {
        status: action === "approve" ? "approved" : "rejected",
        reviewedAt: new Date(),
      }
    });

    // Find the associated tool call
    const payloadObj = approval.payload as { _toolCallId?: string } | null;
    const toolCallId = payloadObj?._toolCallId;
    
    let toolCall = null;
    if (toolCallId) {
      toolCall = await prisma.toolCall.findUnique({
        where: { id: toolCallId }
      });
    }

    if (toolCall) {
      if (action === "reject") {
        await prisma.toolCall.update({
          where: { id: toolCall.id },
          data: {
            status: "rejected",
            result: { error: "User rejected the execution" },
            completedAt: new Date()
          }
        });

        // Fail the agent run
        await prisma.agentRun.update({
          where: { id: approval.agentRunId! },
          data: {
            status: "failed",
            response: `User rejected approval for ${toolCall.toolName}`,
          }
        });

        await EventService.emit(
          approval.agentRunId!,
          userId,
          "approval.resolved",
          `User rejected execution of ${toolCall.toolName}`,
          "warn",
          { approvalId: approval.id, toolCallId: toolCall.id, action: "reject" }
        );
      } else {
        // Approve
        await prisma.toolCall.update({
          where: { id: toolCall.id },
          data: { status: "approved" }
        });

        await EventService.emit(
          approval.agentRunId!,
          userId,
          "approval.resolved",
          `User approved execution of ${toolCall.toolName}`,
          "info",
          { approvalId: approval.id, toolCallId: toolCall.id, action: "approve" }
        );

        // Trigger resuming the plan here
        const { AgentPipeline } = await import("../harness/pipeline");
        const pipeline = new AgentPipeline();
        
        // Run in background so we don't block the API response
        pipeline.resume(approval.agentRunId!, {
          apiKey: process.env.GEMINI_API_KEY || process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY || ""
        }).catch(err => {
          console.error(`[ApprovalService] Error resuming pipeline for run ${approval.agentRunId}:`, err);
        });
      }
    }
  }
}
