// Task API — Single Task Operations (GET, PATCH, DELETE)
import { NextRequest, NextResponse } from 'next/server';
import { TaskService } from '@/services/taskService';
import { getUserId } from '@/lib/auth-utils';

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
    const body = await request.json();
    
    // Handle nested subtasks update if provided
    let updateData: any = { ...body };
    if (body.subtasks) {
      delete updateData.subtasks;
    }

    const task = await TaskService.updateTask(id, userId, updateData);
    
    return NextResponse.json(task);
  } catch (error: any) {
    console.error('[PATCH /api/tasks/[id]]', error);
    if (error.message === 'Task not found') {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
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
    if (error.message === 'Task not found') {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 });
  }
}
