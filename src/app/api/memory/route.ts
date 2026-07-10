import { NextResponse } from "next/server";
import { getUserId } from "@/lib/auth-utils";
import { isAuthError, respondUnauthorized } from "@/lib/api-helpers";
import { MemoryRecordService } from "@/lib/services/memory-record-service";

export async function GET() {
  try {
    const userId = await getUserId();
    const memories = await MemoryRecordService.list(userId);

    return NextResponse.json({
      success: true,
      data: memories,
    });
  } catch (error) {
    console.error("[GET /api/memory]", error);
    if (isAuthError(error)) return respondUnauthorized();
    return NextResponse.json(
      { success: false, error: "Failed to fetch memories" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const userId = await getUserId();
    const { type, content, confidence, projectCellId, sourceRunId } = await request.json();

    if (!type || !content) {
      return NextResponse.json(
        { success: false, error: "Type and content are required" },
        { status: 400 }
      );
    }

    const memory = await MemoryRecordService.create({
      userId,
      type,
      content,
      confidence,
      projectCellId,
      sourceRunId,
    });

    return NextResponse.json({
      success: true,
      data: memory,
    });
  } catch (error) {
    console.error("[POST /api/memory]", error);
    if (isAuthError(error)) return respondUnauthorized();
    return NextResponse.json(
      { success: false, error: "Failed to create memory" },
      { status: 500 }
    );
  }
}
