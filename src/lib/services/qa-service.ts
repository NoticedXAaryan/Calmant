import { prisma } from "../prisma";
import { generateObject } from "ai";
import { z } from "zod";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";

export class QAService {
  static async runQA(projectTaskId: string, agentRunId: string, plan: any, results: any) {
    console.log(`[QAService] Running QA for task ${projectTaskId}...`);
    
    // Fallback model init
    const apiKey = process.env.GEMINI_API_KEY;
    const aiProvider = createGoogleGenerativeAI({ apiKey });
    
    // In MVP, we do a simple check. If a complex plan failed, we flag it.
    let hasError = false;
    for (const result of results || []) {
      if (result.status === "error" || result.status === "failed") {
        hasError = true;
      }
    }

    let passed = !hasError;
    let feedback = passed ? "All steps executed successfully." : "One or more steps failed during execution.";

    // If we want LLM-based QA, we'd do it here. For speed/cost, we do a basic heuristic + optional LLM for complex tasks.
    if (!hasError && plan?.goal) {
      try {
        const { object } = await generateObject({
          model: aiProvider("gemini-2.5-flash"),
          schema: z.object({
            passed: z.boolean().describe("Whether the goal was achieved based on results"),
            feedback: z.string().describe("Constructive feedback or reason for failure"),
          }),
          prompt: `You are a QA agent. Evaluate if the results satisfy the goal.\n\nGoal: ${plan.goal}\n\nResults: ${JSON.stringify(results).substring(0, 5000)}`
        });
        
        passed = object.passed;
        feedback = object.feedback;
      } catch (err) {
        console.warn("[QAService] LLM QA failed, falling back to heuristic.", err);
      }
    }

    const qaResult = await prisma.qaResult.create({
      data: {
        projectTaskId,
        agentRunId,
        passed,
        feedback,
      }
    });

    if (passed) {
      await prisma.projectTask.update({
        where: { id: projectTaskId },
        data: { status: "completed", completedAt: new Date() }
      });
    } else {
      await prisma.projectTask.update({
        where: { id: projectTaskId },
        data: { status: "failed" }
      });
    }

    return qaResult;
  }
}
