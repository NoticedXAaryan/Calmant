import TelegramBot from "node-telegram-bot-api";
import { prisma } from "../prisma";
import { ApprovalRequest } from "@prisma/client";

export class TelegramService {
  private static bot: TelegramBot | null = null;
  private static webhookUrl: string | null = null;

  static initialize(): TelegramBot | null {
    if (this.bot) return this.bot;

    const token = process.env.TELEGRAM_BOT_TOKEN;
    if (!token) {
      console.warn("[TelegramService] TELEGRAM_BOT_TOKEN not set. Telegram is disabled.");
      return null;
    }

    this.webhookUrl = process.env.TELEGRAM_WEBHOOK_URL || null;

    // If a webhook URL is provided, we don't start polling
    if (this.webhookUrl) {
      this.bot = new TelegramBot(token, { polling: false });
      this.bot.setWebHook(`${this.webhookUrl}/api/telegram/webhook`);
      console.log(`[TelegramService] Initialized with webhook: ${this.webhookUrl}`);
    } else {
      // Local dev fallback
      this.bot = new TelegramBot(token, { polling: true });
      
      // Bind polling events only if we're actually polling
      // We will lazily load update-router to avoid circular dependencies if needed
      import("../telegram/update-router").then(({ TelegramUpdateRouter }) => {
        this.bot!.on("message", async (msg) => {
          await TelegramUpdateRouter.routeUpdate({ update_id: Math.floor(Math.random() * 1000000), message: msg });
        });
        
        this.bot!.on("callback_query", async (query) => {
          await TelegramUpdateRouter.routeUpdate({ update_id: Math.floor(Math.random() * 1000000), callback_query: query });
        });
      });

      console.log("[TelegramService] Initialized with local polling.");
    }

    return this.bot;
  }

  static getStatus() {
    const configured = Boolean(process.env.TELEGRAM_BOT_TOKEN);
    if (!configured) return { configured: false, running: false, startedAt: null, userLinked: false, label: "Bot token missing" };
    return { configured: true, running: Boolean(this.bot), startedAt: new Date().toISOString(), userLinked: true, label: this.bot ? "Bot listener running" : "Ready to start" };
  }

  static async initTelegram() {
    this.initialize();
    return this.getStatus();
  }

  static async probeHealth(userId: string): Promise<boolean> {
    const bot = this.getBot();
    if (!bot) return false;
    const connection = await prisma.integrationConnection.findFirst({
      where: { userId, provider: "telegram", status: { not: "not_configured" } }
    });
    if (!connection || !connection.externalId) return false;
    try {
      await bot.sendChatAction(connection.externalId, "typing");
      return true;
    } catch {
      return false;
    }
  }

  static getBot(): TelegramBot | null {
    if (!this.bot) return this.initialize();
    return this.bot;
  }

  static async sendMessage(userId: string, text: string, options?: any): Promise<any> {
    const bot = this.getBot();
    if (!bot) return null;

    const connection = await prisma.integrationConnection.findFirst({
      where: { userId, provider: "telegram", status: { not: "not_configured" } }
    });

    if (!connection || !connection.externalId) return null;

    try {
      const msg = await bot.sendMessage(connection.externalId, text, options);
      
      await prisma.integrationConnection.update({
        where: { id: connection.id },
        data: { status: "live_verified", lastSuccessAt: new Date(), lastError: null }
      });
      return msg;
    } catch (err: any) {
      console.error(`[TelegramService] Error sending message to user ${userId}:`, err);
      await prisma.integrationConnection.update({
        where: { id: connection.id },
        data: { status: "degraded", lastFailureAt: new Date(), lastError: err.message }
      });
      return null;
    }
  }

  static async sendApprovalPrompt(userId: string, approval: ApprovalRequest): Promise<void> {
    const bot = this.getBot();
    if (!bot) return;

    const text = `⚠️ **Approval Required**\n\n${approval.title}\n${approval.description}\n\nDo you want to proceed?`;
    
    await this.sendMessage(userId, text, {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [[
          { text: "✅ Approve", callback_data: `approve_${approval.id}` },
          { text: "❌ Reject", callback_data: `reject_${approval.id}` }
        ]]
      }
    });
  }

  static async updateMessage(chatId: string | number, messageId: number, text: string, options?: any): Promise<boolean> {
    const bot = this.getBot();
    if (!bot) return false;

    try {
      await bot.editMessageText(text, { chat_id: chatId, message_id: messageId, ...options });
      return true;
    } catch (err) {
      // Ignored - usually means message content hasn't changed or message deleted
      return false;
    }
  }
}
