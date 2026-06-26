import TelegramBot from "node-telegram-bot-api";
import { agentReply } from "./agent";
import { transcribeAudio } from "./audio";
import { prisma } from "./prisma";

let bot: TelegramBot | null = null;
let startedAt: string | null = null;
let primaryUserId: string | null = null;

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
    userLinked: Boolean(primaryUserId),
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

  const user = await prisma.user.findFirst();
  if (!user) {
    console.error("[Telegram] No user found in database. Cannot start Telegram listener.");
    return {
      configured: true,
      running: false,
      startedAt: null,
      userLinked: false,
      label: "No app user found",
    };
  }

  primaryUserId = user.id;
  bot = new TelegramBot(token, { polling: true });
  startedAt = new Date().toISOString();
  console.log("[Telegram] Bot is polling...");

  bot.on("message", async (msg) => {
    const chatId = msg.chat.id;

    try {
      let text = msg.text || "";

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

      const reply = await agentReply(text, primaryUserId!);
      await bot!.sendMessage(chatId, reply);
    } catch (error) {
      console.error("[Telegram] Error processing message:", error);
      await bot!.sendMessage(chatId, "Sorry, I encountered an error processing your request.");
    }
  });

  return getTelegramStatus();
}
