import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/auth-utils";
import { isAuthError, respondUnauthorized } from "@/lib/api-helpers";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";

function tooManyRequests(retryAfter: number) {
  return NextResponse.json(
    { error: "You're doing that a bit too fast. Please wait a moment and try again.", retryAfter },
    { status: 429, headers: { "Retry-After": String(retryAfter) } }
  );
}

export async function GET() {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const memories = await prisma.agentMemory.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(memories);
  } catch (error) {
    console.error("Failed to fetch memories:", error);
    if (isAuthError(error)) return respondUnauthorized();
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { fact, category } = body;

    if (!fact || !category) {
      return NextResponse.json({ error: "fact and category are required" }, { status: 400 });
    }

    const rl = await rateLimit({ key: `memory:${userId}`, ...RATE_LIMITS.agentMemory });
    if (!rl.success) return tooManyRequests(rl.retryAfter);

    const validCategories = [
      "preference", "commitment", "pattern", "method",
      "deadline", "relationship", "interaction", "alert",
    ];
    if (!validCategories.includes(category)) {
      return NextResponse.json({ error: `Invalid category. Must be one of: ${validCategories.join(", ")}` }, { status: 400 });
    }

    const memory = await prisma.agentMemory.create({
      data: { userId, fact, category },
    });

    return NextResponse.json({ success: true, memory });
  } catch (error) {
    console.error("Failed to store memory:", error);
    if (isAuthError(error)) return respondUnauthorized();
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Memory ID required" }, { status: 400 });
    }

    const rl = await rateLimit({ key: `memory:${userId}`, ...RATE_LIMITS.agentMemory });
    if (!rl.success) return tooManyRequests(rl.retryAfter);

    // Verify ownership
    const memory = await prisma.agentMemory.findUnique({
      where: { id },
    });

    if (!memory || memory.userId !== userId) {
      return NextResponse.json({ error: "Not found or unauthorized" }, { status: 404 });
    }

    await prisma.agentMemory.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete memory:", error);
    if (isAuthError(error)) return respondUnauthorized();
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
