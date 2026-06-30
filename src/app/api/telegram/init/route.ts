import { NextResponse } from 'next/server';
import { initTelegram } from '@/lib/telegram';
import { getUserId } from '@/lib/auth-utils';

export async function GET() {
  try {
    await getUserId();
    const status = await initTelegram();
    return NextResponse.json({
      success: status.configured && status.running,
      message: status.label,
      data: status,
    });
  } catch (error: any) {
    if (error?.status === 401) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    console.error('[GET /api/telegram/init]', error);
    return NextResponse.json({ success: false, error: 'Failed to initialize Telegram' }, { status: 500 });
  }
}
