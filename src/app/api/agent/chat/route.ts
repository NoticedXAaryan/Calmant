import { NextRequest, NextResponse } from 'next/server';
import { getUserId } from '@/lib/auth-utils';
import { rateLimit, rateLimitKeyFromRequest, RATE_LIMITS } from '@/lib/rate-limit';
import { agentReplyStream } from '@/lib/agent';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId();
    const { message, timeZone } = await request.json();

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

    const encoder = new TextEncoder();
    
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // agentReplyStream yields chunks of the response or status updates
          for await (const chunk of agentReplyStream(message, userId, timeZone)) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
          }
        } catch (err: any) {
          console.error('[POST /api/agent/chat streaming]', err);
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: 'Agent failed to respond' })}\n\n`));
        } finally {
          controller.close();
        }
      }
    });

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
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
