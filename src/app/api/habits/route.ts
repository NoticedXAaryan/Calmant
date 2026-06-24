// Habits API — List and Create
// Source: Architecture.md → /api/habits, Tasks.md → T-016

import { NextRequest } from 'next/server';
import { store } from '@/lib/store';
import { respond, respondError } from '@/lib/api-helpers';

const DEMO_USER_ID = 'demo-user';

export async function GET() {
  try {
    const habits = await store.getHabits(DEMO_USER_ID);
    return respond(habits);
  } catch (error) {
    console.error('[GET /api/habits]', error);
    return respondError('Failed to fetch habits');
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.name) {
      return respondError('name is required', 400);
    }

    const habit = await store.createHabit({
      userId: DEMO_USER_ID,
      name: body.name,
      emoji: body.emoji || '✅',
      frequency: body.frequency || 'daily',
      streak: 0,
      completions: {},
      createdAt: new Date().toISOString(),
    });

    return respond(habit, 201);
  } catch (error) {
    console.error('[POST /api/habits]', error);
    return respondError('Failed to create habit');
  }
}
