import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { Webhook } from "svix";

const RESEND_WEBHOOK_SECRET = process.env.RESEND_WEBHOOK_SECRET || "";

export async function POST(req: Request) {
  try {
    const bodyText = await req.text();
    const svix_id = req.headers.get("svix-id");
    const svix_timestamp = req.headers.get("svix-timestamp");
    const svix_signature = req.headers.get("svix-signature");

    if (!svix_id || !svix_timestamp || !svix_signature) {
      return NextResponse.json({ success: false, error: "Missing svix headers" }, { status: 400 });
    }

    if (!RESEND_WEBHOOK_SECRET) {
      console.warn("RESEND_WEBHOOK_SECRET is not set, skipping signature verification.");
    } else {
      const wh = new Webhook(RESEND_WEBHOOK_SECRET);
      try {
        wh.verify(bodyText, {
          "svix-id": svix_id,
          "svix-timestamp": svix_timestamp,
          "svix-signature": svix_signature,
        });
      } catch (err: any) {
        return NextResponse.json({ success: false, error: "Invalid signature" }, { status: 401 });
      }
    }

    const payload = JSON.parse(bodyText);
    const { type, data } = payload;
    
    if (!type || !data || !data.email_id) {
      return NextResponse.json({ success: false, error: "Invalid payload" }, { status: 400 });
    }

    const providerId = data.email_id;
    let status = "sent";

    switch (type) {
      case "email.delivered":
        status = "delivered";
        break;
      case "email.bounced":
        status = "bounced";
        break;
      case "email.complained":
        status = "failed";
        break;
      case "email.opened":
        status = "opened";
        break;
      case "email.clicked":
        status = "clicked";
        break;
      default:
        // Keep current status if it's something else
        return NextResponse.json({ success: true, message: "Ignored event type" });
    }

    const deliveries = await prisma.notificationDelivery.findMany({
      where: { providerId },
    });

    for (const delivery of deliveries) {
      const updateData: Prisma.NotificationDeliveryUpdateInput = { status };
      if (status === "delivered") {
        updateData.deliveredAt = new Date();
      }

      await prisma.notificationDelivery.update({
        where: { id: delivery.id },
        data: updateData,
      });

      // If bounced or complained, mark integration connection as degraded
      if (status === "bounced" || status === "failed") {
        const existingConnection = await prisma.integrationConnection.findFirst({
          where: { userId: delivery.userId, provider: "email" },
        });

        if (existingConnection) {
          await prisma.integrationConnection.update({
            where: { id: existingConnection.id },
            data: {
              status: "degraded",
              lastFailureAt: new Date(),
              lastError: `Email ${status} to recipient`,
            },
          });
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Resend Webhook Error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
