import { NextResponse } from 'next/server';
import { initTelegram } from '@/lib/telegram';

export async function GET() {
  const status = await initTelegram();
  return NextResponse.json({
    success: status.configured && status.running,
    message: status.label,
    data: status,
  });
}
