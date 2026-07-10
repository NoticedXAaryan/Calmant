import { describe, it, expect, vi, beforeEach } from "vitest";
import { executeGetCalendarEvents, executeCreateCalendarEvent, executeGetFreeBusy } from "../../src/lib/tools/google-calendar";
import { CalendarService } from "../../src/lib/services/calendar-service";

vi.mock("../../src/lib/services/calendar-service", () => ({
  CalendarService: {
    getEvents: vi.fn(),
    createEvent: vi.fn(),
    getFreeBusy: vi.fn(),
  }
}));

describe("Calendar Tools", () => {
  const mockContext = { userId: "user-123", runId: "run", toolCallId: "tool", cwd: "/", env: {} };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should get events", async () => {
    vi.mocked(CalendarService.getEvents).mockResolvedValue({
      items: [
        { summary: "Test Event", start: { dateTime: "2026-07-10T10:00:00Z" }, end: { dateTime: "2026-07-10T11:00:00Z" } }
      ]
    });
    
    const res = await executeGetCalendarEvents({ maxResults: 5 }, mockContext);
    expect(res).toContain("Test Event");
    expect(CalendarService.getEvents).toHaveBeenCalledWith("user-123", expect.any(String), expect.any(String), 5);
  });

  it("should create event", async () => {
    vi.mocked(CalendarService.createEvent).mockResolvedValue({ htmlLink: "http://calendar.google.com/event" });
    
    const res = await executeCreateCalendarEvent({
      summary: "New Event",
      startDateTime: "2026-07-10T10:00:00Z",
      endDateTime: "2026-07-10T11:00:00Z"
    }, mockContext);

    expect(res).toContain("Event created: http://calendar.google.com/event");
    expect(CalendarService.createEvent).toHaveBeenCalled();
  });

  it("should get freebusy", async () => {
    vi.mocked(CalendarService.getFreeBusy).mockResolvedValue({
      calendars: { primary: { busy: [{ start: "2026-07-10T10:00:00Z", end: "2026-07-10T11:00:00Z" }] } }
    });
    
    const res = await executeGetFreeBusy({ timeMin: "2026-07-10T00:00:00Z", timeMax: "2026-07-11T00:00:00Z" }, mockContext);
    expect(res).toContain("Busy slots:");
  });
});
