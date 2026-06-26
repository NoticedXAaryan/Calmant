// Widget API — Lightweight JSON endpoint for mobile widgets
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
// Removed getUserId

function getTimeLeft(deadline: Date): string {
  const diff = deadline.getTime() - Date.now();
  if (diff < 0) return 'OVERDUE';
  if (diff < 3600000) return `${Math.round(diff / 60000)}m`;
  if (diff < 86400000) return `${Math.round(diff / 3600000)}h`;
  return `${Math.round(diff / 86400000)}d`;
}

export async function GET(req: NextRequest) {
  try {
    // Authenticate via WIDGET token
    const authHeader = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized - Missing token' }, { status: 401 });
    }

    const connection = await prisma.integrationConnection.findFirst({
      where: {
        provider: 'widget',
        externalId: authHeader,
        status: 'connected',
      }
    });

    if (!connection) {
      return NextResponse.json({ error: 'Unauthorized - Invalid token' }, { status: 401 });
    }

    const userId = connection.userId;

    const tasks = await prisma.task.findMany({
      where: { userId, status: { in: ['PENDING', 'IN_PROGRESS'] } },
      orderBy: { entropyScore: 'desc' },
      take: 3
    });

    return NextResponse.json({
      tasks: tasks.map(t => ({
        id: t.id,
        title: t.title,
        entropyScore: t.entropyScore,
        timeLeft: getTimeLeft(t.deadline),
        status: t.status,
      })),
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[GET /api/widget/tasks]', error);
    return NextResponse.json({ error: 'Failed to fetch widget tasks' }, { status: 500 });
  }
}
