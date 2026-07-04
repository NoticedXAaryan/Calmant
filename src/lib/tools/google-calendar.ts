import { z } from "zod";
import { prisma } from "../prisma";
import { ToolContext } from "./registry";

export const getCalendarEventsSchema = z.object({
  timeMin: z.string().optional().describe("Start of time range (ISO 8601). Defaults to now."),
  timeMax: z.string().optional().describe("End of time range (ISO 8601). Defaults to 7 days from now."),
  maxResults: z.number().int().min(1).max(50).default(10),
});

export type GetCalendarEventsArgs = z.infer<typeof getCalendarEventsSchema>;

async function getAccessToken(userId: string): Promise<string> {
  const conn = await prisma.integrationConnection.findFirst({
    where: { userId, provider: "google_calendar", status: "connected" },
  });
  if (!conn?.accessToken) throw new Error("Google Calendar not connected. Ask user to connect.");
  
  // Check if token is expired and refresh if needed
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

export async function executeGetCalendarEvents(
  args: GetCalendarEventsArgs, context: ToolContext & { userId?: string }
): Promise<string> {
  // If the agent doesn't provide userId in context natively, we'll extract it.
  // We need to inject userId into the ToolContext before calling tools if they need it.
  const userId = (context as any).userId;
  if (!userId) throw new Error("No userId provided in tool context");
  
  const token = await getAccessToken(userId);
  const timeMin = args.timeMin || new Date().toISOString();
  const timeMax = args.timeMax || new Date(Date.now() + 7 * 86400000).toISOString();

  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?` +
    `timeMin=${encodeURIComponent(timeMin)}` +
    `&timeMax=${encodeURIComponent(timeMax)}` +
    `&maxResults=${args.maxResults}` +
    `&singleEvents=true` +
    `&orderBy=startTime`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Calendar API error: ${res.status} ${errorText}`);
  }
  
  const data = await res.json();

  const events = (data.items || []).map((e: any) => {
    const start = e.start?.dateTime || e.start?.date || "Unknown";
    const end = e.end?.dateTime || e.end?.date || "";
    return `- ${e.summary || "Untitled"} | ${start} → ${end} | ${e.location || "No location"}`;
  }).join("\n");

  return `Upcoming calendar events:\n${events || "No events found."}`;
}
