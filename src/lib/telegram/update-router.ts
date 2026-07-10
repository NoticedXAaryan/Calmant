import TelegramBot from "node-telegram-bot-api";
import { prisma } from "../prisma";
import { agentReplyStream } from "../agent";
import { transcribeAudio } from "../audio";
import { ApprovalService } from "../agent-runtime/approval-service";
import { TelegramService } from "../services/telegram-service";
import { MemoryService } from "../services/memory-service";
import { CommandHandler } from "./command-handler";

export class TelegramUpdateRouter {
  static async routeUpdate(update: import("node-telegram-bot-api").Update): Promise<void> {
    const bot = TelegramService.getBot();
    if (!bot) return;

    if (update.callback_query) {
      await this.handleCallbackQuery(bot, update.callback_query);
      return;
    }

    if (update.message) {
      await this.handleMessage(bot, update.message);
      return;
    }
  }

  private static async handleCallbackQuery(bot: TelegramBot, query: import("node-telegram-bot-api").CallbackQuery) {
    const { CallbackHandler } = await import("./callback-handler");
    await CallbackHandler.handle(bot, query);
  }

  private static async handleMessage(bot: TelegramBot, msg: import("node-telegram-bot-api").Message) {
    const chatId = msg.chat.id;
    let text = msg.text || "";

    try {
      if (text.startsWith("/connect ")) {
        await this.handleConnect(bot, chatId, text);
        return;
      }

      if (text === "/start") {
        await bot.sendMessage(chatId, "Welcome to Calmant! 🧠\nI'm your personal execution assistant.\n\nTo link your account, get a connect code from your dashboard:\nDashboard → Integrations → Telegram → Get Connect Code\n\nThen send: /connect YOUR_CODE");
        return;
      }

      if (text === "/status") {
        const connection = await prisma.integrationConnection.findFirst({
          where: { provider: "telegram", externalId: chatId.toString() },
        });
        if (connection) {
          await bot.sendMessage(chatId, "🟢 Connected to your Calmant account.");
        } else {
          await bot.sendMessage(chatId, "🔴 Not connected. Send `/connect CODE` using the code from your dashboard.");
        }
        return;
      }

      // Check linked account for all other commands
      const connection = await prisma.integrationConnection.findFirst({
        where: { provider: "telegram", externalId: chatId.toString() },
      });

      if (!connection) {
        await bot.sendMessage(chatId, "Your account is not linked. Send `/connect CODE` using the code from your dashboard.");
        return;
      }

      const userId = connection.userId;

      const handled = await CommandHandler.handle(bot, msg, userId, text);
      if (handled) return;

      if (text === "/runs") {
        const runs = await prisma.agentRun.findMany({
          where: { userId, status: { in: ["running", "waiting_approval"] } },
          orderBy: { createdAt: "desc" },
          take: 5
        });

        if (runs.length === 0) {
          await bot.sendMessage(chatId, "No active runs.");
          return;
        }

        let msgText = "**Active Runs:**\n\n";
        for (const run of runs) {
          msgText += `• Run \`${run.id.slice(-6)}\` - Status: ${run.status}\n`;
        }
        await bot.sendMessage(chatId, msgText, { parse_mode: "Markdown" });
        return;
      }

      if (text === "/approvals") {
        const approvals = await prisma.approvalRequest.findMany({
          where: { userId, status: "pending" },
          orderBy: { createdAt: "desc" },
          take: 5
        });

        if (approvals.length === 0) {
          await bot.sendMessage(chatId, "No pending approvals.");
          return;
        }

        let msgText = "**Pending Approvals:**\n\n";
        for (const app of approvals) {
          msgText += `• ${app.title} (ID: \`${app.id}\`)\n`;
        }
        await bot.sendMessage(chatId, msgText, { parse_mode: "Markdown" });
        return;
      }

      if (text === "/cancel") {
        const run = await prisma.agentRun.findFirst({
          where: { userId, status: { in: ["running", "waiting_approval"] } },
          orderBy: { createdAt: "desc" }
        });

        if (run) {
          await prisma.agentRun.update({ where: { id: run.id }, data: { status: "cancelled" } });
          await bot.sendMessage(chatId, `Cancelled run \`${run.id.slice(-6)}\`.`, { parse_mode: "Markdown" });
        } else {
          await bot.sendMessage(chatId, "No active run to cancel.");
        }
        return;
      }

      if (text === "/memories") {
        const memories = await MemoryService.getActiveMemories(userId);
        if (memories.length === 0) {
          await bot.sendMessage(chatId, "You have no saved memories.");
          return;
        }

        let msgText = "**Your Memories:**\n\n";
        for (const m of memories.slice(0, 10)) {
          msgText += `• ${m.fact} (Cat: ${m.category})\n`;
        }
        if (memories.length > 10) {
          msgText += `\n...and ${memories.length - 10} more.`;
        }
        await bot.sendMessage(chatId, msgText, { parse_mode: "Markdown" });
        return;
      }

      if (text === "/review") {
        const pending = await MemoryService.getPendingMemories(userId);
        if (pending.length === 0) {
          await bot.sendMessage(chatId, "No memories pending review.");
          return;
        }

        const m = pending[0];
        await bot.sendMessage(chatId, `**Review Memory (1/${pending.length})**\n\nFact: ${m.fact}\nCategory: ${m.category}`, {
          parse_mode: "Markdown",
          reply_markup: {
            inline_keyboard: [
              [
                { text: "✅ Approve", callback_data: `mem_approve_${m.id}` },
                { text: "❌ Reject", callback_data: `mem_reject_${m.id}` }
              ]
            ]
          }
        });
        return;
      }

      if (text === "/goals") {
        const { GoalService } = await import("../services/goal-service");
        const goals = await GoalService.getActiveGoals(userId);
        if (goals.length === 0) {
          await bot.sendMessage(chatId, "You have no active goals.");
          return;
        }

        let msgText = "**Your Goals:**\n\n";
        for (const g of goals) {
          msgText += `• ${g.title} (${g._count.opportunities} opportunities found)\n`;
        }
        await bot.sendMessage(chatId, msgText, { parse_mode: "Markdown" });
        return;
      }

      if (text.startsWith("/goal ")) {
        const title = text.replace("/goal ", "").trim();
        if (!title) {
          await bot.sendMessage(chatId, "Please provide a goal title: /goal <title>");
          return;
        }
        const { GoalService } = await import("../services/goal-service");
        const goal = await GoalService.createGoal(userId, title);
        await bot.sendMessage(chatId, `✅ Goal created: **${goal.title}**\n\nI will now autonomously search for opportunities related to this goal!`, { parse_mode: "Markdown" });
        
        // Trigger async search
        bot.sendMessage(chatId, `🔍 Initiating background search for "${goal.title}"...`);
        GoalService.searchOpportunities(goal.id, { userId }).then(opps => {
          bot.sendMessage(chatId, `🎯 Found ${opps.length} new opportunities for "${goal.title}". Use /opportunities to view them.`);
        }).catch(err => {
          bot.sendMessage(chatId, `❌ Failed to search for opportunities: ${err.message}`);
        });
        return;
      }

      if (text === "/opportunities") {
        const opps = await prisma.opportunity.findMany({
          where: { userId, status: "found" },
          take: 10,
          orderBy: { createdAt: "desc" }
        });

        if (opps.length === 0) {
          await bot.sendMessage(chatId, "No opportunities found yet. Have you set a /goal?");
          return;
        }

        let msgText = "**Latest Opportunities:**\n\n";
        for (const o of opps) {
          msgText += `• **${o.title}** at ${o.organization || 'Unknown'}\n  ${o.sourceUrl}\n`;
        }
        await bot.sendMessage(chatId, msgText, { parse_mode: "Markdown" });
        return;
      }

      // Handle audio
      if (msg.voice) {
        await bot.sendMessage(chatId, "Voice note received. Transcribing...");
        const fileLink = await bot.getFileLink(msg.voice.file_id);
        const response = await fetch(fileLink);
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        text = await transcribeAudio(buffer);
        await bot.sendMessage(chatId, `Transcription: "${text}"\nProcessing...`);
      }

      if (!text.trim()) return;

      // Natural language input -> agent pipeline
      const placeholderMsg = await bot.sendMessage(chatId, "🤔 Analyzing your request...");
      
      try {
        const stream = agentReplyStream(text, userId);
        
        let lastMessageText = "";
        
        for await (const chunk of stream) {
          if (chunk.content) {
            // Final content
            await bot.deleteMessage(chatId, placeholderMsg.message_id).catch(() => {});
            await bot.sendMessage(chatId, chunk.content, { parse_mode: "Markdown" });
          } else if (chunk.error) {
            // Error
            await bot.editMessageText(`❌ Error: ${chunk.error}`, { chat_id: chatId, message_id: placeholderMsg.message_id });
          } else if (chunk.event) {
            // This captures agent events in real-time
            const stepMsg = `🔄 ${chunk.event.message}...`;
            if (stepMsg !== lastMessageText) {
               bot.editMessageText(stepMsg, { chat_id: chatId, message_id: placeholderMsg.message_id }).catch(() => {});
               lastMessageText = stepMsg;
            }
          }
        }
      } catch (error: any) {
        await bot.editMessageText(`❌ Error: ${error.message}`, { chat_id: chatId, message_id: placeholderMsg.message_id });
      }

      // If not handled by explicit command, route via natural language intent
      const { TelegramIntentRouter } = await import("./telegram-intent-router");
      await TelegramIntentRouter.route(bot, msg, userId, text);
    } catch (err) {
      console.error("[Telegram Router] Message Error:", err);
    }
  }

  private static async handleConnect(bot: TelegramBot, chatId: number, text: string) {
    const code = text.split(" ")[1];
    if (!code) {
      await bot.sendMessage(chatId, "Please provide the connect code: /connect 123456");
      return;
    }

    const verification = await prisma.verification.findFirst({
      where: { identifier: `telegram_connect_${code}` },
    });

    if (!verification || verification.expiresAt < new Date()) {
      await bot.sendMessage(chatId, "Invalid or expired connect code.");
      return;
    }

    const userId = verification.value;

    const existingConnection = await prisma.integrationConnection.findFirst({
      where: { userId, provider: "telegram" }
    });

    if (existingConnection) {
      await prisma.integrationConnection.update({
        where: { id: existingConnection.id },
        data: {
          externalId: chatId.toString(),
          status: "live_verified",
          lastSuccessAt: new Date(),
          lastCheckedAt: new Date()
        }
      });
    } else {
      await prisma.integrationConnection.create({
        data: {
          userId,
          provider: "telegram",
          externalId: chatId.toString(),
          status: "live_verified",
          lastSuccessAt: new Date(),
          lastCheckedAt: new Date()
        }
      });
    }

    await prisma.verification.delete({ where: { id: verification.id } });

    await bot.sendMessage(chatId, `✅ Connected! Hey there, I'm ready to help.\n\nYou can:\n• Send me a task: "Submit report by Friday 5pm"\n• Send a voice note — I'll transcribe and process it\n• Send a link — I'll extract deadlines and create a plan\n\nI'll also send you reminders and daily briefings here. 🎯`);
  }
}
