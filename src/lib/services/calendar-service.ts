import { prisma } from "../prisma";
import { TelegramService } from "./telegram-service";

export class CalendarService {
  /**
   * Retrieves the access token for the given user's Google Calendar connection.
   * Refreshes the token if it is expired.
   */
  static async getAccessToken(userId: string): Promise<string> {
    const conn = await prisma.integrationConnection.findUnique({
      where: { userId_provider: { userId, provider: "google_calendar" } },
    });

    if (!conn || conn.status !== "connected" || !conn.accessToken) {
      throw new Error("Google Calendar not connected. Ask user to connect.");
    }
    
    if (conn.expiresAt && conn.expiresAt < new Date() && conn.refreshToken) {
      const res = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: process.env.GOOGLE_CLIENT_ID!,
          client_secret: process.env.GOOGLE_CLIENT_SECRET!,
          refresh_token: conn.refreshToken,
          grant_type: "refresh_token",
        }),
      });
      const tokens = await res.json();
      await prisma.integrationConnection.update({
        where: { id: conn.id },
        data: {
          accessToken: tokens.access_token,
          expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
        },
      });
      return tokens.access_token;
    }
    
    return conn.accessToken;
  }

  static async getEvents(userId: string, timeMin: string, timeMax: string, maxResults: number = 10) {
    const token = await this.getAccessToken(userId);
    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?` +
      `timeMin=${encodeURIComponent(timeMin)}` +
      `&timeMax=${encodeURIComponent(timeMax)}` +
      `&maxResults=${maxResults}` +
      `&singleEvents=true` +
      `&orderBy=startTime`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Calendar API error: ${res.status} ${errorText}`);
    }
    return res.json();
  }

  static async createEvent(userId: string, eventDetails: any) {
    const token = await this.getAccessToken(userId);
    const res = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events`, {
      method: "POST",
      headers: { 
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(eventDetails)
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Calendar API error: ${res.status} ${errorText}`);
    }
    return res.json();
  }

  static async getFreeBusy(userId: string, timeMin: string, timeMax: string) {
    const token = await this.getAccessToken(userId);
    const res = await fetch(`https://www.googleapis.com/calendar/v3/freeBusy`, {
      method: "POST",
      headers: { 
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        timeMin,
        timeMax,
        items: [{ id: "primary" }]
      })
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Calendar API error: ${res.status} ${errorText}`);
    }
    return res.json();
  }

  static async scheduleMeetingEndReminders(userId: string) {
    const now = new Date();
    // Look ahead 2 hours
    const timeMax = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    
    try {
      const data = await this.getEvents(userId, now.toISOString(), timeMax.toISOString(), 20);
      const items = data.items || [];
      
      for (const event of items) {
        if (!event.end?.dateTime) continue;
        const endTime = new Date(event.end.dateTime);
        const timeUntilEnd = endTime.getTime() - now.getTime();
        
        // If it's ending between 4 and 6 minutes from now, send a reminder
        if (timeUntilEnd > 4 * 60 * 1000 && timeUntilEnd <= 6 * 60 * 1000) {
          const message = `🔔 **Meeting Ending Soon!**\n\nYour meeting "${event.summary || 'Untitled'}" ends in 5 minutes. Time to wrap up!`;
          await TelegramService.sendMessage(userId, message, { parse_mode: "Markdown" });
        }
      }
    } catch (err) {
      console.error(`Error scheduling meeting end reminders for ${userId}:`, err);
    }
  }
}
