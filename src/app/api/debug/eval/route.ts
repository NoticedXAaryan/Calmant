import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const res = await fetch("http://hermes:8000/eval", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30000),
    });
    
    const text = await res.text();
    let jsonParsed;
    try { jsonParsed = JSON.parse(text); } catch { jsonParsed = text; }
    
    return NextResponse.json({
      status: res.status,
      data: jsonParsed
    });
  } catch (err: any) {
    return NextResponse.json({ error: "Failed to proxy eval", details: err.message }, { status: 500 });
  }
}
