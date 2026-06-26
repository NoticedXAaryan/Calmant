import { NextRequest, NextResponse } from 'next/server';
import { Prisma, TaskStatus } from '@prisma/client';
import { TaskService } from '@/services/taskService';
import { getUserId } from '@/lib/auth-utils';

const VALID_STATUSES = new Set(Object.values(TaskStatus));

function errorMessage(error: any) {
  return error instanceof Error ? error.message : '';
}

function normalizeTaskUpdate(body: Record<string, unknown>): Prisma.TaskUpdateInput {
  const updateData: Prisma.TaskUpdateInput & Record<string, unknown> = { ...body };

  if (typeof updateData.deadline === 'string') {
    updateData.deadline = new Date(updateData.deadline);
  }

  if (typeof updateData.estimatedMins === 'string') {
    updateData.estimatedMins = Number(updateData.estimatedMins);
  }

  if (typeof updateData.priority === 'string') {
    updateData.priority = Number(updateData.priority);
  }

  if (typeof updateData.snoozeCount === 'string') {
    updateData.snoozeCount = Number(updateData.snoozeCount);
  }

  if (typeof updateData.status === 'string') {
    const normalized = updateData.status.toUpperCase() as TaskStatus;
    if (!VALID_STATUSES.has(normalized)) {
      throw new Error('Invalid status');
    }

    updateData.status = normalized;
    if (normalized === TaskStatus.DONE && !updateData.completedAt) {
      updateData.completedAt = new Date();
    }
    if (normalized !== TaskStatus.DONE && updateData.completedAt === undefined) {
      updateData.completedAt = null;
    }
  }

  delete updateData.subtasks;
  return updateData as Prisma.TaskUpdateInput;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = await getUserId();
    const task = await TaskService.getTaskById(id, userId);
    if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    return NextResponse.json(task);
  } catch (error) {
    console.error('[GET /api/tasks/[id]]', error);
    return NextResponse.json({ error: 'Failed to fetch task' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = await getUserId();
    const body = await request.json() as Record<string, unknown>;
    const updateData = normalizeTaskUpdate(body);
    const task = await TaskService.updateTask(id, userId, updateData);

    return NextResponse.json(task);
  } catch (error: any) {
    console.error('[PATCH /api/tasks/[id]]', error);
    const message = errorMessage(error);
    if (message === 'Task not found') {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }
    if (message === 'Invalid status') {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to update task' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const userId = await getUserId();

    await TaskService.deleteTask(id, userId);
    return NextResponse.json({ deleted: true });
  } catch (error: any) {
    console.error('[DELETE /api/tasks/[id]]', error);
    if (errorMessage(error) === 'Task not found') {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 });
  }
}
