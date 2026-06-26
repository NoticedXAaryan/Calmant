import { google } from "googleapis";
import { prisma } from "@/lib/prisma";
import type { Task } from "@prisma/client";

/**
 * Creates an authenticated Google Calendar client for the specified user.
 * Automatically handles token refresh and persists updated tokens to the database.
 */
export async function getCalendarClient(userId: string) {
  const account = await prisma.account.findFirst({
    where: { userId, providerId: "google" },
  });

  if (!account || !account.accessToken) {
    throw new Error("User Google account not connected or missing access token");
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );

  oauth2Client.setCredentials({
    access_token: account.accessToken,
    refresh_token: account.refreshToken,
    expiry_date: account.accessTokenExpiresAt?.getTime(),
  });

  // Automatically persist refreshed tokens
  oauth2Client.on("tokens", async (tokens) => {
    const updateData: any = {};
    if (tokens.access_token) updateData.accessToken = tokens.access_token;
    if (tokens.refresh_token) updateData.refreshToken = tokens.refresh_token;
    if (tokens.expiry_date) updateData.accessTokenExpiresAt = new Date(tokens.expiry_date);

    await prisma.account.update({
      where: { id: account.id },
      data: updateData,
    });
  });

  return google.calendar({ version: "v3", auth: oauth2Client });
}

export async function getUpcomingEvents(userId: string, maxResults = 10) {
  const calendar = await getCalendarClient(userId);

  const res = await calendar.events.list({
    calendarId: "primary",
    timeMin: new Date().toISOString(),
    maxResults,
    singleEvents: true,
    orderBy: "startTime",
  });

  return res.data.items || [];
}

export async function scheduleTaskOnCalendar(userId: string, task: Task) {
  const calendar = await getCalendarClient(userId);

  const estimatedMins = task.estimatedMins || 30; // Default to 30 mins
  
  // Create an event centered around the deadline, or right now if it's overdue
  const now = new Date();
  const startTime = task.deadline > now ? new Date(task.deadline.getTime() - estimatedMins * 60000) : now;
  const endTime = new Date(startTime.getTime() + estimatedMins * 60000);

  const event = {
    summary: `[Task] ${task.title}`,
    description: task.description || "Scheduled by Vibe2ship Agent",
    start: {
      dateTime: startTime.toISOString(),
    },
    end: {
      dateTime: endTime.toISOString(),
    },
  };

  if (task.calEventId) {
    // Update existing event
    try {
      const res = await calendar.events.update({
        calendarId: "primary",
        eventId: task.calEventId,
        requestBody: event,
      });
      return { success: true, eventId: res.data.id };
    } catch (err: any) {
      if (err.code === 404) {
        // Event was deleted externally, create a new one
        const res = await calendar.events.insert({
          calendarId: "primary",
          requestBody: event,
        });
        await prisma.task.update({
          where: { id: task.id },
          data: { calEventId: res.data.id },
        });
        return { success: true, eventId: res.data.id };
      }
      throw err;
    }
  } else {
    // Insert new event
    const res = await calendar.events.insert({
      calendarId: "primary",
      requestBody: event,
    });
    
    await prisma.task.update({
      where: { id: task.id },
      data: { calEventId: res.data.id },
    });

    return { success: true, eventId: res.data.id };
  }
}

export async function removeTaskFromCalendar(userId: string, task: Task) {
  if (!task.calEventId) return { success: true };

  const calendar = await getCalendarClient(userId);

  try {
    await calendar.events.delete({
      calendarId: "primary",
      eventId: task.calEventId,
    });
    
    await prisma.task.update({
      where: { id: task.id },
      data: { calEventId: null },
    });
    
    return { success: true };
  } catch (err: any) {
    if (err.code === 404 || err.code === 410) {
      // Already deleted or gone
      await prisma.task.update({
        where: { id: task.id },
        data: { calEventId: null },
      });
      return { success: true };
    }
    throw err;
  }
}
