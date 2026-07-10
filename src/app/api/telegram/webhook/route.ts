import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { TelegramUpdateRouter } from "@/lib/telegram/update-router";

export async function POST(req: NextRequest) {
  try {
    // Optional: Secret token verification
    const secretToken = req.headers.get("x-telegram-bot-api-secret-token");
    const configuredToken = process.env.TELEGRAM_WEBHOOK_SECRET;
    
    if (configuredToken && secretToken !== configuredToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const update = await req.json();

    if (!update || !update.update_id) {
      return NextResponse.json({ error: "Invalid update payload" }, { status: 400 });
    }

    const externalId = update.update_id.toString();

    // 1. Deduplication Check
    const existingMessage = await prisma.inboundMessage.findUnique({
      where: {
        channel_externalId: {
          channel: "telegram",
          externalId
        }
      }
    });

    if (existingMessage) {
      console.log(`[Telegram Webhook] Skipping duplicate update ${externalId}`);
      return NextResponse.json({ success: true, duplicate: true });
    }

    // 2. Persist InboundMessage
    const inboundMessage = await prisma.inboundMessage.create({
      data: {
        channel: "telegram",
        externalId,
        payload: update,
        status: "received"
      }
    });

    // 3. Process Update (non-blocking if we want to respond 200 immediately, 
    // but vercel serverless functions can close early if we don't await)
    await TelegramUpdateRouter.routeUpdate(update);

    await prisma.inboundMessage.update({
      where: { id: inboundMessage.id },
      data: { status: "processed", processedAt: new Date() }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Telegram Webhook] Error processing update:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
