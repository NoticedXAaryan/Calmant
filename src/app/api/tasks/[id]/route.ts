// Task API — Single Task Operations (GET, PATCH, DELETE)
// Source: Architecture.md → /api/tasks/[id], Tasks.md → T-007

import { NextRequest } from 'next/server';
import { store } from '@/lib/store';
import { respond, respondError } from '@/lib/api-helpers';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const task = await store.getTask(id);
    if (!task) return respondError('Task not found', 404);
    return respond(task);
  } catch (error) {
    console.error('[GET /api/tasks/[id]]', error);
    return respondError('Failed to fetch task');
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const task = await store.updateTask(id, body);
    if (!task) return respondError('Task not found', 404);
    return respond(task);
  } catch (error) {
    console.error('[PATCH /api/tasks/[id]]', error);
    return respondError('Failed to update task');
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const deleted = await store.deleteTask(id);
    if (!deleted) return respondError('Task not found', 404);
    return respond({ deleted: true });
  } catch (error) {
    console.error('[DELETE /api/tasks/[id]]', error);
    return respondError('Failed to delete task');
  }
}
