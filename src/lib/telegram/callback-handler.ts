import TelegramBot from "node-telegram-bot-api";
import { prisma } from "../../prisma";
import { ApprovalService } from "../../agent-runtime/approval-service";
import { MemoryRecordService } from "../../services/memory-record-service";
import { CommandCenterService } from "../../services/command-center-service";

export class CallbackHandler {
  static async handle(bot: TelegramBot, query: import("node-telegram-bot-api").CallbackQuery) {
    const data = query.data;
    if (!data) return;

    if (!query.message || !query.message.chat) return;
    const chatId = query.message.chat.id;

    const connection = await prisma.integrationConnection.findFirst({
      where: { provider: "telegram", externalId: chatId.toString() }
    });
    if (!connection) {
      await bot.answerCallbackQuery(query.id, { text: "Account not linked." });
      return;
    }
    const userId = connection.userId;

    try {
      if (data.startsWith("mem_approve_") || data.startsWith("mem_reject_")) {
        const parts = data.split("_");
        const action = parts[1] as "approve" | "reject";
        const memoryId = parts.slice(2).join("_");

        if (action === "approve") {
          await MemoryRecordService.trust(memoryId);
        } else {
          await MemoryRecordService.reject(memoryId);
        }
        
        await bot.answerCallbackQuery(query.id, { text: `Memory ${action}d!` });
        await bot.editMessageText(`Memory was **${action}d**.`, {
          chat_id: chatId,
          message_id: query.message.message_id,
          parse_mode: "Markdown"
        });
        return;
      }

      if (data.startsWith("approve_") || data.startsWith("reject_") || data.startsWith("revise_") || data.startsWith("evidence_")) {
        const parts = data.split("_");
        const action = parts[0] as "approve" | "reject" | "revise" | "evidence";
        const approvalId = parts.slice(1).join("_");

        if (action === "evidence" || action === "revise") {
          await bot.answerCallbackQuery(query.id, { text: `Action ${action} pending implementation.` });
          return;
        }

        await ApprovalService.resolveApproval(approvalId, action, userId);
        await bot.answerCallbackQuery(query.id, { text: `Successfully ${action}d!` });
        
        await bot.editMessageText(`Approval request was **${action}d**.`, {
          chat_id: chatId,
          message_id: query.message.message_id,
          parse_mode: "Markdown"
        });
        return;
      }
      
      if (data.startsWith("pause_") || data.startsWith("resume_")) {
        const parts = data.split("_");
        const action = parts[0];
        const goalId = parts.slice(1).join("_");
        
        if (action === "pause") {
          await CommandCenterService.pause(userId, goalId);
        } else {
          await CommandCenterService.resume(userId, goalId);
        }
        await bot.answerCallbackQuery(query.id, { text: `Goal ${action}d!` });
        return;
      }

      await bot.answerCallbackQuery(query.id, { text: "Unknown action" });
    } catch (err: any) {
      await bot.answerCallbackQuery(query.id, { text: `Error: ${err.message}`, show_alert: true });
    }
  }
}
