import { buildUserContext, formatContextForPrompt } from "./agent-context";
import { prisma } from "./prisma";

const DEFAULT_HERMES_URL =
  process.env.NODE_ENV === "production" ? "http://hermes:8000" : "http://localhost:8000";

const MAX_AGENT_MESSAGE_CHARS = 8000;
const HERMES_TIMEOUT_MS = 90_000;

function getHermesUrl() {
  return (process.env.HERMES_AGENT_URL || DEFAULT_HERMES_URL).replace(/\/+$/, "");
}

function normalizeMessage(message: string) {
  return message.trim().slice(0, MAX_AGENT_MESSAGE_CHARS);
}

function buildHermesPrompt(message: string, context: string) {
  return `${context}

USER REQUEST:
${message}

Operate as Calmant's Hermes agency system. Use only the context for this signed-in user. If you need to create, update, or inspect user data, use the available Calmant tools for this same profile instead of guessing.`;
}

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
    const context = formatContextForPrompt(await buildUserContext(userId), timeZone);
    const res = await fetch(`${getHermesUrl()}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: userId,
        message: buildHermesPrompt(cleanMessage, context),
      }),
      signal: AbortSignal.timeout(HERMES_TIMEOUT_MS),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(`Hermes HTTP ${res.status}: ${detail || res.statusText}`);
    }

    const data = (await res.json()) as { reply?: unknown };
    const reply =
      typeof data.reply === "string" && data.reply.trim()
        ? data.reply.trim()
        : "I could not produce a useful response for that request.";

    await prisma.agentRun.update({
      where: { id: run.id },
      data: { response: reply, status: "completed" },
    });

    return reply;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[agentReply] Error calling Hermes:", message);
    await prisma.agentRun
      .update({
        where: { id: run.id },
        data: { response: message, status: "failed" },
      })
      .catch(() => {});
    return "I'm having trouble connecting to the Hermes agency right now. Try again in a moment.";
  }
}

export async function* agentReplyStream(message: string, userId: string, timeZone?: string): AsyncGenerator<{ content?: string, error?: string, thinking?: boolean }> {
  const cleanMessage = normalizeMessage(message);
  if (!cleanMessage) {
    yield { content: "Send me a task, deadline, question, or plan to work on." };
    return;
  }

  const run = await prisma.agentRun.create({
    data: {
      userId,
      prompt: cleanMessage,
      status: "running",
    },
  });

  try {
    const context = formatContextForPrompt(await buildUserContext(userId), timeZone);
    
    const fetchPromise = fetch(`${getHermesUrl()}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: userId,
        message: buildHermesPrompt(cleanMessage, context),
      }),
      signal: AbortSignal.timeout(HERMES_TIMEOUT_MS),
    });

    let isDone = false;
    let reply = "";
    let fetchError: Error | null = null;

    fetchPromise.then(async (res) => {
      if (!res.ok) {
        const detail = await res.text().catch(() => "");
        throw new Error(`Hermes HTTP ${res.status}: ${detail || res.statusText}`);
      }
      const data = (await res.json()) as { reply?: unknown };
      reply = typeof data.reply === "string" && data.reply.trim()
        ? data.reply.trim()
        : "I could not produce a useful response for that request.";
      isDone = true;
    }).catch(err => {
      fetchError = err;
      isDone = true;
    });

    // Mimic stream chunks while staying buffered
    while (!isDone) {
      yield { thinking: true };
      await new Promise(r => setTimeout(r, 2000));
    }

    if (fetchError) throw fetchError;

    await prisma.agentRun.update({
      where: { id: run.id },
      data: { response: reply, status: "completed" },
    });

    yield { content: reply };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("[agentReplyStream] Error calling Hermes:", errorMsg);
    await prisma.agentRun
      .update({
        where: { id: run.id },
        data: { response: errorMsg, status: "failed" },
      })
      .catch(() => {});
    yield { error: `I'm having trouble connecting to the Hermes agency right now. Reason: ${errorMsg}` };
  }
}
