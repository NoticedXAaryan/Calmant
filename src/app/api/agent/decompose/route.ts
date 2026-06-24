// Agent: Task Decomposition API
// Source: Architecture.md → /api/agent/decompose, Tasks.md → T-010
// Dependencies: T-007, T-008, T-009

import { NextRequest } from 'next/server';
import { store } from '@/lib/store';
import { callGeminiJSON } from '@/lib/gemini';
import { DECOMPOSE_PROMPT } from '@/lib/prompts';
import { respond, respondError, generateId } from '@/lib/api-helpers';
import type { DecomposeResult } from '@/lib/types';

const DEMO_USER_ID = 'demo-user';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { taskId } = body;

    if (!taskId) {
      return respondError('taskId is required', 400);
    }

    const task = await store.getTask(taskId);
    if (!task) return respondError('Task not found', 404);

    // Get user memories for context
    const memories = await store.getMemories(DEMO_USER_ID);
    const memoryContext = memories.map(m => `- ${m.fact} (${m.category})`).join('\n');

    // Call Gemini for decomposition
    const prompt = DECOMPOSE_PROMPT(
      task.title,
      task.description,
      task.deadline,
      task.estimatedMins,
      memoryContext
    );

    const result = await callGeminiJSON<DecomposeResult>(prompt, {
      temperature: 0.7,
    });

    // Create subtasks from Gemini response
    const subtasks: Array<{
      id: string;
      title: string;
      estimatedMins: number;
      status: 'pending' | 'done';
      scheduledBlockId?: string;
    }> = result.subtasks.map(st => ({
      id: generateId(),
      title: st.title,
      estimatedMins: st.estimatedMins,
      status: 'pending' as const,
    }));

    // Auto-schedule subtasks into available slots
    const scheduleBlocks = await store.getScheduleBlocks(DEMO_USER_ID);
    const bookedBlocks = [];

    // Start scheduling from now or tomorrow 9am, whichever is later
    const now = new Date();
    let slotStart = new Date();
    if (slotStart.getHours() >= 20) {
      // If after 8pm, start tomorrow at 9am
      slotStart.setDate(slotStart.getDate() + 1);
      slotStart.setHours(9, 0, 0, 0);
    } else if (slotStart.getHours() < 9) {
      slotStart.setHours(9, 0, 0, 0);
    } else {
      // Round up to next hour
      slotStart.setHours(slotStart.getHours() + 1, 0, 0, 0);
    }

    for (const subtask of subtasks) {
      // Skip past existing blocks
      let conflictsFound = true;
      while (conflictsFound) {
        conflictsFound = false;
        const slotEnd = new Date(slotStart.getTime() + subtask.estimatedMins * 60000);

        for (const block of scheduleBlocks) {
          const bStart = new Date(block.startTime).getTime();
          const bEnd = new Date(block.endTime).getTime();
          const sStart = slotStart.getTime();
          const sEnd = slotEnd.getTime();

          if (sStart < bEnd && sEnd > bStart) {
            // Conflict — move past this block
            slotStart = new Date(bEnd);
            conflictsFound = true;
            break;
          }
        }

        // Don't schedule after 9pm — jump to next day 9am
        if (slotStart.getHours() >= 21 || (slotStart.getHours() + subtask.estimatedMins / 60) > 21) {
          slotStart.setDate(slotStart.getDate() + 1);
          slotStart.setHours(9, 0, 0, 0);
        }
      }

      const slotEnd = new Date(slotStart.getTime() + subtask.estimatedMins * 60000);

      const block = await store.createScheduleBlock({
        userId: DEMO_USER_ID,
        taskId: task.id,
        subtaskId: subtask.id,
        title: subtask.title,
        startTime: slotStart.toISOString(),
        endTime: slotEnd.toISOString(),
        type: 'work',
        status: 'scheduled',
      });

      subtask.scheduledBlockId = block.id;
      bookedBlocks.push(block);

      // Move slot past this block + 15 min break
      slotStart = new Date(slotEnd.getTime() + 15 * 60000);
    }

    // Update task with subtasks
    await store.updateTask(taskId, {
      subtasks,
      estimatedMins: result.adjustedTotalMins || task.estimatedMins,
      calendarBlocks: bookedBlocks.map(b => b.id),
      status: 'in_progress',
    });

    return respond({
      subtasks,
      scheduleBlocks: bookedBlocks,
      reasoning: result.reasoning,
      adjustedTotalMins: result.adjustedTotalMins,
    });
  } catch (error) {
    console.error('[POST /api/agent/decompose]', error);
    return respondError('Failed to decompose task. Is GEMINI_API_KEY set?');
  }
}
