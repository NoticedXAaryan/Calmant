import { z } from "zod";
import { exec } from "child_process";
import { promisify } from "util";
import { ToolContext } from "./registry";

const execAsync = promisify(exec);

export const googleWorkspaceSchema = z.object({
  service: z.string().describe("The Google Workspace service to use (e.g., 'drive', 'sheets', 'gmail', 'calendar')"),
  resource: z.string().describe("The resource within the service (e.g., 'files', 'spreadsheets', 'users.messages')"),
  method: z.string().describe("The method to call on the resource (e.g., 'list', 'get', 'create', 'update')"),
  params: z.string().optional().describe("URL/Query parameters as a JSON string (e.g., '{\"pageSize\": 10}')"),
  jsonBody: z.string().optional().describe("Request body as a JSON string for POST/PATCH/PUT requests"),
  format: z.enum(["json", "table", "yaml", "csv"]).default("json").describe("The output format"),
});

export type GoogleWorkspaceArgs = z.infer<typeof googleWorkspaceSchema>;

export async function executeGoogleWorkspaceCLI(
  args: GoogleWorkspaceArgs,
  context: ToolContext
): Promise<string> {
  const { service, resource, method, params, jsonBody, format } = args;
  
  let command = `npx -y @googleworkspace/cli ${service} ${resource.split('.').join(' ')} ${method} --format ${format}`;
  
  if (params) {
    command += ` --params '${params}'`;
  }
  
  if (jsonBody) {
    command += ` --json '${jsonBody}'`;
  }
  
  console.log(`[GoogleWorkspaceCLI] Executing: ${command}`);
  
  try {
    const { stdout, stderr } = await execAsync(command, { maxBuffer: 1024 * 1024 * 10 }); // 10MB buffer
    
    if (stderr && stderr.trim().length > 0 && !stdout) {
      console.warn(`[GoogleWorkspaceCLI] Warning: ${stderr}`);
      return stderr;
    }
    
    return stdout;
  } catch (error: any) {
    console.error(`[GoogleWorkspaceCLI] Error executing command: ${error.message}`);
    if (error.stdout) {
      return `Error: ${error.message}\nOutput: ${error.stdout}`;
    }
    return `Error: ${error.message}`;
  }
}

// In the registry we will register this as:
// registry.registerTool(
//   "google_workspace_cli",
//   "A comprehensive tool for interacting with Google Workspace APIs (Drive, Gmail, Docs, Sheets, Calendar, etc.)",
//   googleWorkspaceSchema,
//   executeGoogleWorkspaceCLI
// );
