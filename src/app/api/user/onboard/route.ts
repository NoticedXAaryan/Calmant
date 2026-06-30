import { NextResponse } from "next/server";
import { isAuthError, respondUnauthorized } from "@/lib/api-helpers";
import { getUserId } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";

export async function POST() {
  try {
    const userId = await getUserId();

    await prisma.user.update({
      where: { id: userId },
      data: { onboarded: true },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (isAuthError(error)) return respondUnauthorized();
    console.error("Failed to mark onboarded:", error?.message);
    return NextResponse.json({ success: true, fallback: "cookie-only" });
  }
}
