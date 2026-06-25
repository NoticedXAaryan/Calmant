import TelegramBot from "node-telegram-bot-api";
import { agentReply } from "./agent";
import { transcribeAudio } from "./audio";

// We need a way to map a Telegram User ID to our application User ID.
// For the hackathon, we assume the bot is used by the single local user, 
// so we'll grab the first user from Prisma, or pass it explicitly.
import { prisma } from "./prisma";

let bot: TelegramBot | null = null;

export async function initTelegram() {
  if (bot) return;

  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.log("[Telegram] TELEGRAM_BOT_TOKEN not set. Telegram bot is disabled.");
    return;
  }

  // Find the primary user (since this is a single-tenant hackathon demo)
  const user = await prisma.user.findFirst();
  if (!user) {
    console.error("[Telegram] No user found in database. Cannot start Telegram listener.");
    return;
  }
  const userId = user.id;

  bot = new TelegramBot(token, { polling: true });
  console.log("[Telegram] Bot is polling...");

  bot.on("message", async (msg) => {
    const chatId = msg.chat.id;

    try {
      let text = msg.text || "";

      // Handle Voice Notes
      if (msg.voice) {
        await bot!.sendMessage(chatId, "🎤 _Transcribing voice note..._", { parse_mode: "Markdown" });
        
        // Get the file link from Telegram
        const fileLink = await bot!.getFileLink(msg.voice.file_id);
        
        // Fetch the file as a buffer
        const response = await fetch(fileLink);
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        
        // Transcribe using Groq
        text = await transcribeAudio(buffer);
        await bot!.sendMessage(chatId, `🎤 *Transcription:* "${text}"\n_Processing..._`, { parse_mode: "Markdown" });
      }

      if (!text) return;

      // Pass the transcribed or raw text to the Agent
      const reply = await agentReply(text, userId);
      
      // Send the agent's response back to Telegram
      await bot!.sendMessage(chatId, reply);

    } catch (error) {
      console.error("[Telegram] Error processing message:", error);
      bot!.sendMessage(chatId, "Sorry, I encountered an error processing your request.");
    }
  });
}
