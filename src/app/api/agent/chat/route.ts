import { NextRequest, NextResponse } from 'next/server';
import { getUserId } from '@/lib/auth-utils';
import { agentReply } from '@/lib/agent';

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId();
    const { message } = await request.json();

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // Call Mastra Agent via our robust wrapper
    const replyText = await agentReply(message, userId);

    return NextResponse.json({
      reply: replyText,
    });
  } catch (error) {
    console.error('[POST /api/agent/chat]', error);
    return NextResponse.json({ error: 'Agent failed to respond' }, { status: 500 });
  }
}
