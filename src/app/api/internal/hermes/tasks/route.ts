import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

function authenticateInternalRequest(req: NextRequest) {
  const secret = process.env.HERMES_INTERNAL_API_SECRET;
  const authHeader = req.headers.get('authorization');
  
  if (!secret || !authHeader || authHeader !== `Bearer ${secret}`) {
    return false;
  }
  return true;
}

export async function GET(req: NextRequest) {
  if (!authenticateInternalRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const userId = req.nextUrl.searchParams.get('userId');
  if (!userId) {
    return NextResponse.json({ error: 'Missing userId' }, { status: 400 });
  }

  try {
    const tasks = await prisma.task.findMany({
      where: {
        userId,
        status: { in: ['PENDING', 'IN_PROGRESS'] },
      },
      select: {
        id: true,
        title: true,
        status: true,
        deadline: true,
        entropyScore: true,
      },
    });

    return NextResponse.json({
      status: 'success',
      tasks: tasks.map(t => ({
        ...t,
        deadline: t.deadline.toISOString()
      }))
    });
  } catch (error: any) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!authenticateInternalRequest(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { userId, title, estimatedMins = 30 } = await req.json();

    if (!userId || !title) {
      return NextResponse.json({ error: 'Missing userId or title' }, { status: 400 });
    }

    const task = await prisma.task.create({
      data: {
        userId,
        title,
        status: 'PENDING',
        estimatedMins,
        entropyScore: 0.0,
        deadline: new Date(Date.now() + 24 * 60 * 60 * 1000), // Default to 24h if not specified by hermes
      },
      select: { id: true },
    });

    return NextResponse.json({ status: 'created', taskId: task.id });
  } catch (error: any) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
