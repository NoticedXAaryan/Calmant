import { NextRequest, NextResponse } from 'next/server';
import { getUserId } from '@/lib/auth-utils';
import { agentReply } from '@/lib/agent';

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId();
    const { message } = await request.json();

    if (!message) {
      return NextResponse.json(
        { success: false, error: 'Message is required', timestamp: new Date().toISOString() },
        { status: 400 }
      );
    }

    const replyText = await agentReply(message, userId);

    return NextResponse.json({
      success: true,
      data: { content: replyText },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[POST /api/agent/chat]', error);
    return NextResponse.json(
      { success: false, error: 'Agent failed to respond', timestamp: new Date().toISOString() },
      { status: 500 }
    );
  }
}
