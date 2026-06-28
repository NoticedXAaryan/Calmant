import { NextResponse } from 'next/server';
import { startWorker } from '@/lib/worker';

let workerStarted = false;

export async function POST() {
  if (!workerStarted) {
    await startWorker();
    workerStarted = true;
  }
  return NextResponse.json({ success: true, message: 'Worker running' });
}
