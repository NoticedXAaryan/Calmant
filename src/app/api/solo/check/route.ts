import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/solo/check — Check if an owner already exists.
 * Used by middleware to enforce single-owner signup blocking.
 */
export async function GET(req: Request) {
  // Only allow internal middleware calls
  const isMiddleware = req.headers.get("x-middleware-check") === "true";

  try {
    const userCount = await prisma.user.count();

    return NextResponse.json({
      ownerExists: userCount > 0,
      ...(isMiddleware ? {} : { userCount }),
    });
  } catch (err: any) {
    console.error("[API:solo/check] Error:", err);
    return NextResponse.json({ ownerExists: false });
  }
}
