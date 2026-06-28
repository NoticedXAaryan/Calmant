import { NextRequest, NextResponse } from "next/server";
import { getUserId } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";
import { welcomeEmailHtml } from "@/lib/email-templates";
import { sendEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId();
    
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    if (!user.email) {
       return NextResponse.json({ success: false, error: "User has no email" }, { status: 400 });
    }

    // Check if we already sent a welcome email to avoid spamming
    const existing = await prisma.notificationDelivery.findFirst({
      where: { userId, intent: "welcome" }
    });
    
    if (existing) {
      return NextResponse.json({ success: true, message: "Welcome email already sent previously" });
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.BETTER_AUTH_URL || "http://localhost:3000";
    const telegramBotName = process.env.TELEGRAM_BOT_USERNAME || "Calmant_bot";
    
    const { subject, html } = welcomeEmailHtml(user.name || user.email, appUrl, telegramBotName);
    
    const result = await sendEmail(subject, html, user.email);

    await prisma.notificationDelivery.create({
      data: { 
        userId, 
        channel: "email", 
        intent: "welcome", 
        status: result.sent ? "sent" : "failed",
        error: result.reason
      }
    });

    return NextResponse.json({ success: true, sent: result.sent });
  } catch (error: any) {
    console.error("[POST /api/notifications/welcome]", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to send welcome email" },
      { status: 500 }
    );
  }
}
