import { describe, it, expect, vi, beforeEach } from "vitest";
import { ModelRouter } from "../../src/lib/agent-runtime/model-router";
import { prisma } from "../../src/lib/prisma";
import { z } from "zod";

// Mock the ai package
vi.mock("ai", () => ({
  generateText: vi.fn().mockResolvedValue({
    text: "mock response",
    usage: { promptTokens: 10, completionTokens: 20 }
  }),
  generateObject: vi.fn().mockResolvedValue({
    object: { result: "success" },
    usage: { promptTokens: 15, completionTokens: 25 }
  }),
  streamText: vi.fn().mockResolvedValue({
    // simple mock
  }),
}));

vi.mock("@ai-sdk/openai", () => ({
  createOpenAI: vi.fn().mockReturnValue(() => ({}))
}));

vi.mock("../../src/lib/prisma", () => ({
  prisma: {
    agentRun: {
      update: vi.fn(),
    }
  }
}));

describe("ModelRouter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should track usage during generateText", async () => {
    const text = await ModelRouter.generateText("Hello", { runId: "run-1" });
    expect(text).toBe("mock response");
    expect(prisma.agentRun.update).toHaveBeenCalledWith({
      where: { id: "run-1" },
      data: {
        modelId: "gpt-4o-mini",
        promptTokens: { increment: 10 },
        completionTokens: { increment: 20 }
      }
    });
  });

  it("should track usage during generateObject", async () => {
    const schema = z.object({ result: z.string() });
    const obj = await ModelRouter.generateObject("Test", schema, { runId: "run-2" });
    expect(obj).toEqual({ result: "success" });
    expect(prisma.agentRun.update).toHaveBeenCalledWith({
      where: { id: "run-2" },
      data: {
        modelId: "gpt-4o-mini",
        promptTokens: { increment: 15 },
        completionTokens: { increment: 25 }
      }
    });
  });
});
