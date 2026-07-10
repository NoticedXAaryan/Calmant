import { z } from "zod";
import { ToolExecutionContext } from "./tool-manifest";
import { BrowserSessionService } from "../services/browser-session-service";

export const browserNavigateSchema = z.object({
  url: z.string().url().describe("The URL to navigate to"),
  waitFor: z.enum(["load", "domcontentloaded", "networkidle"]).default("load"),
});

export const browserActionSchema = z.object({
  action: z.enum(["click", "type", "scroll", "extract", "screenshot", "submit"]),
  selector: z.string().optional().describe("CSS selector for the element"),
  text: z.string().optional().describe("Text to type"),
  direction: z.enum(["up", "down", "left", "right"]).optional(),
});

export type BrowserNavigateArgs = z.infer<typeof browserNavigateSchema>;
export type BrowserActionArgs = z.infer<typeof browserActionSchema>;

// Track run IDs to session IDs so we can reuse the session within a run
const runSessions = new Map<string, string>();

async function ensureSession(context: ToolExecutionContext): Promise<string> {
  let sessionId = runSessions.get(context.runId);

  if (sessionId) {
    const session = BrowserSessionService.getActiveSession(sessionId);
    if (session) return sessionId;
  }

  // Create a new session
  sessionId = await BrowserSessionService.startSession(context.userId, context.runId);
  runSessions.set(context.runId, sessionId);
  return sessionId;
}

export async function executeBrowserNavigate(
  args: BrowserNavigateArgs, context: ToolExecutionContext
): Promise<string> {
  const sessionId = await ensureSession(context);
  const session = BrowserSessionService.getActiveSession(sessionId);
  if (!session) throw new Error("Session vanished");

  await session.page.goto(args.url, { waitUntil: args.waitFor });
  const title = await session.page.title();
  const url = session.page.url();
  
  await BrowserSessionService.updateSessionUrl(sessionId, url, title);

  return `Navigated to: ${url}\nTitle: ${title}`;
}

export async function executeBrowserAction(
  args: BrowserActionArgs, context: ToolExecutionContext
): Promise<string> {
  const sessionId = await ensureSession(context);
  const session = BrowserSessionService.getActiveSession(sessionId);
  if (!session) throw new Error("Session vanished");

  const { page } = session;

  if (args.action === "extract") {
    const title = await page.title();
    const url = page.url();
    // Simplified extraction
    const text = await page.evaluate(() => document.body.innerText);
    return `Extracted from ${url}:\n- Title: ${title}\n- Text: ${text.slice(0, 3000)}`;
  }

  if (args.action === "screenshot") {
    const artifactId = await BrowserSessionService.captureScreenshot(
      sessionId,
      context.userId,
      context.runId,
      context.toolCallId
    );
    return `Screenshot saved as Artifact ID: ${artifactId}`;
  }

  if (args.action === "click" || args.action === "submit") {
    if (!args.selector) throw new Error("Selector is required for click/submit");
    await page.click(args.selector);
  } else if (args.action === "type") {
    if (!args.selector || !args.text) throw new Error("Selector and text are required for type");
    await page.fill(args.selector, args.text);
  } else if (args.action === "scroll") {
    await page.evaluate((direction) => {
      if (direction === "down") window.scrollBy(0, window.innerHeight);
      if (direction === "up") window.scrollBy(0, -window.innerHeight);
    }, args.direction);
  }

  const newUrl = page.url();
  const newTitle = await page.title();
  await BrowserSessionService.updateSessionUrl(sessionId, newUrl, newTitle);

  return `Action "${args.action}" completed. Current URL: ${newUrl}, Title: ${newTitle}`;
}
