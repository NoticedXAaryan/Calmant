import { NextResponse } from 'next/server';
import { startWorker } from '@/lib/worker';
import { getUserId } from '@/lib/auth-utils';

let workerStarted = false;

export async function POST() {
  try {
    await getUserId();
    if (!workerStarted) {
      await startWorker();
      workerStarted = true;
    }
    return NextResponse.json({ success: true, message: 'Worker running' });
  } catch (error: any) {
    if (error?.status === 401) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[POST /api/worker/start]', error);
    return NextResponse.json({ success: false, error: 'Failed to start worker' }, { status: 500 });
  }
}
