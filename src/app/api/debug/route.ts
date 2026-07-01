import { NextResponse } from "next/server";

export async function GET() {
  try {
    const res = await fetch("http://hermes:8000/debug", { signal: AbortSignal.timeout(10000) });
    const text = await res.json();
    return NextResponse.json({ debug: text });
  } catch (err: any) {
    return NextResponse.json({ error: err.message });
  }
}
