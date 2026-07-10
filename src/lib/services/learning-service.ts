import { MemoryService } from "./memory-service";
import { ModelRouter } from "../agent-runtime/model-router";
import { z } from "zod";

const EvaluatedLearningSchema = z.array(z.object({
  fact: z.string(),
  category: z.string(),
  riskLevel: z.enum(["low", "medium", "high"]),
  confidence: z.number()
}));

export class LearningService {
  /**
   * Processes learnings extracted during synthesis.
   * Calls an LLM to evaluate the risk and categorize the facts.
   */
  static async processLearnings(userId: string, runId: string, learnings: { fact: string; category: string }[]) {
    if (!learnings || learnings.length === 0) return;

    const prompt = `
Evaluate the following learned facts about a user.
For each fact, determine its risk level:
- low: safe preferences, general context (e.g. "User likes dark mode", "User lives in New York").
- medium: high-impact facts, assumptions, or things that might change workflow behavior (e.g. "User always wants to use Python", "User prefers concise answers").
- high: secrets, sensitive PII, passwords, API keys (e.g. "User password is foo").

Facts:
${JSON.stringify(learnings, null, 2)}
`;

    try {
      const evaluated = await ModelRouter.generateObject(
        prompt,
        EvaluatedLearningSchema,
        { model: "gpt-4o-mini", runId }
      );

      for (const item of evaluated) {
        if (item.riskLevel === "high") {
          console.log(`[LearningService] Dropped high-risk memory: ${item.fact}`);
          continue;
        }

        const status = item.riskLevel === "medium" ? "pending_review" : "active";
        
        await MemoryService.createMemory(
          userId,
          item.fact,
          item.category || "preference",
          item.confidence || 0.8,
          status,
          runId
        );
        console.log(`[LearningService] Saved memory (status: ${status}): ${item.fact}`);
      }
    } catch (err) {
      console.error("[LearningService] Error processing learnings:", err);
    }
  }
}
