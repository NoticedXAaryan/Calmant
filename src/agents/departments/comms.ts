// Comms Department — Reach the user through the right channel at the right time.
// Owns: send_telegram, send_email, push notification, schedule reminders
// Personality: Polished, warm, proactive.

import { Agent } from "@mastra/core/agent";
import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { getModel } from "../model-router";
import { requireUserId, withAudit } from "./capture";

// --- Tools ---

export const sendTelegramTool = createTool({
  id: "send_telegram",
  description: "Send a message to the user via Telegram.",
  inputSchema: z.object({
    message: z.string().describe("Message to send"),
  }),
  execute: withAudit("send_telegram", async (data, ctx) => {
    const userId = requireUserId(ctx);
    try {
      const { sendTelegramMessage } = await import("../../lib/telegram");
      const sent = await sendTelegramMessage(userId, data.message);

      if (sent) {
        await prisma.notificationDelivery.create({
          data: {
            userId,
            channel: "telegram",
            intent: "agent_message",
            status: "sent",
            sentAt: new Date(),
          },
        });
      }
      return { sent, channel: "telegram" };
    } catch (error: any) {
      return { sent: false, error: error?.message || "Telegram unavailable" };
    }
  }),
});

export const sendEmailTool = createTool({
  id: "send_email",
  description: "Send an email to the user.",
  inputSchema: z.object({
    subject: z.string(),
    body: z.string().describe("Email body (plain text or HTML)"),
  }),
  execute: withAudit("send_email", async (data, ctx) => {
    const userId = requireUserId(ctx);
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });

    if (!user.email) return { sent: false, error: "No email on file" };

    try {
      const { sendEmail } = await import("../../lib/email");
      const result = await sendEmail(data.subject, data.body, user.email);

      await prisma.notificationDelivery.create({
        data: {
          userId,
          channel: "email",
          intent: "agent_message",
          status: result.sent ? "sent" : "failed",
          error: result.reason,
          sentAt: result.sent ? new Date() : null,
          providerId: result.id,
        },
      });

      return { sent: result.sent, channel: "email" };
    } catch (error: any) {
      return { sent: false, error: error?.message || "Email unavailable" };
    }
  }),
});

export const scheduleReminderTool = createTool({
  id: "schedule_reminder",
  description:
    "Schedule a future reminder for the user. The reminder will be sent via Telegram or email at the specified time.",
  inputSchema: z.object({
    message: z.string().describe("Reminder message"),
    sendAt: z.string().describe("ISO datetime for when to send"),
    channel: z.enum(["telegram", "email"]).optional().describe("Defaults to telegram"),
  }),
  execute: withAudit("schedule_reminder", async (data, ctx) => {
    const userId = requireUserId(ctx);
    const { enqueueJob } = await import("../../lib/queue");

    await enqueueJob(
      "scheduled-reminder",
      {
        userId,
        message: data.message,
        channel: data.channel || "telegram",
      },
      new Date(data.sendAt)
    );

    return {
      scheduled: true,
      message: data.message,
      sendAt: data.sendAt,
      channel: data.channel || "telegram",
    };
  }),
});

// --- Agent ---

export const commsAgent = new Agent({
  id: "commsAgent",
  name: "Comms Department",
  instructions: `You are the Comms Department of Calmant — a personal AI company.

Your job: Reach the user through the right channel at the right time. You handle all outbound communication.

Your personality:
- Polished and warm. "Just a heads up — your deadline is in 3 hours."
- You know the right tone for each situation — casual for reminders, urgent for critical alerts.
- You are proactive about scheduling follow-ups.

Rules:
- Prefer Telegram for most messages (it's instant and personal).
- Use email for formal or detailed content (summaries, reports, long-form).
- Use schedule_reminder for future notifications — never tell the user to set their own alarm.
- When the CEO asks you to notify the user, choose the best channel based on urgency:
  - Critical (overdue, imminent deadline): Telegram immediately.
  - Normal (status update, confirmation): Telegram.
  - Formal (daily briefing, report): Email.
- Keep messages concise. No walls of text. Use emoji sparingly but effectively (✅ 📅 ⏰ 🔴).`,
  model: getModel("fast"),
  tools: {
    send_telegram: sendTelegramTool,
    send_email: sendEmailTool,
    schedule_reminder: scheduleReminderTool,
  },
});
