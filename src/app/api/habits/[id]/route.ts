// Habits API — Single Habit Operations
// Source: Architecture.md → /api/habits/[id]

import { NextRequest } from 'next/server';
import { store } from '@/lib/store';
import { respond, respondError } from '@/lib/api-helpers';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Handle toggle completion for today
    if (body.toggleDate) {
      const habit = await store.getHabit(id);
      if (!habit) return respondError('Habit not found', 404);

      const dateKey = body.toggleDate; // ISO date string e.g. "2026-06-25"
      const completions = { ...habit.completions };
      completions[dateKey] = !completions[dateKey];

      // Recalculate streak
      let streak = 0;
      const today = new Date();
      for (let i = 0; i < 365; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const key = d.toISOString().split('T')[0];
        if (completions[key]) {
          streak++;
        } else {
          break;
        }
      }

      const updated = await store.updateHabit(id, { completions, streak });
      return respond(updated);
    }

    const habit = await store.updateHabit(id, body);
    if (!habit) return respondError('Habit not found', 404);
    return respond(habit);
  } catch (error) {
    console.error('[PATCH /api/habits/[id]]', error);
    return respondError('Failed to update habit');
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const deleted = await store.deleteHabit(id);
    if (!deleted) return respondError('Habit not found', 404);
    return respond({ deleted: true });
  } catch (error) {
    console.error('[DELETE /api/habits/[id]]', error);
    return respondError('Failed to delete habit');
  }
}
