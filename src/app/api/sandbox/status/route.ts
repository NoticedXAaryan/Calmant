import { NextResponse } from "next/server";

const SANDBOX_URL = process.env.SANDBOX_URL || "http://localhost:4000";

/**
 * GET /api/sandbox/status — Check sandbox health and active session
 */
export async function GET() {
  try {
    // Check sandbox health
    const healthRes = await fetch(`${SANDBOX_URL}/health`, {
      signal: AbortSignal.timeout(3000),
    });

    if (!healthRes.ok) {
      return NextResponse.json({ active: false, healthy: false, sessionId: null });
    }

    const health = await healthRes.json();

    // Check for active sessions
    const activeRes = await fetch(`${SANDBOX_URL}/sessions/active`, {
      signal: AbortSignal.timeout(3000),
    });

    if (!activeRes.ok) {
      return NextResponse.json({ active: false, healthy: true, sessionId: null });
    }

    const active = await activeRes.json();

    return NextResponse.json({
      healthy: true,
      active: active.active || false,
      sessionId: active.sessionId || null,
      activeSessions: health.activeSessions || 0,
      maxSessions: health.maxSessions || 5,
      uptime: health.uptime,
    });
  } catch {
    return NextResponse.json({ active: false, healthy: false, sessionId: null });
  }
}
