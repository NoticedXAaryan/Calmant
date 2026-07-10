import { z } from "zod";

import { mcpToolSchema, executeMCPTool, mcpClient } from "./mcp";
import { browserNavigateSchema, executeBrowserNavigate, browserActionSchema, executeBrowserAction } from "./browser";
import { readFileSchema, executeReadFile, writeFileSchema, executeWriteFile, listDirSchema, executeListDir, runCommandSchema, executeRunCommand } from "./filesystem";
import { tavilySearchSchema, executeTavilySearch, firecrawlSchema, executeFirecrawl } from "./research";
import { getCalendarEventsSchema, executeGetCalendarEvents, createCalendarEventSchema, executeCreateCalendarEvent, getFreeBusySchema, executeGetFreeBusy } from "./google-calendar";
import { portalEscalationSchema, executePortalEscalation } from "./portal-escalation";
import { gmailSearchSchema, executeGmailSearch, gmailCreateDraftSchema, executeGmailCreateDraft, gmailSendDraftSchema, executeGmailSendDraft } from "./gmail";
import { ToolManifest, ToolExecutionContext } from "./tool-manifest";
import { ToolRunner } from "./tool-runner";

export type ToolContext = Omit<ToolExecutionContext, "toolCallId">;

class ToolRegistry {
  private tools: Map<string, ToolManifest> = new Map();

  constructor() {
    this.registerGoogleWorkspace();
    this.registerBrowser();
    this.registerFileSystem();
    this.registerMCP();
    this.registerResearch();
    this.registerGoogle();
    this.registerPortal();
  }

  private registerPortal() {
    this.register({
      name: "portal_escalation",
      version: "1.0.0",
      description: "Escalate a complex task to an external AI portal (like Claude, ChatGPT, etc.)",
      category: "browser",
      inputSchema: portalEscalationSchema,
      riskLevel: "external_message",
      sideEffect: "none",
      requiresApproval: "always",
      timeoutMs: 30000,
      handler: executePortalEscalation as any,
    });
  }

  private registerMCP() {
    this.register({
      name: "mcp_tool",
      version: "1.0.0",
      description: "Call an MCP tool provided by a registered MCP server",
      category: "mcp",
      inputSchema: mcpToolSchema,
      riskLevel: "external_message",
      sideEffect: "external_write",
      requiresApproval: "policy",
      timeoutMs: 30000,
      handler: executeMCPTool as any,
    });
  }

  private registerResearch() {
    this.register({
      name: "tavily_search",
      version: "1.0.0",
      description: "Search the web using Tavily",
      category: "system",
      inputSchema: tavilySearchSchema,
      riskLevel: "read",
      sideEffect: "none",
      requiresApproval: "never",
      timeoutMs: 15000,
      handler: executeTavilySearch as any,
    });
    
    this.register({
      name: "firecrawl_scrape",
      version: "1.0.0",
      description: "Scrape a webpage and convert it to markdown using Firecrawl",
      category: "system",
      inputSchema: firecrawlSchema,
      riskLevel: "read",
      sideEffect: "none",
      requiresApproval: "never",
      timeoutMs: 30000,
      handler: executeFirecrawl as any,
    });
  }

  private registerGoogle() {
    // Moved to registerGoogleWorkspace
  }

  private registerFileSystem() {
    this.register({
      name: "read_file",
      version: "1.0.0",
      description: "Read the contents of a file",
      category: "filesystem",
      inputSchema: readFileSchema,
      riskLevel: "read",
      sideEffect: "none",
      requiresApproval: "never",
      timeoutMs: 5000,
      handler: executeReadFile as any,
    });
    
    if (process.env.AGENT_ENABLE_UNSAFE_DEV_TOOLS === "true") {
      this.register({
        name: "write_file",
        version: "1.0.0",
        description: "Write content to a file",
        category: "filesystem",
        inputSchema: writeFileSchema,
        riskLevel: "write_internal",
        sideEffect: "internal_write",
        requiresApproval: "never",
        timeoutMs: 5000,
        handler: executeWriteFile as any,
      });
    }
    
    this.register({
      name: "list_dir",
      version: "1.0.0",
      description: "List the contents of a directory",
      category: "filesystem",
      inputSchema: listDirSchema,
      riskLevel: "read",
      sideEffect: "none",
      requiresApproval: "never",
      timeoutMs: 5000,
      handler: executeListDir as any,
    });
    
    if (process.env.AGENT_ENABLE_UNSAFE_DEV_TOOLS === "true") {
      this.register({
        name: "run_command",
        version: "1.0.0",
        description: "Run a shell command",
        category: "system",
        inputSchema: runCommandSchema,
        riskLevel: "destructive",
        sideEffect: "internal_write",
        requiresApproval: "always",
        timeoutMs: 60000,
        handler: executeRunCommand as any,
      });
    }
  }

  private registerBrowser() {
    this.register({
      name: "browser_navigate",
      version: "1.0.0",
      description: "Navigate to a URL in the browser sandbox",
      category: "browser",
      inputSchema: browserNavigateSchema,
      riskLevel: "read",
      sideEffect: "none",
      requiresApproval: "never",
      timeoutMs: 30000,
      handler: executeBrowserNavigate as any,
    });
    
    this.register({
      name: "browser_action",
      version: "1.0.0",
      description: "Perform an action (click, type, extract, screenshot) in the browser sandbox",
      category: "browser",
      inputSchema: browserActionSchema,
      riskLevel: "external_submission",
      sideEffect: "external_write",
      requiresApproval: "policy",
      checkApproval: (args: any) => {
        if (args.action === "submit") return true;
        if (args.action === "click" && args.selector) {
          const s = args.selector.toLowerCase();
          if (s.includes("submit") || s.includes("publish") || s.includes("pay") || s.includes("delete") || s.includes("checkout")) {
            return true;
          }
        }
        return false;
      },
      timeoutMs: 30000,
      handler: executeBrowserAction as any,
    });
  }

  private registerGoogleWorkspace() {
    this.register({
      name: "calendar_list_events",
      version: "1.0.0",
      description: "Get upcoming events from the user's primary Google Calendar.",
      category: "calendar",
      inputSchema: getCalendarEventsSchema,
      riskLevel: "read",
      sideEffect: "none",
      requiresApproval: "never",
      timeoutMs: 10000,
      handler: executeGetCalendarEvents as any,
    });
    
    this.register({
      name: "calendar_create_event",
      version: "1.0.0",
      description: "Create a new event in the user's primary Google Calendar.",
      category: "calendar",
      inputSchema: createCalendarEventSchema,
      riskLevel: "write_internal",
      sideEffect: "external_write",
      requiresApproval: "never",
      timeoutMs: 15000,
      handler: executeCreateCalendarEvent as any,
    });
    
    this.register({
      name: "calendar_freebusy",
      version: "1.0.0",
      description: "Check the user's free/busy status.",
      category: "calendar",
      inputSchema: getFreeBusySchema,
      riskLevel: "read",
      sideEffect: "none",
      requiresApproval: "never",
      timeoutMs: 10000,
      handler: executeGetFreeBusy as any,
    });
    
    this.register({
      name: "gmail_search_messages",
      version: "1.0.0",
      description: "Search the user's Gmail inbox using standard Gmail search queries.",
      category: "gmail",
      inputSchema: gmailSearchSchema,
      riskLevel: "read",
      sideEffect: "none",
      requiresApproval: "never",
      timeoutMs: 20000,
      handler: executeGmailSearch as any,
    });
    
    this.register({
      name: "gmail_create_draft",
      version: "1.0.0",
      description: "Create an email draft in Gmail.",
      category: "gmail",
      inputSchema: gmailCreateDraftSchema,
      riskLevel: "write_internal",
      sideEffect: "external_write",
      requiresApproval: "never",
      timeoutMs: 15000,
      handler: executeGmailCreateDraft as any,
    });
    
    this.register({
      name: "gmail_send_draft",
      version: "1.0.0",
      description: "Send an existing email draft from Gmail.",
      category: "gmail",
      inputSchema: gmailSendDraftSchema,
      riskLevel: "external_message",
      sideEffect: "external_write",
      requiresApproval: "always",
      timeoutMs: 20000,
      handler: executeGmailSendDraft as any,
    });
  }

  register(tool: ToolManifest) {
    if (this.tools.has(tool.name)) {
      console.warn(`Tool ${tool.name} is already registered. Overwriting.`);
    }
    this.tools.set(tool.name, tool);
  }

  get(name: string): ToolManifest | undefined {
    return this.tools.get(name);
  }

  getAll(): ToolManifest[] {
    return Array.from(this.tools.values());
  }

  getByCategory(category: ToolManifest["category"]): ToolManifest[] {
    return this.getAll().filter(t => t.category === category);
  }

  async execute(name: string, args: unknown, context: Omit<ToolExecutionContext, "toolCallId">): Promise<any> {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new Error(`Tool ${name} not found`);
    }

    return ToolRunner.execute(tool, args, context);
  }
}

export const registry = new ToolRegistry();
