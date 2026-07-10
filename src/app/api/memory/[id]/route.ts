import { NextResponse } from "next/server";
import { getUserId } from "@/lib/auth-utils";
import { isAuthError, respondUnauthorized } from "@/lib/api-helpers";
import { MemoryRecordService } from "@/lib/services/memory-record-service";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await getUserId();
    const { action, content } = await request.json();

    // Verify ownership
    const memory = await prisma.memoryRecord.findUnique({
      where: { id: params.id },
    });

    if (!memory || memory.userId !== userId) {
      return NextResponse.json(
        { success: false, error: "Memory not found or unauthorized" },
        { status: 404 }
      );
    }

    let result;
    if (action === "trust") {
      result = await MemoryRecordService.trust(params.id);
    } else if (action === "reject") {
      result = await MemoryRecordService.reject(params.id);
    } else if (action === "correct") {
      if (!content) {
        return NextResponse.json(
          { success: false, error: "Content is required for correction" },
          { status: 400 }
        );
      }
      result = await MemoryRecordService.correct(params.id, content);
    } else {
      return NextResponse.json(
        { success: false, error: "Invalid action" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("[PATCH /api/memory/[id]]", error);
    if (isAuthError(error)) return respondUnauthorized();
    return NextResponse.json(
      { success: false, error: "Failed to update memory" },
      { status: 500 }
    );
  }
}
