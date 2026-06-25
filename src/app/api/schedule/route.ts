import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserId } from '@/lib/auth-utils';

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserId();
    const tasks = await prisma.task.findMany({
      where: { userId, status: { in: ['PENDING', 'IN_PROGRESS'] } },
      orderBy: { entropyScore: 'desc' },
      take: 10
    });
    
    // Generate virtual blocks for schedule
    let currentStart = new Date();
    currentStart.setMinutes(Math.ceil(currentStart.getMinutes() / 15) * 15);
    
    const blocks = tasks.map(task => {
      const blockStart = new Date(currentStart);
      const estimatedMs = (task.estimatedMins || 60) * 60 * 1000;
      const blockEnd = new Date(currentStart.getTime() + estimatedMs);
      
      currentStart = new Date(blockEnd.getTime() + 15 * 60000); // 15 min buffer
      
      return {
        id: `block-${task.id}`,
        taskId: task.id,
        title: task.title,
        startTime: blockStart.toISOString(),
        endTime: blockEnd.toISOString(),
      };
    });
    
    return NextResponse.json(blocks);
  } catch (error) {
    console.error('[GET /api/schedule]', error);
    return NextResponse.json({ error: 'Failed to fetch schedule' }, { status: 500 });
  }
}
