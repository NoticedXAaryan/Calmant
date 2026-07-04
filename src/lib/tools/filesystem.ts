import { z } from "zod";
import * as fs from "fs/promises";
import * as path from "path";
import { exec } from "child_process";
import { promisify } from "util";
import { ToolContext } from "./registry";

const execAsync = promisify(exec);

export const readFileSchema = z.object({
  path: z.string().describe("Absolute or relative path to the file to read"),
});

export const writeFileSchema = z.object({
  path: z.string().describe("Absolute or relative path to the file to write"),
  content: z.string().describe("Content to write to the file"),
});

export const listDirSchema = z.object({
  path: z.string().describe("Absolute or relative path to the directory to list"),
});

export const runCommandSchema = z.object({
  command: z.string().describe("Shell command to run"),
  cwd: z.string().optional().describe("Current working directory for the command"),
});

export type ReadFileArgs = z.infer<typeof readFileSchema>;
export type WriteFileArgs = z.infer<typeof writeFileSchema>;
export type ListDirArgs = z.infer<typeof listDirSchema>;
export type RunCommandArgs = z.infer<typeof runCommandSchema>;

function resolvePath(filePath: string, cwd: string): string {
  return path.isAbsolute(filePath) ? filePath : path.join(cwd, filePath);
}

export async function executeReadFile(args: ReadFileArgs, context: ToolContext): Promise<string> {
  const targetPath = resolvePath(args.path, context.cwd);
  try {
    return await fs.readFile(targetPath, "utf-8");
  } catch (error: any) {
    throw new Error(`Failed to read file ${targetPath}: ${error.message}`);
  }
}

export async function executeWriteFile(args: WriteFileArgs, context: ToolContext): Promise<string> {
  const targetPath = resolvePath(args.path, context.cwd);
  try {
    // Ensure directory exists
    await fs.mkdir(path.dirname(targetPath), { recursive: true });
    await fs.writeFile(targetPath, args.content, "utf-8");
    return `Successfully wrote to ${targetPath}`;
  } catch (error: any) {
    throw new Error(`Failed to write file ${targetPath}: ${error.message}`);
  }
}

export async function executeListDir(args: ListDirArgs, context: ToolContext): Promise<string> {
  const targetPath = resolvePath(args.path, context.cwd);
  try {
    const entries = await fs.readdir(targetPath, { withFileTypes: true });
    const formatted = entries.map(entry => {
      const type = entry.isDirectory() ? "DIR " : "FILE";
      return `[${type}] ${entry.name}`;
    });
    return formatted.join("\n") || "(Empty directory)";
  } catch (error: any) {
    throw new Error(`Failed to list directory ${targetPath}: ${error.message}`);
  }
}

export async function executeRunCommand(args: RunCommandArgs, context: ToolContext): Promise<string> {
  const cwd = args.cwd ? resolvePath(args.cwd, context.cwd) : context.cwd;
  console.log(`[RunCommand] Executing: ${args.command} in ${cwd}`);
  
  try {
    const { stdout, stderr } = await execAsync(args.command, { 
      cwd,
      env: { ...process.env, ...context.env },
      maxBuffer: 1024 * 1024 * 10 // 10MB
    });
    
    let result = "";
    if (stdout) result += `STDOUT:\n${stdout}\n`;
    if (stderr) result += `STDERR:\n${stderr}`;
    
    return result || "(Command completed with no output)";
  } catch (error: any) {
    let result = `Error: ${error.message}\n`;
    if (error.stdout) result += `STDOUT:\n${error.stdout}\n`;
    if (error.stderr) result += `STDERR:\n${error.stderr}`;
    return result;
  }
}
