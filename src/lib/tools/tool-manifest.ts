import { z } from "zod";

export type ToolRiskLevel =
  | "read"
  | "write_internal"
  | "external_message"
  | "external_submission"
  | "destructive"
  | "credential"
  | "financial";

export interface ToolExecutionContext {
  userId: string;
  runId: string;
  toolCallId: string;
  cwd: string;
  env: Record<string, string>;
  timeZone?: string;
  traceId?: string;
  dryRun?: boolean;
  goalId?: string;
  projectCellId?: string;
  projectTaskId?: string;
  availableSkills?: string[];
}

export interface ToolManifest<TInput = any, TOutput = any> {
  name: string;
  version: string;
  description: string;
  category:
    | "memory"
    | "calendar"
    | "gmail"
    | "telegram"
    | "browser"
    | "document"
    | "research"
    | "filesystem"
    | "system"
    | "workspace"
    | "mcp";
  inputSchema: z.ZodType<TInput>;
  outputSchema?: z.ZodType<TOutput>;
  riskLevel: ToolRiskLevel;
  sideEffect: "none" | "internal_write" | "external_write";
  requiresApproval: "never" | "always" | "policy";
  checkApproval?: (args: TInput) => boolean;
  requiredIntegrations?: string[];
  requiredEnv?: string[];
  timeoutMs: number;
  retry?: {
    maxAttempts: number;
    idempotent: boolean;
  };
  handler: (args: TInput, context: ToolExecutionContext) => Promise<TOutput>;
}
