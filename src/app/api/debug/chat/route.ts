import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const res = await fetch("http://hermes:8000/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(90000), // 90 second timeout
    });
    
    // We want the exact text response, even if it's 500
    const text = await res.text();
    let jsonParsed;
    try {
      jsonParsed = JSON.parse(text);
    } catch {
      jsonParsed = text;
    }
    
    return NextResponse.json({
      status: res.status,
      headers: Object.fromEntries(res.headers.entries()),
      data: jsonParsed
    });
  } catch (err: any) {
    return NextResponse.json({ error: "Failed to proxy", details: err.message }, { status: 500 });
  }
}
