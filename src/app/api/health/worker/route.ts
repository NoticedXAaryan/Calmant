import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const jobs = await prisma.backgroundJob.findMany({
      orderBy: { runAt: 'asc' },
      take: 50,
    });

    const stats = {
      queued: jobs.filter(j => j.status === 'queued').length,
      processing: jobs.filter(j => j.status === 'processing').length,
      failed: jobs.filter(j => j.status === 'failed').length,
      completed: jobs.filter(j => j.status === 'completed').length,
      total: jobs.length,
    };

    return NextResponse.json({
      status: 'ok',
      queueBackend: 'prisma',
      stats,
      recentJobs: jobs.slice(0, 10).map(j => ({
        id: j.id,
        name: j.name,
        status: j.status,
        runAt: j.runAt,
        attempts: j.attempts,
        lastError: j.lastError
      }))
    });
  } catch (error: any) {
    return NextResponse.json(
      { status: 'error', error: error.message },
      { status: 500 }
    );
  }
}
