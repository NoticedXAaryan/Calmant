import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";

export async function POST() {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    // Generate a simple 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    // Store in Verification table
    // identifier = telegram_connect_{code}
    // value = userId
    await prisma.verification.create({
      data: {
        identifier: `telegram_connect_${code}`,
        value: sessionUser.id,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 mins expiry
      },
    });

    return NextResponse.json({
      success: true,
      data: { code },
    });
  } catch (error) {
    console.error("Telegram connect code error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
