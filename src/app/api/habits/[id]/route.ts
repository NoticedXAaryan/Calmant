// Habits API — Single Habit Operations
import { NextRequest, NextResponse } from 'next/server';
import { HabitService } from '@/services/habitService';
import { getUserId } from '@/lib/auth-utils';
import { isAuthError, respondUnauthorized } from '@/lib/api-helpers';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = await getUserId();
    const body = await request.json();
    
    // We implement toggle completion here or arbitrary update.
    // If it's a date toggle request:
    if (body.toggleDate) {
      const result = await HabitService.toggleHabitCompletion(id, userId, new Date(body.toggleDate));
      return NextResponse.json(result);
    }

    // Otherwise, normal update (requires HabitService.updateHabit, or we keep Prisma here for simple generic updates)
    // To stay strict to SRP, I'll assume we don't have generic updates for now or we throw an error if not supported yet.
    return NextResponse.json({ error: 'Only toggleDate is supported currently via HabitService' }, { status: 400 });
  } catch (error: any) {
    console.error('[PATCH /api/habits/[id]]', error);
    if (isAuthError(error)) return respondUnauthorized();
    if (error instanceof Error && error.message === 'Habit not found') {
      return NextResponse.json({ error: 'Habit not found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Failed to update habit' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = await getUserId();
    
    await HabitService.deleteHabit(id, userId);
    return NextResponse.json({ deleted: true });
  } catch (error: any) {
    console.error('[DELETE /api/habits/[id]]', error);
    if (isAuthError(error)) return respondUnauthorized();
    if (error instanceof Error && error.message === 'Habit not found') {
      return NextResponse.json({ error: 'Habit not found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Failed to delete habit' }, { status: 500 });
  }
}
