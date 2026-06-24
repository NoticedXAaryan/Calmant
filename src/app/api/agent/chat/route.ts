// Agent: Chat API (Streaming)
// Source: Architecture.md → /api/agent/chat, Tasks.md → T-012

import { NextRequest } from 'next/server';
import { store } from '@/lib/store';
import { callGemini } from '@/lib/gemini';
import { AGENT_SYSTEM_PROMPT, CHAT_CONTEXT_PROMPT } from '@/lib/prompts';
import { respondError } from '@/lib/api-helpers';

const DEMO_USER_ID = 'demo-user';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { message } = body;

    if (!message) {
      return respondError('message is required', 400);
    }

    // Build context from current data
    const tasks = await store.getTasks(DEMO_USER_ID);
    const blocks = await store.getScheduleBlocks(DEMO_USER_ID);
    const memories = await store.getMemories(DEMO_USER_ID);

    const tasksContext = tasks
      .map(t => `- [${t.status}] "${t.title}" (entropy: ${t.entropyScore.toFixed(2)}, deadline: ${t.deadline}, ${t.subtasks.length} subtasks)`)
      .join('\n');

    const scheduleContext = blocks
      .slice(0, 20) // Limit context
      .map(b => `- ${b.startTime} → ${b.endTime}: "${b.title}" [${b.status}]`)
      .join('\n');

    const memoryContext = memories
      .map(m => `- ${m.fact} (confidence: ${m.confidence})`)
      .join('\n');

    const contextPrompt = CHAT_CONTEXT_PROMPT(tasksContext, scheduleContext, memoryContext);
    const fullPrompt = `${contextPrompt}\n\nUser message: ${message}`;

    const response = await callGemini(fullPrompt, {
      systemInstruction: AGENT_SYSTEM_PROMPT,
      temperature: 0.8,
    });

    // Return as simple JSON (not streaming for simplicity in hackathon)
    return Response.json({
      success: true,
      data: {
        role: 'assistant',
        content: response,
        timestamp: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[POST /api/agent/chat]', error);
    return respondError('Failed to chat. Is GEMINI_API_KEY set?');
  }
}
