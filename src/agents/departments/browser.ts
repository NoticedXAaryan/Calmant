// Browser Department — Autonomous web navigation, form filling, screenshots.
// Connects to the Browser Sandbox container via HTTP API.
// Personality: The field operative. "On it. Navigating now."

import { Agent } from "@mastra/core/agent";
import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { prisma } from "../../lib/prisma";
import { getModel } from "../model-router";
import { requireUserId, withAudit } from "./capture";

// --- Sandbox client ---

const SANDBOX_URL = process.env.SANDBOX_URL || "http://localhost:4000";
const SANDBOX_TIMEOUT = 30_000;

async function sandboxFetch(path: string, body?: any): Promise<any> {
  try {
    const res = await fetch(`${SANDBOX_URL}${path}`, {
      method: body ? "POST" : "GET",
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(SANDBOX_TIMEOUT),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
      return { error: err.error || `Sandbox returned ${res.status}` };
    }
    return await res.json();
  } catch (error: any) {
    if (error.name === "TimeoutError" || error.name === "AbortError") {
      return { error: "Browser sandbox timed out. The page may be too slow to load." };
    }
    return { error: `Browser sandbox unreachable: ${error.message}. Is the sandbox container running?` };
  }
}

async function sandboxDelete(path: string): Promise<any> {
  try {
    const res = await fetch(`${SANDBOX_URL}${path}`, { method: "DELETE" });
    return await res.json();
  } catch {
    return { error: "Failed to close sandbox session" };
  }
}

// --- Tools ---

export const createBrowserSessionTool = createTool({
  id: "create_browser_session",
  description: "Create a new isolated browser session. Must be called before any other browser actions. Returns a sessionId.",
  inputSchema: z.object({}),
  execute: withAudit("create_browser_session", async (_data) => {
    const result = await sandboxFetch("/session", {});
    if (result.error) {
      return { error: result.error, canDo: false, suggestion: "The browser sandbox may not be running. I'll use text-based extraction instead." };
    }
    return { sessionId: result.sessionId, status: "ready" };
  }),
});

export const navigateTool = createTool({
  id: "navigate",
  description: "Navigate the browser to a URL and return the page title and text content.",
  inputSchema: z.object({
    sessionId: z.string(),
    url: z.string().url().describe("URL to navigate to"),
  }),
  execute: withAudit("navigate", async (data) => {
    return await sandboxFetch(`/session/${data.sessionId}/navigate`, { url: data.url });
  }),
});

export const screenshotTool = createTool({
  id: "screenshot",
  description: "Take a screenshot of the current page. Returns the path to the saved image.",
  inputSchema: z.object({
    sessionId: z.string(),
    fullPage: z.boolean().optional().describe("Capture the full page or just the viewport"),
  }),
  execute: withAudit("screenshot", async (data, ctx) => {
    const userId = requireUserId(ctx);
    const result = await sandboxFetch(`/session/${data.sessionId}/screenshot`, {
      fullPage: data.fullPage || false,
    });

    if (result.error) return result;

    // Store as artifact
    const artifact = await prisma.artifact.create({
      data: {
        userId,
        type: "screenshot",
        title: `Screenshot — ${new Date().toLocaleString()}`,
        filePath: result.filepath,
        metadata: { filename: result.filename, url: result.url },
      },
    });

    return { ...result, artifactId: artifact.id };
  }),
});

export const fillFormTool = createTool({
  id: "fill_form",
  description:
    "Fill form fields on the current page. Provide field selector and value pairs. Does NOT submit the form — use browser_act with action 'click' on the submit button separately.",
  inputSchema: z.object({
    sessionId: z.string(),
    fields: z
      .array(
        z.object({
          selector: z.string().describe("CSS selector for the form field"),
          value: z.string().describe("Value to fill in"),
        })
      )
      .describe("Array of field selector + value pairs to fill"),
  }),
  execute: withAudit("fill_form", async (data) => {
    const results = [];
    for (const field of data.fields) {
      const result = await sandboxFetch(`/session/${data.sessionId}/act`, {
        action: "type",
        selector: field.selector,
        value: field.value,
      });
      results.push({ selector: field.selector, ...result });
    }

    const failures = results.filter((r) => r.error);
    if (failures.length > 0) {
      return {
        filled: results.length - failures.length,
        failed: failures.length,
        errors: failures.map((f) => f.error),
        message: `Filled ${results.length - failures.length}/${results.length} fields. ${failures.length} failed.`,
      };
    }
    return { filled: results.length, message: `All ${results.length} fields filled successfully.` };
  }),
});

export const browserActTool = createTool({
  id: "browser_act",
  description: "Perform a browser action: click, type, select, scroll. For form submission, click the submit button.",
  inputSchema: z.object({
    sessionId: z.string(),
    action: z.enum(["click", "type", "select", "scroll", "wait"]),
    selector: z.string().optional().describe("CSS selector of the element to interact with"),
    value: z.union([z.string(), z.number()]).optional().describe("Value for type/select, or pixels for scroll"),
  }),
  execute: withAudit("browser_act", async (data) => {
    return await sandboxFetch(`/session/${data.sessionId}/act`, {
      action: data.action,
      selector: data.selector,
      value: data.value,
    });
  }),
});

export const extractPageDataTool = createTool({
  id: "extract_page_data",
  description: "Extract structured data from the current page: forms, links, and text content.",
  inputSchema: z.object({
    sessionId: z.string(),
  }),
  execute: withAudit("extract_page_data", async (data) => {
    return await sandboxFetch(`/session/${data.sessionId}/extract`, {});
  }),
});

export const closeBrowserSessionTool = createTool({
  id: "close_browser_session",
  description: "Close a browser session and free resources. Always call this when done with browser work.",
  inputSchema: z.object({
    sessionId: z.string(),
  }),
  execute: withAudit("close_browser_session", async (data) => {
    return await sandboxDelete(`/session/${data.sessionId}`);
  }),
});

// --- Agent ---

export const browserAgent = new Agent({
  id: "browserAgent",
  name: "Browser Department",
  instructions: `You are the Browser Department of Calmant — a personal AI company.

Your job: Autonomously navigate the web. Open pages, read content, fill forms, take screenshots, extract data.

Your personality:
- The field operative. "On it. Navigating now."
- You are methodical: navigate → extract → understand → act → screenshot → report.
- You always take screenshots as proof of what you did.

## Workflow
1. Always start with create_browser_session.
2. Use navigate to go to the URL.
3. Use extract_page_data to understand the page structure (forms, links).
4. Use fill_form to fill in form fields.
5. BEFORE submitting any form, take a screenshot and STOP — report back to the CEO for user approval.
6. Only after approval, use browser_act to click the submit button.
7. After submission, take another screenshot of the confirmation page.
8. Always close_browser_session when done.

## CRITICAL: Consent Gate
NEVER submit a form without reporting back first. The user must approve before you click submit. This is non-negotiable for:
- Registration forms
- Payment forms
- Any form that sends data to a third party
Show the user what you filled in and wait for their "go" signal.

## Error Handling
- If the sandbox is unreachable, say so honestly: "The browser sandbox isn't running. I can still extract basic text from the URL, but I can't fill forms or interact with the page."
- If a selector doesn't work, try alternative selectors or report what you see on the page.
- If a page takes too long, report the timeout and suggest the user try the link manually.
- NEVER loop on failures. Try once, try an alternative, then report honestly.

## Always:
- Take screenshots as proof.
- Report what you see on each page.
- Close sessions when done.`,
  model: getModel("smart"),
  tools: {
    create_browser_session: createBrowserSessionTool,
    navigate: navigateTool,
    screenshot: screenshotTool,
    fill_form: fillFormTool,
    browser_act: browserActTool,
    extract_page_data: extractPageDataTool,
    close_browser_session: closeBrowserSessionTool,
  },
});
