import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";

export async function POST() {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const subject = `Life Saver email test - ${new Date().toISOString()}`;
    const html = `<p>This is a test email to verify delivery from Last-Minute Life Saver.</p>`;

    const { dispatchDurableNotification } = await import("@/lib/notifications");
    const result = await dispatchDurableNotification(
      sessionUser.id,
      null,
      "test",
      "Test Notification",
      "<p>This is a test notification verifying your connection.</p>",
      sessionUser.email!
    );

    if (result.sent) {

      const existingConnection = await prisma.integrationConnection.findFirst({
        where: { userId: sessionUser.id, provider: "email" },
      });

      if (existingConnection) {
        await prisma.integrationConnection.update({
          where: { id: existingConnection.id },
          data: {
            status: "live_verified",
            lastSuccessAt: new Date(),
            lastCheckedAt: new Date(),
            lastError: null,
          },
        });
      } else {
        await prisma.integrationConnection.create({
          data: {
            userId: sessionUser.id,
            provider: "email",
            status: "live_verified",
            lastSuccessAt: new Date(),
            lastCheckedAt: new Date(),
          },
        });
      }

      return NextResponse.json({
        success: true,
        data: { sent: true, id: result.emailId },
      });
    } else {
      const existingConnection = await prisma.integrationConnection.findFirst({
        where: { userId: sessionUser.id, provider: "email" },
      });

      if (existingConnection) {
        await prisma.integrationConnection.update({
          where: { id: existingConnection.id },
          data: {
            status: "degraded",
            lastFailureAt: new Date(),
            lastCheckedAt: new Date(),
            lastError: result.reason || "Unknown failure",
          },
        });
      }

      return NextResponse.json({
        success: false,
        error: result.reason || "Failed to send email",
      }, { status: 500 });
    }
  } catch (error) {
    console.error("Test email error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
