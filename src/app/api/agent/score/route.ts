// Agent: Priority Scoring API
// Source: Architecture.md → /api/agent/score, Tasks.md → T-011

import { store } from '@/lib/store';
import { callGeminiJSON } from '@/lib/gemini';
import { PRIORITY_SCORE_PROMPT } from '@/lib/prompts';
import { respond, respondError } from '@/lib/api-helpers';
import type { PriorityScore } from '@/lib/types';

const DEMO_USER_ID = 'demo-user';

export async function POST() {
  try {
    const tasks = await store.getTasks(DEMO_USER_ID);
    const pendingTasks = tasks.filter(t => t.status !== 'done' && t.status !== 'skipped');

    if (pendingTasks.length === 0) {
      return respond({ scores: [], message: 'No pending tasks to score' });
    }

    const memories = await store.getMemories(DEMO_USER_ID);
    const memoryContext = memories.map(m => `- ${m.fact}`).join('\n');

    const tasksJson = JSON.stringify(
      pendingTasks.map(t => ({
        id: t.id,
        title: t.title,
        deadline: t.deadline,
        estimatedMins: t.estimatedMins,
        status: t.status,
        snoozeCount: t.snoozeCount,
        hasSubtasks: t.subtasks.length > 0,
      })),
      null,
      2
    );

    const result = await callGeminiJSON<{ scores: PriorityScore[] }>(
      PRIORITY_SCORE_PROMPT(tasksJson, memoryContext),
      { temperature: 0.3 }
    );

    // Update priorities in store
    for (const score of result.scores) {
      await store.updateTask(score.taskId, { priority: score.score });
    }

    return respond(result);
  } catch (error) {
    console.error('[POST /api/agent/score]', error);
    return respondError('Failed to score priorities. Is GEMINI_API_KEY set?');
  }
}
