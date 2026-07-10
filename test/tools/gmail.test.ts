import { describe, it, expect, vi, beforeEach } from "vitest";
import { executeGmailSearch, executeGmailCreateDraft, executeGmailSendDraft } from "../../src/lib/tools/gmail";
import { GmailService } from "../../src/lib/services/gmail-service";

vi.mock("../../src/lib/services/gmail-service", () => ({
  GmailService: {
    searchMessages: vi.fn(),
    createDraft: vi.fn(),
    sendDraft: vi.fn(),
  }
}));

describe("Gmail Tools", () => {
  const mockContext = { userId: "user-123", runId: "run", toolCallId: "tool", cwd: "/", env: {} };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should search messages", async () => {
    vi.mocked(GmailService.searchMessages).mockResolvedValue([
      { id: "msg1", snippet: "Hello world", payload: { headers: [{ name: "From", value: "test@example.com" }] } }
    ]);
    
    const res = await executeGmailSearch({ query: "is:unread", maxResults: 5 }, mockContext);
    expect(res).toContain("Found 1 messages:");
    expect(res).toContain("test@example.com");
    expect(GmailService.searchMessages).toHaveBeenCalledWith("user-123", "is:unread", 5);
  });

  it("should create draft", async () => {
    vi.mocked(GmailService.createDraft).mockResolvedValue({ id: "draft-123" });
    
    const res = await executeGmailCreateDraft({
      to: "test@example.com",
      subject: "Test",
      bodyText: "Message body"
    }, mockContext);

    expect(res).toContain("Draft ID: draft-123");
    expect(GmailService.createDraft).toHaveBeenCalled();
  });

  it("should send draft", async () => {
    vi.mocked(GmailService.sendDraft).mockResolvedValue({ id: "draft-123", labelIds: ["SENT"] });
    
    const res = await executeGmailSendDraft({ draftId: "draft-123" }, mockContext);
    expect(res).toContain("sent successfully");
    expect(GmailService.sendDraft).toHaveBeenCalledWith("user-123", "draft-123");
  });
});
