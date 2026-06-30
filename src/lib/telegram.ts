import TelegramBot from "node-telegram-bot-api";
import { agentReply } from "./agent";
import { transcribeAudio } from "./audio";
import { prisma } from "./prisma";

let bot: TelegramBot | null = null;
let startedAt: string | null = null;

export interface TelegramStatus {
  configured: boolean;
  running: boolean;
  startedAt: string | null;
  userLinked: boolean;
  label: string;
}

export function getTelegramStatus(): TelegramStatus {
  const configured = Boolean(process.env.TELEGRAM_BOT_TOKEN);

  if (!configured) {
    return {
      configured: false,
      running: false,
      startedAt: null,
      userLinked: false,
      label: "Bot token missing",
    };
  }

  return {
    configured: true,
    running: Boolean(bot),
    startedAt,
    userLinked: true, // we don't have a single user anymore
    label: bot ? "Bot listener running" : "Ready to start",
  };
}

export async function initTelegram(): Promise<TelegramStatus> {
  if (bot) return getTelegramStatus();

  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.log("[Telegram] TELEGRAM_BOT_TOKEN not set. Telegram bot is disabled.");
    return getTelegramStatus();
  }

  bot = new TelegramBot(token, { polling: true });
  startedAt = new Date().toISOString();
  console.log("[Telegram] Bot is polling...");

  bot.on("message", async (msg) => {
    const chatId = msg.chat.id;
    let text = msg.text || "";

    try {
      if (text.startsWith("/connect ")) {
        const code = text.split(" ")[1];
        if (!code) {
          await bot!.sendMessage(chatId, "Please provide the connect code: /connect 123456");
          return;
        }

        const verification = await prisma.verification.findFirst({
          where: { identifier: `telegram_connect_${code}` },
        });

        if (!verification || verification.expiresAt < new Date()) {
          await bot!.sendMessage(chatId, "Invalid or expired connect code.");
          return;
        }

        const userId = verification.value;

        // Upsert connection
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

        // Delete verification code
        await prisma.verification.delete({ where: { id: verification.id } });

        await bot!.sendMessage(chatId, `✅ Connected! Hey there, I'm ready to help.\n\nYou can:\n• Send me a task: "Submit report by Friday 5pm"\n• Send a voice note — I'll transcribe and process it\n• Send a link — I'll extract deadlines and create a plan\n\nI'll also send you reminders and daily briefings here. 🎯`);
        return;
      }

      if (text === "/start") {
        await bot!.sendMessage(chatId, "Welcome to Calmant! 🧠\nI'm your personal execution assistant.\n\nTo link your account, get a connect code from your dashboard:\nDashboard → Integrations → Telegram → Get Connect Code\n\nThen send: /connect YOUR_CODE");
        return;
      }

      if (text === "/help") {
        await bot!.sendMessage(chatId, "Commands:\n/start - Welcome message\n/connect CODE - Link your account\n/status - Check connection status\n/help - Show this message\n\nOtherwise, just chat naturally, send tasks, links, or voice notes!");
        return;
      }

      if (text === "/status") {
        const connection = await prisma.integrationConnection.findFirst({
          where: { provider: "telegram", externalId: chatId.toString() },
        });
        if (connection) {
          await bot!.sendMessage(chatId, "🟢 Connected to your Calmant account.");
        } else {
          await bot!.sendMessage(chatId, "🔴 Not connected. Send `/connect CODE` using the code from your dashboard.");
        }
        return;
      }

      // Lookup user
      const connection = await prisma.integrationConnection.findFirst({
        where: { provider: "telegram", externalId: chatId.toString() },
      });

      if (!connection) {
        await bot!.sendMessage(chatId, "Your account is not linked. Send `/connect CODE` using the code from your dashboard.");
        return;
      }

      const userId = connection.userId;

      if (msg.voice) {
        await bot!.sendMessage(chatId, "Voice note received. Transcribing...");
        const fileLink = await bot!.getFileLink(msg.voice.file_id);
        const response = await fetch(fileLink);
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        text = await transcribeAudio(buffer);
        await bot!.sendMessage(chatId, `Transcription: "${text}"\nProcessing...`);
      }

      if (!text.trim()) return;

      const placeholderMsg = await bot!.sendMessage(chatId, "🤔 Analyzing your request...");
      let isThinking = true;
      let dotCount = 1;
      
      const thinkingInterval = setInterval(() => {
        if (!isThinking) return;
        bot!.sendChatAction(chatId, "typing").catch(() => {});
        dotCount = (dotCount % 3) + 1;
        const dots = ".".repeat(dotCount);
        const phrases = ["🤔 Analyzing your request", "🔄 Routing to departments", "🧠 Gathering context", "⚡ Processing"];
        const phrase = phrases[dotCount % phrases.length];
        bot!.editMessageText(`${phrase}${dots}`, { chat_id: chatId, message_id: placeholderMsg.message_id }).catch(() => {});
      }, 4000);

      try {
        const reply = await agentReply(text, userId);
        isThinking = false;
        clearInterval(thinkingInterval);
        await bot!.deleteMessage(chatId, placeholderMsg.message_id).catch(() => {});
        await bot!.sendMessage(chatId, reply);
      } catch (error) {
        isThinking = false;
        clearInterval(thinkingInterval);
        await bot!.deleteMessage(chatId, placeholderMsg.message_id).catch(() => {});
        throw error;
      }
    } catch (error) {
      console.error("[Telegram] Error processing message:", error);
      await bot!.sendMessage(chatId, "Sorry, I encountered an error processing your request.");
    }
  });

  return getTelegramStatus();
}

export async function sendTelegramMessage(userId: string, text: string): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return false;
  
  const connection = await prisma.integrationConnection.findFirst({
    where: { userId, provider: "telegram", status: { not: "not_configured" } }
  });
  
  if (!connection || !connection.externalId) return false;
  
  try {
    const senderBot = bot || new TelegramBot(token, { polling: false });
    await senderBot.sendMessage(connection.externalId, text);
    
    // Update lastSuccessAt on successful send
    await prisma.integrationConnection.update({
      where: { id: connection.id },
      data: { status: "live_verified", lastSuccessAt: new Date(), lastError: null }
    });
    return true;
  } catch (err: any) {
    console.error(`[Telegram] Error sending message to user ${userId}:`, err);
    await prisma.integrationConnection.update({
      where: { id: connection.id },
      data: { status: "degraded", lastFailureAt: new Date(), lastError: err.message }
    });
    return false;
  }
}

export async function probeTelegramHealth(userId: string): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return false;
  
  const connection = await prisma.integrationConnection.findFirst({
    where: { userId, provider: "telegram", status: { not: "not_configured" } }
  });
  
  if (!connection || !connection.externalId) return false;
  
  try {
    const senderBot = bot || new TelegramBot(token, { polling: false });
    // sendChatAction requires valid permissions to the chat. It acts as a lightweight ping.
    await senderBot.sendChatAction(connection.externalId, "typing");
    return true;
  } catch (err: any) {
    return false;
  }
}
