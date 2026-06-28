import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUserId } from "@/lib/auth-utils";

export async function POST() {
  try {
    const userId = await getUserId();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Mark user as onboarded
    await prisma.user.update({
      where: { id: userId },
      data: { onboarded: true },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    // If 'onboarded' field doesn't exist yet, that's fine — the cookie handles it
    console.error("Failed to mark onboarded:", error?.message);
    return NextResponse.json({ success: true, fallback: "cookie-only" });
  }
}
