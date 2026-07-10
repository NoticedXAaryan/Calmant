import TelegramBot from "node-telegram-bot-api";
import { prisma } from "../prisma";
import { TelegramProductivityService } from "../services/telegram-productivity-service";
import { CommandCenterService } from "../services/command-center-service";
import { ReportService } from "../services/report-service";
import { MemoryRecordService } from "../services/memory-record-service";
import { ApprovalService } from "../agent-runtime/approval-service";

export class CommandHandler {
  static async handle(bot: TelegramBot, msg: import("node-telegram-bot-api").Message, userId: string, text: string) {
    const chatId = msg.chat.id;

    if (text === "/today") {
      const todayMsg = await TelegramProductivityService.formatToday(userId);
      await bot.sendMessage(chatId, todayMsg, { parse_mode: "Markdown" });
      return true;
    }

    if (text === "/status") {
      const statusMsg = await TelegramProductivityService.formatStatus(userId);
      await bot.sendMessage(chatId, statusMsg, { parse_mode: "Markdown" });
      return true;
    }

    if (text === "/approvals") {
      const appMsg = await TelegramProductivityService.formatApprovals(userId);
      await bot.sendMessage(chatId, appMsg, { parse_mode: "Markdown" });
      return true;
    }

    if (text === "/help") {
      const helpMsg = await TelegramProductivityService.formatHelp();
      await bot.sendMessage(chatId, helpMsg, { parse_mode: "Markdown" });
      return true;
    }

    if (text === "/report now") {
      await bot.sendMessage(chatId, "Generating morning report...");
      const report = await ReportService.generateMorningReport(userId);
      return true;
    }

    if (text.startsWith("/new ")) {
      const title = text.replace("/new ", "").trim();
      const objective = title; // Simplified for now
      const res = await CommandCenterService.createObjective(userId, title, objective);
      await bot.sendMessage(chatId, `✅ Goal created: ${res.goal.title}`);
      return true;
    }
    
    if (text.startsWith("/pause ")) {
      const id = text.replace("/pause ", "").trim();
      await CommandCenterService.pause(userId, id);
      await bot.sendMessage(chatId, `Goal paused.`);
      return true;
    }

    if (text.startsWith("/resume ")) {
      const id = text.replace("/resume ", "").trim();
      await CommandCenterService.resume(userId, id);
      await bot.sendMessage(chatId, `Goal resumed.`);
      return true;
    }
    
    if (text === "/memories") {
      const memories = await MemoryRecordService.list(userId);
      if (memories.length === 0) {
        await bot.sendMessage(chatId, "You have no saved memories.");
        return true;
      }
      let msgText = "**Your Memories:**\n\n";
      for (const m of memories.slice(0, 10)) {
        msgText += `• ${m.content} (Type: ${m.type})\n`;
      }
      if (memories.length > 10) msgText += `\n...and ${memories.length - 10} more.`;
      await bot.sendMessage(chatId, msgText, { parse_mode: "Markdown" });
      return true;
    }

    if (text.startsWith("/remember ")) {
      const content = text.replace("/remember ", "").trim();
      await MemoryRecordService.create({
        userId, type: "fact", content, confidence: 1.0
      });
      await bot.sendMessage(chatId, `✅ Remembered.`);
      return true;
    }

    if (text.startsWith("/approve ")) {
      const id = text.replace("/approve ", "").trim();
      await ApprovalService.resolveApproval(id, "approve", userId);
      await bot.sendMessage(chatId, `✅ Approved.`);
      return true;
    }

    if (text.startsWith("/reject ")) {
      const id = text.replace("/reject ", "").trim();
      await ApprovalService.resolveApproval(id, "reject", userId);
      await bot.sendMessage(chatId, `❌ Rejected.`);
      return true;
    }

    // Unimplemented placeholders for routing demo
    if (text.startsWith("/skill ") || text.startsWith("/research ") || text.startsWith("/browser ") || text.startsWith("/code ") || text.startsWith("/deck ") || text.startsWith("/job ") || text.startsWith("/revise ") || text.startsWith("/evidence ") || text.startsWith("/forget ")) {
      await bot.sendMessage(chatId, `Command parsed but not yet fully implemented in this MVP version.`);
      return true;
    }

    // fallback to old handling in update-router if return false
    return false;
  }
}
