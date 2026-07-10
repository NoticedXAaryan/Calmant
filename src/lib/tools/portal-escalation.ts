import { z } from "zod";
import { ToolExecutionContext } from "./tool-manifest";
import { EventService } from "../agent-runtime/event-service";
import { prisma } from "../prisma";

export const portalEscalationSchema = z.object({
  portalName: z.enum(["claude", "chatgpt", "midjourney", "perplexity", "github_copilot", "custom"]).describe("The name of the portal to escalate to"),
  customUrl: z.string().optional().describe("If custom, the URL of the portal"),
  prompt: z.string().describe("The exact prompt or instruction to feed the portal"),
  expectedOutput: z.string().describe("What we expect to extract from the portal"),
});

export type PortalEscalationArgs = z.infer<typeof portalEscalationSchema>;

export async function executePortalEscalation(
  args: PortalEscalationArgs, context: ToolExecutionContext
): Promise<string> {
  const portalUrl = args.customUrl || `https://${args.portalName}.com`;
  
  // Create an event for the escalation
  await EventService.emit(
    context.runId,
    context.userId,
    "portal.escalation",
    `Escalated task to ${args.portalName}`,
    "info",
    { portalUrl, prompt: args.prompt, toolCallId: context.toolCallId }
  );

  // For the MVP, since we can't actually easily orchestrate another AI portal securely without human-in-the-loop,
  // we will create an artifact that stores the prompt, and we'll pause execution, asking the user to run it and provide the result.
  const artifact = await prisma.artifact.create({
    data: {
      userId: context.userId,
      agentRunId: context.runId,
      projectCellId: context.projectCellId,
      toolCallId: context.toolCallId,
      type: "portal_prompt",
      title: `Escalation Prompt for ${args.portalName}`,
      content: `Please run this prompt in ${args.portalName}:\n\n${args.prompt}\n\nExpected Output: ${args.expectedOutput}`,
    }
  });

  return `Escalation recorded. Artifact ID: ${artifact.id}. Provide this prompt to the external portal and return the result.`;
}
