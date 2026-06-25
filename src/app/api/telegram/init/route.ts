import { NextResponse } from 'next/server';
import { initTelegram } from '@/lib/telegram';

let initialized = false;

export async function GET() {
  if (!initialized) {
    await initTelegram();
    initialized = true;
  }
  return NextResponse.json({ success: true, message: "Telegram bot initialized" });
}
