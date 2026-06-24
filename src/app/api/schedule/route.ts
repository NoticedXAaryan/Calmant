// Schedule API — used by schedule page to fetch blocks
import { NextRequest } from 'next/server';
import { store } from '@/lib/store';
import { respond, respondError } from '@/lib/api-helpers';

const DEMO_USER_ID = 'demo-user';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const start = searchParams.get('start') || undefined;
    const end = searchParams.get('end') || undefined;
    const blocks = await store.getScheduleBlocks(DEMO_USER_ID, start, end);
    return respond(blocks);
  } catch (error) {
    console.error('[GET /api/schedule]', error);
    return respondError('Failed to fetch schedule');
  }
}
