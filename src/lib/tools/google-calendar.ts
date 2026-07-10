import { z } from "zod";
import { ToolExecutionContext } from "./tool-manifest";
import { CalendarService } from "../services/calendar-service";

export const getCalendarEventsSchema = z.object({
  timeMin: z.string().optional().describe("Start of time range (ISO 8601). Defaults to now."),
  timeMax: z.string().optional().describe("End of time range (ISO 8601). Defaults to 7 days from now."),
  maxResults: z.number().int().min(1).max(50).default(10),
});

export const createCalendarEventSchema = z.object({
  summary: z.string().describe("Title of the event"),
  description: z.string().optional(),
  startDateTime: z.string().describe("Start time (ISO 8601)"),
  endDateTime: z.string().describe("End time (ISO 8601)"),
  attendees: z.array(z.string()).optional().describe("List of attendee emails"),
});

export const getFreeBusySchema = z.object({
  timeMin: z.string().describe("Start of time range (ISO 8601)"),
  timeMax: z.string().describe("End of time range (ISO 8601)"),
});

export async function executeGetCalendarEvents(args: z.infer<typeof getCalendarEventsSchema>, context: ToolExecutionContext): Promise<string> {
  const timeMin = args.timeMin || new Date().toISOString();
  const timeMax = args.timeMax || new Date(Date.now() + 7 * 86400000).toISOString();
  
  const data = await CalendarService.getEvents(context.userId, timeMin, timeMax, args.maxResults);
  const events = (data.items || []).map((e: any) => {
    const start = e.start?.dateTime || e.start?.date || "Unknown";
    const end = e.end?.dateTime || e.end?.date || "";
    return `- ${e.summary || "Untitled"} | ${start} → ${end} | ${e.location || "No location"}`;
  }).join("\n");

  return `Upcoming calendar events:\n${events || "No events found."}`;
}

export async function executeCreateCalendarEvent(args: z.infer<typeof createCalendarEventSchema>, context: ToolExecutionContext): Promise<string> {
  const eventDetails = {
    summary: args.summary,
    description: args.description,
    start: { dateTime: args.startDateTime },
    end: { dateTime: args.endDateTime },
    attendees: args.attendees?.map(email => ({ email }))
  };

  const data = await CalendarService.createEvent(context.userId, eventDetails);
  return `Event created: ${data.htmlLink}`;
}

export async function executeGetFreeBusy(args: z.infer<typeof getFreeBusySchema>, context: ToolExecutionContext): Promise<string> {
  const data = await CalendarService.getFreeBusy(context.userId, args.timeMin, args.timeMax);
  const busy = data.calendars?.primary?.busy || [];
  
  if (busy.length === 0) return "You are free during this time.";
  
  const busySlots = busy.map((b: any) => `- ${b.start} to ${b.end}`).join("\n");
  return `Busy slots:\n${busySlots}`;
}
