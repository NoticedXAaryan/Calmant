import { NextResponse } from "next/server";

const SANDBOX_URL = process.env.SANDBOX_URL || "http://localhost:4000";

/**
 * GET /api/sandbox/status — Get active sandbox session info
 */
export async function GET() {
  try {
    const res = await fetch(`${SANDBOX_URL}/sessions/active`, {
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) {
      return NextResponse.json({ active: false, healthy: false });
    }
    const data = await res.json();
    return NextResponse.json({ ...data, healthy: true });
  } catch {
    return NextResponse.json({ active: false, healthy: false });
  }
}

/**
 * POST /api/sandbox/action — Proxy sandbox actions (navigate, screenshot, act)
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { sessionId, action, ...params } = body;

    if (!sessionId || !action) {
      return NextResponse.json(
        { error: "sessionId and action are required" },
        { status: 400 }
      );
    }

    let endpoint: string;
    switch (action) {
      case "navigate":
        endpoint = `${SANDBOX_URL}/session/${sessionId}/navigate`;
        break;
      case "screenshot":
        endpoint = `${SANDBOX_URL}/session/${sessionId}/screenshot`;
        break;
      case "act":
        endpoint = `${SANDBOX_URL}/session/${sessionId}/act`;
        break;
      case "scrape":
        endpoint = `${SANDBOX_URL}/session/${sessionId}/scrape`;
        break;
      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }

    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
      signal: AbortSignal.timeout(30000),
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || "Sandbox action failed" },
      { status: 500 }
    );
  }
}
