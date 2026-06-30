import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserId } from '@/lib/auth-utils';

export async function GET() {
  try {
    await getUserId();

    const grouped = await prisma.backgroundJob.groupBy({
      by: ['status'],
      _count: { _all: true },
    });

    const stats = {
      queued: grouped.find((j) => j.status === 'queued')?._count._all ?? 0,
      processing: grouped.find((j) => j.status === 'processing')?._count._all ?? 0,
      failed: grouped.find((j) => j.status === 'failed')?._count._all ?? 0,
      completed: grouped.find((j) => j.status === 'completed')?._count._all ?? 0,
      total: grouped.reduce((sum, j) => sum + j._count._all, 0),
    };

    return NextResponse.json({
      status: 'ok',
      queueBackend: 'prisma',
      stats,
    });
  } catch (error: any) {
    if (error?.status === 401) {
      return NextResponse.json({ status: 'error', error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json(
      { status: 'error', error: error.message },
      { status: 500 }
    );
  }
}
