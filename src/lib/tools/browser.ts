import { z } from "zod";
import { ToolContext } from "./registry";

const SANDBOX_URL = process.env.SANDBOX_URL || "http://localhost:4000";

export const browserNavigateSchema = z.object({
  url: z.string().url().describe("The URL to navigate to"),
  waitFor: z.enum(["load", "domcontentloaded", "networkidle"]).default("load"),
});

export const browserActionSchema = z.object({
  action: z.enum(["click", "type", "scroll", "extract", "screenshot"]),
  selector: z.string().optional().describe("CSS selector for the element"),
  text: z.string().optional().describe("Text to type"),
  direction: z.enum(["up", "down", "left", "right"]).optional(),
});

export type BrowserNavigateArgs = z.infer<typeof browserNavigateSchema>;
export type BrowserActionArgs = z.infer<typeof browserActionSchema>;

// Session management — one active session at a time
let activeSessionId: string | null = null;

async function ensureSession(): Promise<string> {
  if (activeSessionId) {
    // Verify session is still alive
    try {
      const res = await fetch(`${SANDBOX_URL}/sessions/active`);
      const data = await res.json();
      if (data.active && data.sessionId === activeSessionId) {
        return activeSessionId;
      }
    } catch { /* session died, create new one */ }
  }

  // Create new session
  const res = await fetch(`${SANDBOX_URL}/session`, { method: "POST" });
  if (!res.ok) throw new Error(`Failed to create browser session: ${res.status}`);
  const data = await res.json();
  activeSessionId = data.sessionId;
  return activeSessionId!;
}

export async function executeBrowserNavigate(
  args: BrowserNavigateArgs, context: ToolContext
): Promise<string> {
  const sessionId = await ensureSession();

  const res = await fetch(`${SANDBOX_URL}/session/${sessionId}/navigate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url: args.url }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error(`Navigation failed: ${err.error}`);
  }

  const data = await res.json();
  // Return structured info for the LLM
  return `Navigated to: ${data.url}\nTitle: ${data.title}\nExtracted text (${data.textLength} chars):\n${data.text?.slice(0, 3000) || "No text extracted"}`;
}

export async function executeBrowserAction(
  args: BrowserActionArgs, context: ToolContext
): Promise<string> {
  const sessionId = await ensureSession();

  if (args.action === "extract") {
    const res = await fetch(`${SANDBOX_URL}/session/${sessionId}/extract`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    if (!res.ok) throw new Error(`Extraction failed: ${res.status}`);
    const data = await res.json();
    return `Extracted from ${data.url}:\n- Title: ${data.title}\n- Forms: ${data.forms?.length || 0}\n- Links: ${data.links?.length || 0}\n- Text: ${data.text?.slice(0, 3000) || "none"}`;
  }

  if (args.action === "screenshot") {
    const res = await fetch(`${SANDBOX_URL}/session/${sessionId}/screenshot`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    if (!res.ok) throw new Error(`Screenshot failed: ${res.status}`);
    const data = await res.json();
    return `Screenshot saved: ${data.filename}`;
  }

  // click, type, scroll
  const res = await fetch(`${SANDBOX_URL}/session/${sessionId}/act`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: args.action,
      selector: args.selector,
      value: args.text || args.direction,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
    throw new Error(`Action failed: ${err.error}`);
  }

  const data = await res.json();
  return `Action "${args.action}" completed. Current URL: ${data.url}, Title: ${data.title}`;
}
