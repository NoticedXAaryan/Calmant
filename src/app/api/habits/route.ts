// Habits API
import { NextRequest, NextResponse } from 'next/server';
import { HabitService } from '@/services/habitService';
import { getUserId } from '@/lib/auth-utils';
import { isAuthError, respondUnauthorized } from '@/lib/api-helpers';

export async function GET() {
  try {
    const userId = await getUserId();
    const habits = await HabitService.getUserHabits(userId);
    return NextResponse.json(habits);
  } catch (error) {
    console.error('[GET /api/habits]', error);
    if (isAuthError(error)) return respondUnauthorized();
    return NextResponse.json({ error: 'Failed to fetch habits' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.name || !body.frequency) {
      return NextResponse.json({ error: 'name and frequency are required' }, { status: 400 });
    }

    const userId = await getUserId();
    const habit = await HabitService.createHabit(userId, {
      name: body.name,
      frequency: body.frequency,
    });

    return NextResponse.json(habit, { status: 201 });
  } catch (error) {
    console.error('[POST /api/habits]', error);
    if (isAuthError(error)) return respondUnauthorized();
    return NextResponse.json({ error: 'Failed to create habit' }, { status: 500 });
  }
}
