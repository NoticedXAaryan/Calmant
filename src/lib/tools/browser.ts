import { z } from "zod";
import { ToolContext } from "./registry";

export const browserNavigateSchema = z.object({
  url: z.string().url().describe("The URL to navigate to"),
  waitFor: z.enum(["load", "domcontentloaded", "networkidle"]).default("load").describe("When to consider the navigation complete"),
});

export const browserActionSchema = z.object({
  action: z.enum(["click", "type", "scroll", "extract", "screenshot"]),
  selector: z.string().optional().describe("CSS selector for the element to interact with"),
  text: z.string().optional().describe("Text to type if action is 'type'"),
  direction: z.enum(["up", "down", "left", "right"]).optional().describe("Direction to scroll"),
});

export type BrowserNavigateArgs = z.infer<typeof browserNavigateSchema>;
export type BrowserActionArgs = z.infer<typeof browserActionSchema>;

// Mock implementation of a browser sandbox tool
// In a real implementation this would connect to Puppeteer, Playwright, or BrowserBase
export class BrowserSandbox {
  private activeUrl: string | null = null;

  async navigate(args: BrowserNavigateArgs, context: ToolContext): Promise<string> {
    this.activeUrl = args.url;
    console.log(`[BrowserSandbox] Navigating to ${args.url} (waiting for ${args.waitFor})...`);
    // Mock network delay
    await new Promise(resolve => setTimeout(resolve, 500));
    return `Successfully navigated to ${args.url}. Title: "Sample Page"`;
  }

  async performAction(args: BrowserActionArgs, context: ToolContext): Promise<string> {
    if (!this.activeUrl) {
      throw new Error("No active browser session. Navigate to a URL first.");
    }
    
    console.log(`[BrowserSandbox] Performing ${args.action} on ${args.selector || 'page'}...`);
    
    switch (args.action) {
      case "click":
        return `Clicked element matching selector '${args.selector}'`;
      case "type":
        return `Typed '${args.text}' into element matching selector '${args.selector}'`;
      case "extract":
        return `Extracted text from '${args.selector}': "Sample extracted content from ${this.activeUrl}"`;
      case "screenshot":
        return `Saved screenshot to artifacts folder: screenshot-${Date.now()}.png`;
      default:
        return `Performed ${args.action}`;
    }
  }
}

export const browserSandbox = new BrowserSandbox();

export async function executeBrowserNavigate(args: BrowserNavigateArgs, context: ToolContext): Promise<string> {
  return await browserSandbox.navigate(args, context);
}

export async function executeBrowserAction(args: BrowserActionArgs, context: ToolContext): Promise<string> {
  return await browserSandbox.performAction(args, context);
}
