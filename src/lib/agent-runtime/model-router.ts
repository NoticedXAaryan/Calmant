import { generateText, generateObject, streamText, type LanguageModel } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { prisma } from "../prisma";
import { z } from "zod";

// Create an OpenAI-compatible provider that points to LiteLLM if configured,
// or defaults to OpenAI's actual API.
const getProvider = () => {
  return createOpenAI({
    baseURL: process.env.LITELLM_BASE_URL || "https://api.openai.com/v1",
    apiKey: process.env.LITELLM_API_KEY || process.env.OPENAI_API_KEY || "dummy",
  });
};

export class ModelRouter {
  static getModel(modelId: string = "gpt-4o-mini"): LanguageModel {
    const provider = getProvider();
    return provider(modelId);
  }

  static async generateText(prompt: string, options?: { model?: string; runId?: string; system?: string }) {
    const modelId = options?.model || "gpt-4o-mini";
    const result = await generateText({
      model: this.getModel(modelId),
      prompt,
      system: options?.system,
    });

    if (options?.runId && result.usage) {
      // @ts-ignore
      await this.logUsage(options.runId, modelId, result.usage.promptTokens, result.usage.completionTokens);
    }

    return result.text;
  }

  static async generateObject<T>(prompt: string, schema: z.ZodSchema<T>, options?: { model?: string; runId?: string; system?: string }) {
    const modelId = options?.model || "gpt-4o-mini";
    const result = await generateObject({
      model: this.getModel(modelId),
      prompt,
      system: options?.system,
      schema,
    });

    if (options?.runId && result.usage) {
      // @ts-ignore
      await this.logUsage(options.runId, modelId, result.usage.promptTokens, result.usage.completionTokens);
    }

    return result.object;
  }

  static async streamText(prompt: string, options?: { model?: string; runId?: string; system?: string }) {
    const modelId = options?.model || "gpt-4o-mini";
    const result = await streamText({
      model: this.getModel(modelId),
      prompt,
      system: options?.system,
      onFinish: async (info) => {
        if (options?.runId && info.usage) {
          // @ts-ignore
          await this.logUsage(options.runId, modelId, info.usage.promptTokens, info.usage.completionTokens);
        }
      }
    });

    return result;
  }

  private static async logUsage(runId: string, modelId: string, promptTokens: number, completionTokens: number) {
    try {
      await prisma.agentRun.update({
        where: { id: runId },
        data: {
          modelId,
          promptTokens: { increment: promptTokens },
          completionTokens: { increment: completionTokens }
        }
      });
    } catch (err) {
      console.warn(`[ModelRouter] Failed to log usage for run ${runId}:`, err);
    }
  }
}
