// Task API — List and Create
import { NextRequest, NextResponse } from 'next/server';
import { TaskService } from '@/services/taskService';
import { getUserId } from '@/lib/auth-utils';

export async function GET() {
  try {
    const userId = await getUserId();
    const tasks = await TaskService.getUserTasks(userId);
    return NextResponse.json(tasks);
  } catch (error) {
    console.error('[GET /api/tasks]', error);
    return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body.title || !body.deadline) {
      return NextResponse.json({ error: 'title and deadline are required' }, { status: 400 });
    }

    const userId = await getUserId();
    const task = await TaskService.createTask(userId, {
      title: body.title,
      description: body.description,
      deadline: new Date(body.deadline),
      estimatedMins: body.estimatedMins,
      priority: body.priority,
    });

    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    console.error('[POST /api/tasks]', error);
    return NextResponse.json({ error: 'Failed to create task' }, { status: 500 });
  }
}
