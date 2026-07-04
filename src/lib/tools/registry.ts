import { z } from "zod";
import { googleWorkspaceSchema, executeGoogleWorkspaceCLI } from "./google-workspace";
import { browserNavigateSchema, executeBrowserNavigate, browserActionSchema, executeBrowserAction } from "./browser";
import { readFileSchema, executeReadFile, writeFileSchema, executeWriteFile, listDirSchema, executeListDir, runCommandSchema, executeRunCommand } from "./filesystem";
import { mcpToolSchema, executeMCPTool, mcpClient } from "./mcp";

export type ToolCategory = 'workspace' | 'browser' | 'filesystem' | 'comms' | 'system' | 'mcp';
export type ToolCostTier = 'free' | 'cheap' | 'expensive';

export interface ToolDefinition<TInput = any, TOutput = any> {
  name: string;
  description: string;
  category: ToolCategory;
  inputSchema: z.ZodType<TInput>;
  outputSchema?: z.ZodType<TOutput>;
  requiresAuth: boolean;
  costTier: ToolCostTier;
  handler: (args: TInput, context: ToolContext) => Promise<TOutput>;
}

export interface ToolContext {
  cwd: string;
  env: Record<string, string>;
}

class ToolRegistry {
  private tools: Map<string, ToolDefinition> = new Map();

  constructor() {
    this.registerGoogleWorkspace();
    this.registerBrowser();
    this.registerFileSystem();
    this.registerMCP();
  }

  private registerMCP() {
    this.register({
      name: "mcp_tool",
      description: "Call an MCP tool provided by a registered MCP server",
      category: 'mcp',
      inputSchema: mcpToolSchema,
      requiresAuth: false,
      costTier: 'free',
      handler: executeMCPTool,
    });
  }

  private registerFileSystem() {
    this.register({
      name: "read_file",
      description: "Read the contents of a file",
      category: 'filesystem',
      inputSchema: readFileSchema,
      requiresAuth: false,
      costTier: 'free',
      handler: executeReadFile,
    });
    
    this.register({
      name: "write_file",
      description: "Write content to a file",
      category: 'filesystem',
      inputSchema: writeFileSchema,
      requiresAuth: false,
      costTier: 'free',
      handler: executeWriteFile,
    });
    
    this.register({
      name: "list_dir",
      description: "List the contents of a directory",
      category: 'filesystem',
      inputSchema: listDirSchema,
      requiresAuth: false,
      costTier: 'free',
      handler: executeListDir,
    });
    
    this.register({
      name: "run_command",
      description: "Run a shell command",
      category: 'system',
      inputSchema: runCommandSchema,
      requiresAuth: false,
      costTier: 'free',
      handler: executeRunCommand,
    });
  }

  private registerBrowser() {
    this.register({
      name: "browser_navigate",
      description: "Navigate to a URL in the browser sandbox",
      category: 'browser',
      inputSchema: browserNavigateSchema,
      requiresAuth: false,
      costTier: 'free',
      handler: executeBrowserNavigate,
    });
    
    this.register({
      name: "browser_action",
      description: "Perform an action (click, type, extract, screenshot) in the browser sandbox",
      category: 'browser',
      inputSchema: browserActionSchema,
      requiresAuth: false,
      costTier: 'free',
      handler: executeBrowserAction,
    });
  }

  private registerGoogleWorkspace() {
    this.register({
      name: "google_workspace_cli",
      description: "Interact with Google Workspace APIs (Drive, Gmail, Docs, Sheets, Calendar, etc.)",
      category: 'workspace',
      inputSchema: googleWorkspaceSchema,
      requiresAuth: true,
      costTier: 'expensive',
      handler: executeGoogleWorkspaceCLI,
    });
  }

  register(tool: ToolDefinition) {
    if (this.tools.has(tool.name)) {
      console.warn(`Tool ${tool.name} is already registered. Overwriting.`);
    }
    this.tools.set(tool.name, tool);
  }

  get(name: string): ToolDefinition | undefined {
    return this.tools.get(name);
  }

  getAll(): ToolDefinition[] {
    return Array.from(this.tools.values());
  }

  getByCategory(category: ToolCategory): ToolDefinition[] {
    return this.getAll().filter(t => t.category === category);
  }

  async execute(name: string, args: unknown, context: ToolContext): Promise<any> {
    const tool = this.tools.get(name);
    if (!tool) {
      throw new Error(`Tool ${name} not found`);
    }

    try {
      // Validate input
      const parsedArgs = tool.inputSchema.parse(args);
      // Execute handler
      return await tool.handler(parsedArgs, context);
    } catch (error) {
      console.error(`Error executing tool ${name}:`, error);
      throw error;
    }
  }
}

export const registry = new ToolRegistry();
