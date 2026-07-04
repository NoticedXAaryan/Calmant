import { buildUserContext, formatContextForPrompt } from "./agent-context";
import { prisma } from "./prisma";
import { AgentPipeline } from "./harness/pipeline";

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
    const context = formatContextForPrompt(await buildUserContext(userId), timeZone);
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
    const apiKey = process.env.GEMINI_API_KEY || process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY || "";
    
    // In a real streaming implementation, we would use events from the pipeline
    // For now we simulate streaming while it runs
    let isDone = false;
    let reply = "";
    let executionError: Error | null = null;
    
    const pipelinePromise = pipeline.run(
      cleanMessage,
      { cwd: process.cwd(), env: process.env as Record<string, string> },
      { 
        apiKey, 
        context,
        callbacks: {
          onClassified: () => console.log("Stream: classified"),
          onPlanned: () => console.log("Stream: planned"),
        }
      }
    );
    
    pipelinePromise.then(result => {
      reply = result.response || "I could not produce a useful response for that request.";
      isDone = true;
    }).catch(err => {
      executionError = err;
      isDone = true;
    });

    // Mimic stream chunks while staying buffered
    while (!isDone) {
      yield { thinking: true };
      await new Promise(r => setTimeout(r, 2000));
    }

    if (executionError) throw executionError;

    await prisma.agentRun.update({
      where: { id: run.id },
      data: { response: reply, status: "completed" },
    });

    yield { content: reply };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("[agentReplyStream] Error running pipeline:", errorMsg);
    await prisma.agentRun
      .update({
        where: { id: run.id },
        data: { response: errorMsg, status: "failed" },
      })
      .catch(() => {});
    yield { error: `I'm having trouble executing the pipeline right now. Reason: ${errorMsg}` };
  }
}
