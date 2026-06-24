// Task API — List and Create
// Source: Architecture.md → /api/tasks, Tasks.md → T-007
// Dependencies: T-004 (store), T-005 (entropy)

import { NextRequest } from 'next/server';
import { store } from '@/lib/store';
import { respond, respondError } from '@/lib/api-helpers';
import { calculateEntropy } from '@/lib/entropy';

const DEMO_USER_ID = 'demo-user';

export async function GET() {
  try {
    const tasks = await store.getTasks(DEMO_USER_ID);
    return respond(tasks);
  } catch (error) {
    console.error('[GET /api/tasks]', error);
    return respondError('Failed to fetch tasks');
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validation (Validation.md → API routes validate required fields)
    if (!body.title || !body.deadline) {
      return respondError('title and deadline are required', 400);
    }

    const now = new Date().toISOString();
    const task = await store.createTask({
      userId: DEMO_USER_ID,
      title: body.title,
      description: body.description || '',
      deadline: body.deadline,
      estimatedMins: body.estimatedMins || 60,
      priority: 0.5,
      status: 'pending',
      subtasks: [],
      calendarBlocks: [],
      snoozeCount: 0,
      createdAt: now,
    });

    return respond(task, 201);
  } catch (error) {
    console.error('[POST /api/tasks]', error);
    return respondError('Failed to create task');
  }
}
