import { prisma } from "../prisma";
import { EventService } from "../agent-runtime/event-service";
import { ToolManifest, ToolExecutionContext } from "./tool-manifest";
import { ApprovalRequiredError } from "../errors";

export class ToolRunner {
  static async execute<TInput, TOutput>(
    manifest: ToolManifest<TInput, TOutput>,
    args: unknown,
    context: Omit<ToolExecutionContext, "toolCallId">
  ): Promise<TOutput> {
    // 1. Validate Input
    let parsedArgs: TInput;
    try {
      parsedArgs = manifest.inputSchema.parse(args);
    } catch (err: any) {
      throw new Error(`Invalid arguments for tool ${manifest.name}: ${err.message}`);
    }

    // 2. Check risk policy
    const RiskScores = {
      read: 0,
      write_internal: 1,
      external_message: 2,
      external_submission: 3,
      credential: 4,
      destructive: 5,
      financial: 5
    };
    
    const maxRisk = process.env.AGENT_MAX_RISK || "financial";
    const currentScore = RiskScores[manifest.riskLevel] ?? 0;
    const maxScore = RiskScores[maxRisk as keyof typeof RiskScores] ?? 5;
    
    if (currentScore > maxScore) {
      throw new Error(`Tool execution blocked: Risk level '${manifest.riskLevel}' exceeds configured policy maximum of '${maxRisk}'.`);
    }

    // 3. Check for an already approved ToolCall for this run and tool (to support resuming)
    const approvedCall = await prisma.toolCall.findFirst({
      where: {
        runId: context.runId,
        toolName: manifest.name,
        status: "approved"
      },
      orderBy: { createdAt: 'desc' }
    });

    let toolCall;
    if (approvedCall) {
      toolCall = await prisma.toolCall.update({
        where: { id: approvedCall.id },
        data: { status: "running", startedAt: new Date(), args: parsedArgs as any }
      });
    } else {
      let requiresApproval = manifest.requiresApproval === "always";
      if (manifest.requiresApproval === "policy" && manifest.checkApproval) {
        requiresApproval = manifest.checkApproval(parsedArgs);
      }

      // Normal flow
      if (requiresApproval) {
        toolCall = await prisma.toolCall.create({
          data: {
            runId: context.runId,
            toolName: manifest.name,
            args: parsedArgs as any,
            status: "waiting_approval",
            riskLevel: manifest.riskLevel,
            approvalRequired: true,
          }
        });
        
        throw new ApprovalRequiredError(toolCall.id, manifest.name);
      } else {
        toolCall = await prisma.toolCall.create({
          data: {
            runId: context.runId,
            toolName: manifest.name,
            args: parsedArgs as any,
            status: "running",
            riskLevel: manifest.riskLevel,
            approvalRequired: false,
            startedAt: new Date(),
          }
        });
      }
    }

    const executionContext: ToolExecutionContext = {
      ...context,
      toolCallId: toolCall.id,
    };

    // 3. Emit start event
    await EventService.emit(
      context.runId,
      context.userId,
      "tool.started",
      `Tool ${manifest.name} started.`,
      "info",
      { toolCallId: toolCall.id, toolName: manifest.name, riskLevel: manifest.riskLevel }
    );

    const startTime = Date.now();

    try {
      // 5. Execute handler with timeout
      let result: TOutput;
      if (manifest.timeoutMs > 0) {
        result = await Promise.race([
          manifest.handler(parsedArgs, executionContext),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error(`Tool ${manifest.name} timed out after ${manifest.timeoutMs}ms`)), manifest.timeoutMs)
          )
        ]);
      } else {
        result = await manifest.handler(parsedArgs, executionContext);
      }

      // 6. Validate output
      let validatedOutput = result;
      if (manifest.outputSchema) {
        validatedOutput = manifest.outputSchema.parse(result);
      }

      // 7. Update ToolCall
      const durationMs = Date.now() - startTime;
      await prisma.toolCall.update({
        where: { id: toolCall.id },
        data: {
          status: "completed",
          result: validatedOutput as any,
          completedAt: new Date(),
          durationMs,
        }
      });

      // 8. Emit completed event
      await EventService.emit(
        context.runId,
        context.userId,
        "tool.completed",
        `Tool ${manifest.name} completed successfully.`,
        "info",
        { toolCallId: toolCall.id, toolName: manifest.name, durationMs }
      );

      return validatedOutput;
    } catch (error: any) {
      const durationMs = Date.now() - startTime;
      
      // Update ToolCall with error
      await prisma.toolCall.update({
        where: { id: toolCall.id },
        data: {
          status: "failed",
          error: error.message || String(error),
          completedAt: new Date(),
          durationMs,
        }
      });

      // Emit failed event
      await EventService.emit(
        context.runId,
        context.userId,
        "tool.failed",
        `Tool ${manifest.name} failed: ${error.message || String(error)}`,
        "error",
        { toolCallId: toolCall.id, toolName: manifest.name, durationMs, error: error.message || String(error) }
      );

      throw error;
    }
  }
}
