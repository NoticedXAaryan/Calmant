import { NextRequest, NextResponse } from 'next/server';
import { getUserId } from '@/lib/auth-utils';
import { rateLimit, rateLimitKeyFromRequest, RATE_LIMITS } from '@/lib/rate-limit';
import { agentReply } from '@/lib/agent';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId();
    const { message } = await request.json();

    if (!message || typeof message !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Message is required', timestamp: new Date().toISOString() },
        { status: 400 }
      );
    }

    // Rate limit: protects against cost exhaustion / DDoS (audit: "Cost Exhaustion & DDoS Risk").
    const { success, retryAfter } = await rateLimit({
      key: rateLimitKeyFromRequest(request, userId),
      ...RATE_LIMITS.agentChat,
    });
    if (!success) {
      return NextResponse.json(
        {
          success: false,
          error: "You're sending messages a bit too fast. Please wait a moment and try again.",
          retryAfter,
          timestamp: new Date().toISOString(),
        },
        { status: 429, headers: { 'Retry-After': String(retryAfter) } }
      );
    }

    const replyText = await agentReply(message, userId);

    return NextResponse.json({
      success: true,
      data: { content: replyText }
    });
  } catch (error) {
    console.error('[POST /api/agent/chat]', error);
    const status = (error as any)?.status === 401 ? 401 : 500;
    return NextResponse.json(
      {
        success: false,
        error: status === 401 ? 'Unauthorized — please sign in' : 'Agent failed to respond',
        timestamp: new Date().toISOString(),
      },
      { status }
    );
  }
}
