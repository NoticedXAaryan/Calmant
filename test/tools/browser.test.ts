import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { executeBrowserNavigate, executeBrowserAction } from "../../src/lib/tools/browser";
import { BrowserSessionService } from "../../src/lib/services/browser-session-service";

vi.mock("../../src/lib/services/browser-session-service");
vi.mock("../../src/lib/prisma", () => ({
  prisma: {
    browserSession: {
      create: vi.fn().mockResolvedValue({ id: "mock-session-id" }),
      update: vi.fn(),
    },
    artifact: {
      create: vi.fn().mockResolvedValue({ id: "mock-artifact-id" }),
    },
  },
}));

describe("Browser Tool", () => {
  const mockContext = {
    userId: "user-123",
    runId: "run-456",
    toolCallId: "tool-789",
    cwd: "/",
    env: {},
  };

  const mockPage = {
    goto: vi.fn(),
    title: vi.fn().mockResolvedValue("Mock Page Title"),
    url: vi.fn().mockReturnValue("http://mock.url"),
    click: vi.fn(),
    fill: vi.fn(),
    evaluate: vi.fn().mockResolvedValue("Mock Text"),
    screenshot: vi.fn().mockResolvedValue(Buffer.from("mock-screenshot")),
  };

  const mockSession = {
    browser: { close: vi.fn() },
    context: {},
    page: mockPage,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (BrowserSessionService.startSession as any).mockResolvedValue("mock-session-id");
    (BrowserSessionService.getActiveSession as any).mockReturnValue(mockSession);
    (BrowserSessionService.updateSessionUrl as any).mockResolvedValue(undefined);
    (BrowserSessionService.captureScreenshot as any).mockResolvedValue("mock-artifact-id");
  });

  afterEach(() => {
    // Note: since runSessions is module-level state, tests might pollute each other.
    // In a real scenario we'd export a reset function.
  });

  it("should navigate to a URL", async () => {
    const result = await executeBrowserNavigate({ url: "http://example.com", waitFor: "load" }, mockContext);
    
    expect(mockPage.goto).toHaveBeenCalledWith("http://example.com", { waitUntil: "load" });
    expect(result).toContain("Navigated to: http://mock.url");
    expect(result).toContain("Title: Mock Page Title");
  });

  it("should extract text", async () => {
    const result = await executeBrowserAction({ action: "extract" }, mockContext);
    
    expect(mockPage.evaluate).toHaveBeenCalled();
    expect(result).toContain("Extracted from http://mock.url");
    expect(result).toContain("Mock Text");
  });

  it("should capture a screenshot and return artifact ID", async () => {
    const result = await executeBrowserAction({ action: "screenshot" }, mockContext);
    
    expect(BrowserSessionService.captureScreenshot).toHaveBeenCalledWith(
      "mock-session-id",
      "user-123",
      "run-456",
      "tool-789"
    );
    expect(result).toContain("Artifact ID: mock-artifact-id");
  });

  it("should click an element", async () => {
    await executeBrowserAction({ action: "click", selector: "#btn" }, mockContext);
    
    expect(mockPage.click).toHaveBeenCalledWith("#btn");
  });
});
