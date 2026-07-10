import TelegramBot from "node-telegram-bot-api";
import { CommandHandler } from "./command-handler";

export class TelegramIntentRouter {
  static async route(bot: TelegramBot, msg: import("node-telegram-bot-api").Message, userId: string, text: string) {
    const lower = text.toLowerCase();
    
    // Natural language heuristics map to commands
    
    if (lower.includes("what needs my attention") || lower.includes("today") || lower.includes("summary")) {
      return await CommandHandler.handle(bot, msg, userId, "/today");
    }

    if (lower.includes("status") || lower.includes("how are things") || lower.includes("active missions")) {
      return await CommandHandler.handle(bot, msg, userId, "/status");
    }

    if (lower.includes("approve the") || lower.includes("looks good, approve") || lower.includes("i approve")) {
      // In a real LLM router, we'd extract the specific approval ID.
      // For MVP, we list approvals and ask them to click.
      await bot.sendMessage(msg.chat.id, "I see you want to approve something. Please select it from the pending approvals:");
      return await CommandHandler.handle(bot, msg, userId, "/approvals");
    }

    if (lower.includes("remember that") || lower.includes("remember:")) {
      const fact = text.replace(/remember that/i, "").replace(/remember:/i, "").trim();
      return await CommandHandler.handle(bot, msg, userId, `/remember ${fact}`);
    }

    if (lower.includes("generate report") || lower.includes("report now") || lower.includes("give me a report")) {
      return await CommandHandler.handle(bot, msg, userId, "/report now");
    }

    // Default: treat as a new goal/objective intake
    return await CommandHandler.handle(bot, msg, userId, `/new ${text}`);
  }
}
