import { NextResponse } from "next/server";
import { getUserId } from "@/lib/auth-utils";
import { isAuthError, respondUnauthorized } from "@/lib/api-helpers";
import { CommandCenterService } from "@/lib/services/command-center-service";

export async function GET() {
  try {
    const userId = await getUserId();
    const todayView = await CommandCenterService.getToday(userId);

    return NextResponse.json({
      success: true,
      data: todayView,
    });
  } catch (error) {
    console.error("[GET /api/command-center/today]", error);
    if (isAuthError(error)) return respondUnauthorized();
    return NextResponse.json(
      { success: false, error: "Failed to fetch today view" },
      { status: 500 }
    );
  }
}
