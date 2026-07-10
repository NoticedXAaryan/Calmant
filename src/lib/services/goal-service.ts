import { prisma } from "../prisma";
import { executeTavilySearch } from "../tools/research";
import { BrowserSessionService } from "./browser-session-service";
import { ApprovalService } from "../agent-runtime/approval-service";
import { ModelRouter } from "../agent-runtime/model-router";

export class GoalService {
  static async createGoal(userId: string, title: string, description?: string) {
    return prisma.goal.create({
      data: {
        userId,
        title,
        description,
        status: "active",
      }
    });
  }
  static async getActiveGoals(userId: string) {
    return prisma.goal.findMany({
      where: { userId, status: "active" },
      include: { _count: { select: { opportunities: true } } }
    });
  }

  static async searchOpportunities(goalId: string, context: any) {
    const goal = await prisma.goal.findUnique({ where: { id: goalId } });
    if (!goal) throw new Error("Goal not found");

    // 1. Search using Tavily
    const searchRes = await executeTavilySearch({ query: `Recent open positions for: ${goal.title}`, search_depth: "advanced" }, context);
    
    // 2. Parse results using LLM
    const prompt = `Extract a list of job/internship opportunities from these search results. 
Format strictly as JSON array of objects with keys: title, organization, location, url, deadline.
Results: ${searchRes.slice(0, 4000)}`;

    const text = await ModelRouter.generateText(
      prompt,
      { model: "gpt-4o-mini", runId: context?.runId }
    );

    let parsed = [];
    try {
      parsed = JSON.parse(text);
    } catch {
      // Failed to parse, return empty
      return [];
    }

    // 3. Save as Opportunities
    const opportunities = [];
    for (const opp of parsed) {
      if (!opp.url) continue;
      
      const exists = await prisma.opportunity.findUnique({
        where: { userId_sourceUrl: { userId: goal.userId, sourceUrl: opp.url } }
      });

      if (!exists) {
        const record = await prisma.opportunity.create({
          data: {
            userId: goal.userId,
            goalId,
            source: "tavily_search",
            sourceUrl: opp.url,
            title: opp.title,
            organization: opp.organization,
            location: opp.location,
            status: "found",
          }
        });
        opportunities.push(record);
      }
    }

    return opportunities;
  }

  static async generateCVVariant(opportunityId: string) {
    const opp = await prisma.opportunity.findUnique({ where: { id: opportunityId } });
    if (!opp || !opp.goalId) throw new Error("Opportunity not found");

    const goal = await prisma.goal.findUnique({ where: { id: opp.goalId } });
    
    const prompt = `Write a tailored Markdown CV for the role "${opp.title}" at "${opp.organization}".
Base it on the goal: "${goal?.title}". Add placeholder projects and skills that fit perfectly.`;

    const text = await ModelRouter.generateText(
      prompt,
      { model: "gpt-4o" }
    );

    const artifact = await prisma.artifact.create({
      data: {
        userId: opp.userId,
        type: "document",
        title: `CV for ${opp.organization} - ${opp.title}`,
        content: text,
      }
    });

    return artifact;
  }

  static async submitApplication(opportunityId: string, runId: string, toolCallId: string) {
    const opp = await prisma.opportunity.findUnique({ where: { id: opportunityId } });
    if (!opp || !opp.sourceUrl) throw new Error("Opportunity missing or lacks URL");

    // Start a browser session
    const sessionId = await BrowserSessionService.startSession(opp.userId, runId);
    const session = BrowserSessionService.getActiveSession(sessionId);
    if (!session) throw new Error("Failed to start browser");

    // Navigate
    await session.page.goto(opp.sourceUrl, { waitUntil: "domcontentloaded" });

    // The agent pauses here at the "Submit" boundary.
    // In our architecture, the tool itself requires approval. 
    // We will trigger the approval flow explicitly.
    const approvalId = await ApprovalService.createApproval(toolCallId);
    
    // We update the opportunity status to signify we are waiting
    await prisma.opportunity.update({
      where: { id: opp.id },
      data: { status: "applied" }
    });

    return `Application workflow initiated. Browser opened to ${opp.sourceUrl}. Approval request ${approvalId} created for final submission.`;
  }
}
