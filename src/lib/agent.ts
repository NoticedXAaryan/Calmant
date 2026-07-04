import { buildUserContext, formatContextForPrompt } from "./agent-context";
import { prisma } from "./prisma";
import { AgentPipeline } from "./harness/pipeline";
import { addMemory } from "./memory";

const MAX_AGENT_MESSAGE_CHARS = 8000;

function normalizeMessage(message: string) {
  return message.trim().slice(0, MAX_AGENT_MESSAGE_CHARS);
}

const pipeline = new AgentPipeline();

export async function agentReply(message: string, userId: string, timeZone?: string): Promise<string> {
  const cleanMessage = normalizeMessage(message);
  if (!cleanMessage) return "Send me a task, deadline, question, or plan to work on.";

  const run = await prisma.agentRun.create({
    data: {
      userId,
      prompt: cleanMessage,
      status: "running",
    },
  });

  try {
    const context = formatContextForPrompt(await buildUserContext(userId, cleanMessage), timeZone);
    const apiKey = process.env.GEMINI_API_KEY || process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY || "";
    
    const result = await pipeline.run(
      cleanMessage, 
      { cwd: process.cwd(), env: process.env as Record<string, string> },
      { apiKey, context }
    );

    const reply = result.response || "I could not produce a useful response for that request.";

    await prisma.agentRun.update({
      where: { id: run.id },
      data: { response: reply, status: "completed" },
    });

    // Extract and store memories from this conversation
    try {
      const conversationText = `User: ${cleanMessage}\nAssistant: ${reply}`;
      await addMemory(conversationText, userId);
    } catch (memErr) {
      console.warn("[agentReply] Memory storage failed:", memErr);
      // Non-fatal — don't block the response
    }

    return reply;
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("[agentReply] Error running pipeline:", errorMsg);
    await prisma.agentRun
      .update({
        where: { id: run.id },
        data: { response: errorMsg, status: "failed" },
      })
      .catch(() => {});
    return "I'm having trouble executing the pipeline right now. Try again in a moment.";
  }
}

export async function* agentReplyStream(message: string, userId: string, timeZone?: string): AsyncGenerator<{ content?: string, error?: string, thinking?: boolean, responseId?: string }> {
  const cleanMessage = normalizeMessage(message);
  if (!cleanMessage) {
    yield { content: "Send me a task, deadline, question, or plan to work on." };
    return;
  }

  const responseId = `resp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const run = await prisma.agentRun.create({
    data: {
      userId,
      prompt: cleanMessage,
      status: "running",
    },
  });

  // Signal that we're processing (exactly once)
  yield { thinking: true, responseId };

  try {
    const context = formatContextForPrompt(await buildUserContext(userId, cleanMessage), timeZone);
    const apiKey = process.env.GEMINI_API_KEY || process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY || "";
    
    // Await the pipeline directly — no polling loop
    const result = await pipeline.run(
      cleanMessage,
      { cwd: process.cwd(), env: process.env as Record<string, string> },
      { apiKey, context }
    );

    const reply = result.response || "I could not produce a useful response for that request.";

    await prisma.agentRun.update({
      where: { id: run.id },
      data: { response: reply, status: "completed" },
    });

    // Extract and store memories from this conversation
    try {
      const conversationText = `User: ${cleanMessage}\nAssistant: ${reply}`;
      await addMemory(conversationText, userId);
    } catch (memErr) {
      console.warn("[agentReplyStream] Memory storage failed:", memErr);
      // Non-fatal — don't block the response
    }

    // Yield the final content exactly once
    yield { content: reply, responseId };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("[agentReplyStream] Error running pipeline:", errorMsg);
    await prisma.agentRun
      .update({
        where: { id: run.id },
        data: { response: errorMsg, status: "failed" },
      })
      .catch(() => {});
    yield { error: `I'm having trouble executing the pipeline right now. Reason: ${errorMsg}`, responseId };
  }
}
