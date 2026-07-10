import { describe, it, expect, vi, beforeEach } from "vitest";
import { GoalService } from "../../src/lib/services/goal-service";
import { prisma } from "../../src/lib/prisma";
import { generateText } from "ai";
import { executeTavilySearch } from "../../src/lib/tools/research";

vi.mock("../../src/lib/prisma", () => ({
  prisma: {
    goal: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    opportunity: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    artifact: {
      create: vi.fn(),
    }
  }
}));

vi.mock("ai", () => ({
  generateText: vi.fn(),
}));

vi.mock("../../src/lib/tools/research", () => ({
  executeTavilySearch: vi.fn(),
}));

describe("GoalService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should create a goal", async () => {
    vi.mocked(prisma.goal.create).mockResolvedValue({ id: "goal-1", title: "Test Goal" } as any);
    const goal = await GoalService.createGoal("user-1", "Test Goal");
    expect(goal.title).toBe("Test Goal");
    expect(prisma.goal.create).toHaveBeenCalled();
  });

  it("should search opportunities", async () => {
    vi.mocked(prisma.goal.findUnique).mockResolvedValue({ id: "goal-1", userId: "user-1", title: "SWE Intern" } as any);
    vi.mocked(executeTavilySearch).mockResolvedValue("mocked tavily results");
    vi.mocked(generateText).mockResolvedValue({
      text: JSON.stringify([{ title: "Role 1", organization: "Org 1", url: "http://example.com" }])
    } as any);
    vi.mocked(prisma.opportunity.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.opportunity.create).mockResolvedValue({ id: "opp-1" } as any);

    const opps = await GoalService.searchOpportunities("goal-1", { userId: "user-1" });
    
    expect(opps.length).toBe(1);
    expect(executeTavilySearch).toHaveBeenCalled();
    expect(generateText).toHaveBeenCalled();
    expect(prisma.opportunity.create).toHaveBeenCalled();
  });

  it("should generate CV variant", async () => {
    vi.mocked(prisma.opportunity.findUnique).mockResolvedValue({ id: "opp-1", goalId: "goal-1", title: "Role", organization: "Org" } as any);
    vi.mocked(prisma.goal.findUnique).mockResolvedValue({ id: "goal-1", title: "SWE Intern" } as any);
    vi.mocked(generateText).mockResolvedValue({ text: "# Custom CV" } as any);
    vi.mocked(prisma.artifact.create).mockResolvedValue({ id: "art-1", content: "# Custom CV" } as any);

    const artifact = await GoalService.generateCVVariant("opp-1");
    
    expect(artifact.content).toBe("# Custom CV");
    expect(prisma.artifact.create).toHaveBeenCalled();
  });
});
