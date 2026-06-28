import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/auth-utils";

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
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
