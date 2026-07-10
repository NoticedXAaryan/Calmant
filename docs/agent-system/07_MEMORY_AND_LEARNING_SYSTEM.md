# Memory and Learning System

The system should learn the owner's preferences over time without becoming creepy, inaccurate, or impossible to correct.

## Current State

Files:

- `src/lib/memory.ts`
- `src/lib/agent-context.ts`
- Prisma model `AgentMemory`

Current behavior:

- Runtime uses Mem0 with pgvector.
- `addMemory(text, userId)` writes full conversation text.
- `searchMemory(query, userId, limit)` retrieves relevant memory.
- `buildUserContext` loads active tasks, habits, and memory search results.

Problems:

- Memory writes are too broad.
- Mem0 storage and Prisma `AgentMemory` are disconnected.
- No confidence/review workflow.
- No source/run references.
- No "forget this" path for Mem0 records.

## Memory Principles

1. Memory must be useful.
2. Memory must be inspectable.
3. Memory must be editable and deletable.
4. Memory must not store secrets.
5. Memory must include confidence and source.
6. Memory should improve actions, not just personalize wording.

## Memory Categories

Use these categories:

- `preference`: stable likes/dislikes or style choices.
- `communication_style`: how the owner writes emails/messages.
- `relationship`: people, roles, and default CC behavior.
- `routine`: recurring schedule or habits.
- `goal`: long-term objective details.
- `constraint`: rules the agent must follow.
- `project`: ongoing context for a project.
- `credential_hint`: non-secret note that an integration exists or needs reconnect.
- `negative_preference`: what not to do.

Do not store:

- passwords,
- OTPs,
- full card numbers,
- private keys,
- raw OAuth tokens,
- sensitive medical/financial details unless explicitly approved and required.

## Memory Service

Create `src/lib/services/memory-service.ts`.

API:

```ts
export interface MemoryCandidate {
  userId: string;
  fact: string;
  category: string;
  confidence: number;
  sourceRunId?: string;
  sourceToolCallId?: string;
  sensitivity: "low" | "medium" | "high" | "secret";
}

export interface MemorySearchResult {
  id?: string;
  fact: string;
  category: string;
  confidence?: number;
  source?: string;
}

export class MemoryService {
  search(userId: string, query: string, limit?: number): Promise<MemorySearchResult[]>;
  propose(candidate: MemoryCandidate): Promise<{ status: "written" | "queued_for_review" | "rejected"; memoryId?: string; reason?: string }>;
  list(userId: string, filters?: unknown): Promise<MemorySearchResult[]>;
  delete(userId: string, memoryId: string): Promise<void>;
  disable(userId: string): Promise<void>;
  enable(userId: string): Promise<void>;
}
```

## Write Policy

Auto-write only if all are true:

- memory consent is enabled,
- sensitivity is `low`,
- confidence >= 0.85,
- category is allowlisted,
- no contradiction with existing memory or contradiction is resolved,
- fact is not a one-time event.

Queue for review if:

- confidence 0.55 to 0.84,
- sensitivity `medium`,
- fact affects external communication,
- fact changes default recipients,
- fact changes important workflow behavior.

Reject if:

- sensitivity `secret`,
- fact includes credentials,
- confidence < 0.55,
- owner explicitly says not to remember,
- fact is likely temporary.

## Candidate Extraction

The synthesizer may return memory candidates, but `LearningService` makes final decisions.

Candidate examples:

Good:

- "Owner prefers concise, direct email drafts."
- "For internship outreach, owner usually wants Professor Rao CC'd."
- "Owner prefers presentations with minimal text and strong visuals."

Bad:

- "Owner mentioned a password."
- "Owner applied to one role today." This is an event, not a memory.
- "Owner seemed anxious." Do not infer sensitive emotional state as memory.

## Memory Use in Prompts

`ContextService` should pass memory as structured entries:

```json
[
  {
    "fact": "Owner prefers concise email drafts.",
    "category": "communication_style",
    "confidence": 0.92,
    "source": "manual"
  }
]
```

Then derive prompt text.

Rules:

- Include only memories relevant to current task.
- Include high-confidence constraints before style preferences.
- Do not include sensitive memory unless the task requires it.

## Skill Learning

A skill is not the same as memory.

Memory:

- "I prefer concise emails."

Skill:

- "How to draft and send a recruiter email for this owner."

Skill creation trigger:

- same multi-step workflow succeeds twice,
- owner asks "remember how to do this",
- synthesizer sets `proposeSkill = true`,
- owner approves.

Skill status:

- `draft`: created but not used automatically.
- `active`: planner can retrieve and use.
- `disabled`: kept but not used.
- `archived`: historical only.

## User Controls

Dashboard must provide:

- memory search,
- memory categories,
- edit memory,
- delete memory,
- disable memory,
- export memory,
- review queued memory candidates.

Telegram must provide:

- `/memory recent`
- `/memory search QUERY`
- "Forget this" button on memory review messages.

## Implementation Steps

1. Create `MemoryService`.
2. Wrap existing Mem0 calls.
3. Store metadata in Prisma `AgentMemory` or add a new metadata model.
4. Update `agent.ts` so it does not blindly call `addMemory(fullConversation)`.
5. Add `LearningService` after synthesis.
6. Add review state for medium-risk memory candidates.
7. Update context builder to use `MemoryService.search`.
8. Add tests for memory write policy.

## Acceptance Criteria

- Owner can see what the agent remembers.
- Owner can delete a memory and it stops appearing in context.
- Full conversations are not blindly stored.
- Communication style preferences can affect email drafts.
- CC preferences are used only when high-confidence or approved.
- Memory extraction never stores secrets.

