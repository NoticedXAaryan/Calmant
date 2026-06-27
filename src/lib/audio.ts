import Groq from "groq-sdk";
import fs from "fs";
import path from "path";
import os from "os";

/**
 * Transcribes an audio buffer (.ogg) from WhatsApp using Groq's whisper model.
 */
export async function transcribeAudio(buffer: Buffer): Promise<string> {
  if (!process.env.GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY is missing. Cannot transcribe audio.");
  }

  const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
  });

  // Groq SDK requires a file stream, so we write the buffer to a temp file
  const tempFilePath = path.join(os.tmpdir(), `wa-audio-${Date.now()}.ogg`);
  fs.writeFileSync(tempFilePath, buffer);

  try {
    const transcription = await groq.audio.transcriptions.create({
      file: fs.createReadStream(tempFilePath),
      model: "whisper-large-v3",
      prompt: "The user is creating a task, reminder, or talking to their AI assistant.",
      response_format: "json",
      language: "en", 
    });

    return transcription.text;
  } finally {
    // Clean up temp file
    try {
      fs.unlinkSync(tempFilePath);
    } catch (e) {
      console.error("Failed to clean up temp audio file:", e);
    }
  }
}
