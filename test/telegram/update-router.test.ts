import { TelegramUpdateRouter } from "@/lib/telegram/update-router";
import { TelegramService } from "@/lib/services/telegram-service";
import { prisma } from "@/lib/prisma";
import { ApprovalService } from "@/lib/agent-runtime/approval-service";
import { describe, it, expect, beforeEach, vi, Mock } from "vitest";

// We will spy on TelegramService directly instead of mocking the whole module
// vi.mock("@/lib/services/telegram-service");
vi.mock("@/lib/prisma", () => ({
  prisma: {
    integrationConnection: {
      findFirst: vi.fn(),
    },
    verification: {
      findFirst: vi.fn(),
      delete: vi.fn(),
    },
    agentRun: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    approvalRequest: {
      findMany: vi.fn(),
    }
  }
}));

vi.mock("@/lib/agent", () => ({
  agentReplyStream: vi.fn(async function* () {
    yield { event: { message: "Thinking..." } };
    yield { content: "Task completed" };
  }),
}));
vi.mock("@/lib/audio", () => ({
  transcribeAudio: vi.fn().mockResolvedValue("transcribed text"),
}));
// vi.mock("@/lib/agent-runtime/approval-service");

describe("TelegramUpdateRouter", () => {
  let mockBot: any;

  beforeEach(() => {
    vi.clearAllMocks();
    mockBot = {
      sendMessage: vi.fn().mockResolvedValue({ message_id: 123 }),
      editMessageText: vi.fn().mockResolvedValue(true),
      deleteMessage: vi.fn().mockResolvedValue(true),
      answerCallbackQuery: vi.fn().mockResolvedValue(true),
    };
    vi.spyOn(TelegramService, "getBot").mockReturnValue(mockBot);
  });

  it("should handle /start command", async () => {
    await TelegramUpdateRouter.routeUpdate({
      update_id: 1,
      message: {
        message_id: 1,
        date: 123,
        chat: { id: 456, type: "private" },
        text: "/start",
      }
    });

    expect(mockBot.sendMessage).toHaveBeenCalledWith(456, expect.stringContaining("Welcome to Calmant"));
  });

  it("should prompt linking if not connected", async () => {
    (prisma.integrationConnection.findFirst as Mock).mockResolvedValue(null);

    await TelegramUpdateRouter.routeUpdate({
      update_id: 1,
      message: {
        message_id: 1,
        date: 123,
        chat: { id: 456, type: "private" },
        text: "hello",
      }
    });

    expect(mockBot.sendMessage).toHaveBeenCalledWith(456, expect.stringContaining("Your account is not linked."));
  });

  it("should handle text message if connected", async () => {
    (prisma.integrationConnection.findFirst as Mock).mockResolvedValue({ userId: "u1", externalId: "456" });

    await TelegramUpdateRouter.routeUpdate({
      update_id: 1,
      message: {
        message_id: 1,
        date: 123,
        chat: { id: 456, type: "private" },
        text: "do something",
      }
    });

    expect(mockBot.sendMessage).toHaveBeenCalledWith(456, "🤔 Analyzing your request...");
    // Since stream is mocked, we should see it send final content
    expect(mockBot.sendMessage).toHaveBeenCalledWith(456, "Task completed", { parse_mode: "Markdown" });
  });

  it("should handle approve callback query", async () => {
    (prisma.integrationConnection.findFirst as Mock).mockResolvedValue({ userId: "u1", externalId: "456" });
    vi.spyOn(ApprovalService, "resolveApproval").mockResolvedValue(true as any);

    await TelegramUpdateRouter.routeUpdate({
      update_id: 2,
      callback_query: {
        id: "cq1",
        from: { id: 1, is_bot: false, first_name: "test" },
        message: {
          message_id: 1,
          date: 123,
          chat: { id: 456, type: "private" },
        },
        data: "approve_req1",
        chat_instance: "1",
      }
    });

    expect(ApprovalService.resolveApproval).toHaveBeenCalledWith("req1", "approve", "u1");
    expect(mockBot.answerCallbackQuery).toHaveBeenCalledWith("cq1", { text: "Successfully approved!" });
    expect(mockBot.editMessageText).toHaveBeenCalledWith(expect.stringContaining("approved"), expect.any(Object));
  });
});
