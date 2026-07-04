import { z } from "zod";
import { exec } from "child_process";
import { promisify } from "util";
import { ToolContext } from "./registry";

const execAsync = promisify(exec);

// Note: A real MCP client would use the @modelcontextprotocol/sdk package
// to connect via stdio or http and discover tools dynamically.
// This is a simplified wrapper that assumes stdio execution of a command.

export interface MCPServerConfig {
  name: string;
  command: string;
  args: string[];
  env?: Record<string, string>;
}

export const mcpToolSchema = z.object({
  server: z.string().describe("Name of the MCP server"),
  tool: z.string().describe("Name of the tool to call on the server"),
  args: z.record(z.string(), z.any()).describe("Arguments to pass to the tool"),
});

export type MCPToolArgs = z.infer<typeof mcpToolSchema>;

export class MCPClient {
  private servers: Map<string, MCPServerConfig> = new Map();

  registerServer(config: MCPServerConfig) {
    this.servers.set(config.name, config);
  }

  async executeTool(args: MCPToolArgs, context: ToolContext): Promise<string> {
    const server = this.servers.get(args.server);
    if (!server) {
      throw new Error(`MCP Server '${args.server}' not found or not configured.`);
    }

    // In a real implementation, we would send a JSON-RPC request over stdin
    // and wait for a response on stdout. For this mock, we'll just shell out
    // and pass args as a JSON string argument (which is non-standard MCP, 
    // but demonstrates the registry integration).
    
    // Using npx for everything as a fallback if not full path
    let cmd = server.command;
    const argsStr = server.args.join(" ");
    
    // Mock the stdio protocol by passing the tool request directly to a hypothetical CLI
    const toolArg = JSON.stringify({ method: args.tool, params: args.args });
    const fullCmd = `${cmd} ${argsStr} --mcp-tool-request '${toolArg}'`;
    
    console.log(`[MCP] Executing tool ${args.tool} on server ${args.server}`);
    
    try {
      const { stdout, stderr } = await execAsync(fullCmd, {
        cwd: context.cwd,
        env: { ...process.env, ...context.env, ...server.env },
        maxBuffer: 1024 * 1024 * 10
      });
      
      return stdout || stderr;
    } catch (error: any) {
      return `MCP Error: ${error.message}\n${error.stdout || ""}\n${error.stderr || ""}`;
    }
  }
}

export const mcpClient = new MCPClient();

export async function executeMCPTool(args: MCPToolArgs, context: ToolContext): Promise<string> {
  return await mcpClient.executeTool(args, context);
}
