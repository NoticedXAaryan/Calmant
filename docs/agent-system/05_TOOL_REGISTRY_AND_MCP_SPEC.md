# Tool Registry and MCP Specification

The tool registry is the contract between reasoning and action. It must be deterministic, typed, auditable, and safe.

## Current Registry to Replace

Current file:

- `src/lib/tools/registry.ts`

Current registered tools:

- `google_workspace_cli`
- `browser_navigate`
- `browser_action`
- `read_file`
- `write_file`
- `list_dir`
- `run_command`
- `mcp_tool`
- `tavily_search`
- `firecrawl_scrape`
- `google_calendar_events`

Immediate changes:

- Disable `run_command` for user-originated tasks.
- Disable unrestricted `write_file` for user-originated tasks.
- Replace `google_workspace_cli` with first-class API tools or trusted MCP tools.
- Replace `mcp_tool` shell wrapper with a real MCP client.
- Add missing product tools for memory, email, calendar write actions, Telegram owner messages, artifacts, and approvals.

## Tool Manifest

Create `src/lib/tools/tool-manifest.ts`.

```ts
export type ToolRiskLevel =
  | "read"
  | "write_internal"
  | "external_message"
  | "external_submission"
  | "destructive"
  | "credential"
  | "financial";

export interface ToolManifest<TInput = unknown, TOutput = unknown> {
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
    | "mcp";
  inputSchema: z.ZodType<TInput>;
  outputSchema: z.ZodType<TOutput>;
  riskLevel: ToolRiskLevel;
  sideEffect: "none" | "internal_write" | "external_write";
  requiresApproval: "never" | "always" | "policy";
  requiredIntegrations: string[];
  requiredEnv: string[];
  timeoutMs: number;
  retry: {
    maxAttempts: number;
    idempotent: boolean;
  };
  handler: (args: TInput, context: ToolExecutionContext) => Promise<TOutput>;
}
```

Create `ToolExecutionContext`:

```ts
export interface ToolExecutionContext {
  userId: string;
  runId: string;
  toolCallId: string;
  cwd: string;
  env: Record<string, string>;
  timeZone?: string;
  traceId?: string;
  dryRun?: boolean;
}
```

## Registry Rules

1. Registry is the only source of tool truth.
2. Planner prompt tool list is generated from registry manifests.
3. API docs for tools are generated from registry manifests.
4. Executor validates inputs and outputs with Zod.
5. Executor enforces risk and approval policy from manifest.
6. Tool handlers do not send progress directly. They return structured output and artifacts.
7. Tool handlers never read user text to decide whether approval is needed. That is policy logic.

## Minimum Product Tools

### Memory Tools

`memory_search`

- Risk: `read`
- Input: `{ query: string; limit?: number; categories?: string[] }`
- Output: `{ memories: Array<{ id?: string; fact: string; category: string; confidence?: number; source?: string }> }`
- Handler: wraps `MemoryService.search`.

`memory_write_candidate`

- Risk: `write_internal`
- Approval: policy. Auto-allow low-risk preference if confidence high and memory consent enabled.
- Input: `{ fact: string; category: string; confidence: number; sourceRunId: string }`
- Output: `{ memoryId?: string; status: "written" | "queued_for_review" | "ignored"; reason?: string }`

### Calendar Tools

`calendar_list_events`

- Risk: `read`
- Replaces `google_calendar_events`.
- Requires `google_calendar` integration.

`calendar_create_event`

- Risk: `external_submission` if inviting others, else `write_internal`.
- Approval: policy.
- Input includes title, start, end, timezone, attendees, description, location.

`calendar_update_event`

- Risk: `external_submission` if attendees exist, else `write_internal`.
- Approval: always if changing attendee-visible details.

`calendar_delete_event`

- Risk: `destructive`.
- Approval: always.

`calendar_freebusy`

- Risk: `read`.
- Use to schedule focus blocks without conflicts.

`calendar_schedule_owner_reminder`

- Risk: `write_internal`.
- Creates an internal `BackgroundJob` or `Watcher`, not a Google event.

### Gmail Tools

`gmail_search_messages`

- Risk: `read`.
- Input: query, max results, label filter.
- Output: message metadata and sanitized snippets.

`gmail_get_message`

- Risk: `read`.
- Output must redact secrets and large content by default.

`gmail_create_draft`

- Risk: `write_internal`.
- Approval: policy.

`gmail_send_draft`

- Risk: `external_message`.
- Approval: always unless recipient is the owner.

`gmail_watch_start`

- Risk: `write_internal`.
- Sets up Gmail push watch.

`gmail_history_sync`

- Risk: `read`.
- Uses stored history IDs.

### Telegram Tools

`telegram_send_owner_message`

- Risk: `external_message`.
- Approval: never when recipient is linked owner and message is a notification or run progress.

`telegram_request_approval`

- Risk: `external_message`.
- Approval: never. It is the approval mechanism.

`telegram_update_progress`

- Risk: `external_message`.
- Approval: never.

### Browser Tools

`browser_create_session`

- Risk: `write_internal`.
- Creates run-bound session.

`browser_navigate`

- Risk: `read`.
- Output: URL, title, text snapshot, screenshot artifact ID.

`browser_extract`

- Risk: `read`.
- Output: structured text, forms, links, page metadata.

`browser_act`

- Risk: policy.
- Input: action, selector/semantic target, value.
- Approval required if action submits forms, makes purchases, sends messages, changes external state, uploads files, or logs in with credentials.

`browser_screenshot`

- Risk: `read`.
- Output: artifact ID.

`browser_download_file`

- Risk: `read`.
- Output: artifact ID and metadata.

`browser_upload_file`

- Risk: `external_submission`.
- Approval: always unless upload target is an internal sandbox.

### Document and Presentation Tools

`presentation_create`

- Risk: `write_internal`.
- Creates a local or Google Slides artifact.

`presentation_export_pdf`

- Risk: `read`.

`document_create`

- Risk: `write_internal`.

`cv_generate_variant`

- Risk: `write_internal`.
- Requires source profile, job/opportunity, and style memory.

### Research Tools

`web_search`

- Risk: `read`.
- Use official APIs where configured; otherwise use browser/search adapters.

`web_fetch`

- Risk: `read`.

`source_summarize`

- Risk: `read`.
- Must keep citations.

### Internal Tools

`task_create`

- Risk: `write_internal`.

`task_update`

- Risk: `write_internal`; approval policy if destructive.

`goal_create`

- Risk: `write_internal`.

`opportunity_create`

- Risk: `write_internal`.

`artifact_create`

- Risk: `write_internal`.

## MCP Client Requirements

Replace `src/lib/tools/mcp.ts` with:

- `src/lib/mcp/client.ts`
- `src/lib/mcp/server-registry.ts`
- `src/lib/mcp/tool-adapter.ts`

Requirements:

1. Use the official MCP SDK or direct JSON-RPC transport implementation.
2. Support stdio and HTTP/SSE transports.
3. Tool discovery must call MCP `tools/list`.
4. Tool calls must call MCP `tools/call`.
5. Store discovered tools in memory with server trust metadata.
6. Do not expose all MCP tools to the planner. Only expose allowlisted tools.
7. Every MCP tool must be wrapped in a product `ToolManifest`.
8. MCP server config must be static or admin-configured, not generated from user input.

MCP server config example:

```ts
export const MCP_SERVERS = [
  {
    name: "filesystem_readonly",
    transport: "stdio",
    command: "node",
    args: ["./mcp-servers/filesystem-readonly.js"],
    allowedTools: ["read_file", "list_directory"],
    riskLevel: "read",
  },
];
```

## Tool Policy Matrix

| Tool Class | Example | Approval |
|---|---|---|
| Read owner data | calendar list, memory search | no |
| Internal write | create task, create artifact | policy |
| Owner notification | Telegram progress | no |
| Third-party message | email recruiter | yes |
| Form submission | internship application | yes |
| Destructive | delete event, delete memory | yes |
| Credential | login, OAuth reconnect | yes |
| Financial | card, purchase, payment | always yes and mostly out of scope |

## Output Schemas

Every tool must return structured output. Avoid returning long natural-language strings.

Bad:

```ts
return `Navigated to ${url}\nTitle: ${title}\nText: ${text}`;
```

Good:

```ts
return {
  url,
  title,
  textPreview,
  textLength,
  screenshotArtifactId,
  forms,
  links,
};
```

## Prompt Generation

Do not manually write tool examples with fake names.

Implement:

- `registry.toPlannerPrompt()`
- `registry.toJsonSchema()`
- `registry.getAllowedToolsForRun(userId, channel)`

The planner sees:

- tool name,
- description,
- input schema,
- output summary,
- risk level,
- approval behavior.

The planner does not see:

- secrets,
- implementation details,
- unrestricted shell access.

## Dry Run

Every tool must support dry-run behavior when possible:

- Email send -> draft preview.
- Calendar create -> proposed event.
- Browser submit -> stop before submit click.
- File write -> proposed path and diff.
- Task create -> proposed task.

Dry-run output must be enough for an approval request.

