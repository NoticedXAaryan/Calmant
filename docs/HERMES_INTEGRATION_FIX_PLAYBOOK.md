# Hermes Integration Audit and Fix Playbook

This document is written for the implementation agent that will repair the Hermes integration in this application. Assume the agent has limited prior context about this codebase, Dokploy, Hermes Agent, or the current request path.

The production deployment target is Dokploy running on a VPS. The relevant application lives under `app/` in this repository.

## Executive verdict

The Hermes integration is not failing for one single reason. There is a failure chain:

1. The web app currently fails to build before Hermes is even reached because `src/components/AssistantChat.tsx` contains duplicated/pasted source code inside an object literal.
2. The Hermes wrapper container can start, but its health check is too shallow and does not prove that the Hermes CLI, provider configuration, profile, plugin/tools, or downstream services work.
3. The custom Calmant tools are copied as raw Python files into `~/.hermes/skills/`, but Hermes tools are expected to be registered as plugins or other supported tool integrations. The current files are very likely invisible to Hermes.
4. The wrapper calls Hermes through a fragile command/environment combination. It relies on `HERMES_PROFILE`, which is not a documented Hermes profile-selection environment variable in the public docs, instead of passing `-p/--profile` explicitly.
5. The response delivery path uses Server-Sent Events, but the server does not stream real Hermes tokens and the client parser is brittle when JSON events are split across chunks.
6. The sandbox integration has at least one definite route mismatch: `sandbox_tools.py` calls `GET /session/{id}/extract`, but `sandbox/server.js` exposes `POST /session/:id/extract`.
7. The Dokploy setup needs stricter environment, networking, and public exposure boundaries. In particular, the sandbox should not be publicly exposed unless it has authentication and SSRF protections.

Fix the app in phases. Do not start by rewriting everything. First make the app build. Then make Hermes start and answer a direct health/smoke request. Then wire tools correctly. Then improve streaming and delivery.

## Current system map

Current expected request path:

```text
Browser AssistantChat UI
  -> POST /api/agent/chat
  -> src/app/api/agent/chat/route.ts
  -> src/lib/agent.ts agentReplyStream()
  -> HTTP POST http://hermes:8000/chat
  -> hermes-backend/server.py FastAPI wrapper
  -> hermes CLI subprocess
  -> Hermes profile + model provider + tools/plugins
  -> optional Calmant data tools
       -> Next.js internal API /api/internal/hermes/tasks
       -> Prisma/Postgres
  -> optional browser sandbox tools
       -> sandbox service at http://sandbox:4000
  -> response back through SSE to the browser
```

Other channels share the same non-streaming agent path:

```text
Telegram polling/webhook code -> src/lib/agent.ts agentReply()
WhatsApp webhook code         -> src/lib/agent.ts agentReply()
```

That means Hermes failures affect the browser assistant, Telegram, and WhatsApp.

## Files that matter

| Area | File | Why it matters |
| --- | --- | --- |
| Browser chat UI | `src/components/AssistantChat.tsx` | Currently corrupt and breaks the build. Also contains the SSE parsing logic. |
| Browser chat API | `src/app/api/agent/chat/route.ts` | Returns the SSE stream to the browser. |
| Agent bridge | `src/lib/agent.ts` | Creates `AgentRun` records, builds context, calls the Hermes wrapper, emits stream events. |
| Context builder | `src/lib/agent-context.ts` | Loads tasks, memories, and habits injected into the Hermes prompt. |
| Hermes wrapper | `hermes-backend/server.py` | FastAPI wrapper around the Hermes CLI. This is the main integration point. |
| Hermes image | `hermes-backend/Dockerfile` | Installs Hermes and copies tool files. It is currently too version-fragile. |
| Data tool draft | `hermes-backend/db_tools.py` | Intended task CRUD tool, but not registered as a real Hermes plugin/tool. |
| Sandbox tool draft | `hermes-backend/sandbox_tools.py` | Intended browser automation tool, but not registered as a real Hermes plugin/tool and has a route mismatch. |
| Sandbox API | `sandbox/server.js` | Browser service used by sandbox tools. |
| Internal task API | `src/app/api/internal/hermes/tasks/route.ts` | Private API used by Hermes-side task tools. |
| Deployment | `docker-compose.yml` | Defines web, Hermes, sandbox, networks, env, health checks, and Traefik labels. |
| Environment template | `.env.example` | Must clearly distinguish Hermes Agent URL from local Ollama fallback. |

## Current confirmed failure

From the repo root, `npm run build` under `app/` currently fails with a TypeScript parse error:

```text
./src/components/AssistantChat.tsx:158:13
Expected a semicolon
```

The file contains a second `"use client";` and duplicate imports inside the first component's `const userMsg: ChatMessage = { ... }` object construction. This is not a runtime Hermes issue. It is a source corruption issue and must be fixed first.

Expected shape after repair:

- Exactly one `"use client";` at the top of the file.
- Exactly one default `AssistantChat` component.
- No import statements inside a function body.
- No duplicated copy of the whole component.
- `npm run build` must get past this file before deeper Hermes verification is meaningful.

## Phase 0: Prepare safely

Work from the app directory:

```bash
cd app
```

Before editing, inspect the current worktree:

```bash
git status --short
git diff --stat
```

Important: the current worktree already contains user changes. Do not run destructive commands such as `git reset --hard` or `git checkout -- .` unless the project owner explicitly asks for that. Preserve unrelated edits.

Ignore generated Python cache files while working:

```text
hermes-backend/__pycache__/
```

If those files are tracked or appear in status, remove them from source control in a deliberate cleanup commit later. They are not part of the integration design.

## Phase 1: Fix the immediate build break

Repair `src/components/AssistantChat.tsx`.

Recommended approach:

1. Open the file.
2. Remove the accidental duplicated/pasted prefix.
3. Keep one coherent component implementation.
4. Keep or re-implement the intended SSE behavior after the file compiles.
5. Run:

```bash
npm run build
```

If unsure which copy to keep, compare against the committed version:

```bash
git show HEAD:src/components/AssistantChat.tsx
```

Do not blindly overwrite the file if there are intended local changes. Use the committed version only as a reference and reapply needed changes manually.

Acceptance gate for Phase 1:

```bash
npm run build
```

The build may reveal later errors, but it must no longer fail because of a duplicated `"use client";` or duplicate component source in `AssistantChat.tsx`.

## Phase 2: Separate the two different "Hermes" concepts

The repo currently has two independent concepts that can be confused:

1. Hermes Agent service:
   - Used by `src/lib/agent.ts`.
   - URL should be `HERMES_AGENT_URL`.
   - In Docker/Dokploy this should be `http://hermes:8000`.

2. Local Ollama fallback model:
   - Used by `src/lib/llm.ts`.
   - URL should be `OLLAMA_URL`.
   - Model may be named `hermes3`, but this is not the Hermes Agent service.

Keep the naming strict:

```text
HERMES_AGENT_URL = FastAPI wrapper / Hermes Agent integration
OLLAMA_URL       = local Ollama fallback LLM endpoint
```

Production should not use `localhost:11434` for Ollama unless an Ollama service is actually running inside the same container. In Docker, `localhost` means the current container, not the VPS host.

If `FORCE_LOCAL_LLM=true` is enabled in production and there is no reachable Ollama container, unrelated NLP/JSON routes may fail and look like agent failures. Keep it disabled unless local inference is deliberately deployed.

## Phase 3: Make Hermes startup deterministic

### Current problem

`hermes-backend/Dockerfile` installs Hermes by piping the latest public installer:

```dockerfile
RUN curl -sL https://hermes-agent.nousresearch.com/install.sh | bash
```

This is fragile because the installed Hermes version and filesystem layout can change over time. The current public installer supports a root/FHS layout with command installation under `/usr/local/bin/hermes` and app code under `/usr/local/lib/hermes-agent`. Older assumptions about `/root/.hermes/hermes-agent/venv/bin` may no longer be correct.

### Better options

Preferred option: use an official pinned Hermes Docker image if it supports the required plugin/setup workflow.

If continuing with a custom Dockerfile:

- Pin Hermes to a known good commit or version instead of latest `main`.
- Verify the binary at build time.
- Do not rely on outdated PATH assumptions.
- Keep persistent data separate from installed code.
- Fail the image build if Hermes cannot be executed.

Example pattern:

```dockerfile
ARG HERMES_COMMIT=<known-good-commit>
RUN curl -sL https://hermes-agent.nousresearch.com/install.sh | bash -s -- --commit "$HERMES_COMMIT" --skip-setup
RUN which hermes
RUN hermes --help
```

Verify the exact installer flags against the deployed installer version before committing this. The public installer has changed over time.

### Data volume

Hermes Docker documentation describes persistent state under `/opt/data` for the official image. The current custom container uses:

```yaml
volumes:
  - hermes-data:/root/.hermes
```

This can work for a custom install, but the path must match the actual install/runtime layout. Do not mount over the Hermes installation directory. Mount only the state/data directory.

If migrating from `/root/.hermes` to `/opt/data`, back up the named volume first. Do not delete the production `hermes-data` volume until you have a rollback plan.

## Phase 4: Replace raw Python "skills" with a real Hermes plugin

### Current problem

The Dockerfile copies:

```dockerfile
COPY sandbox_tools.py /root/.hermes/skills/sandbox_tools.py
COPY db_tools.py /root/.hermes/skills/db_tools.py
```

This is not enough to make the functions callable by Hermes as tools. Hermes custom tools should be registered through its plugin system or another documented tool integration. A real plugin needs metadata, schemas, registration code, and enabled state.

### Build a Calmant plugin

Create a plugin named something like `calmant`.

Expected plugin capabilities:

- `calmant_get_tasks`
- `calmant_create_task`
- `calmant_create_browser_session`
- `calmant_browser_navigate`
- `calmant_browser_extract`
- `calmant_browser_act`
- `calmant_browser_screenshot`
- `calmant_close_browser_session`

Do not expose a `user_id` argument to the model as a trusted parameter. The user identity must come from the wrapper/request context. If the tool receives a user id from the model, reject it or ignore it.

Recommended plugin structure:

```text
calmant/
  plugin.yaml
  __init__.py
  schemas.py
  tools.py
```

Each tool handler should:

- Validate inputs.
- Call the internal API or sandbox service.
- Return a JSON string.
- Catch expected downstream errors and return a structured failure object.
- Never leak service secrets.
- Never let the model select arbitrary internal URLs.

### Internal data tool design

The existing `db_tools.py` now calls the Next.js internal API:

```text
WEB_URL=http://web:3000
INTERNAL_API_SECRET=<secret>
GET/POST /api/internal/hermes/tasks
```

This is the right architecture direction because it keeps Prisma/database access in the web app instead of embedding database logic inside Hermes tools.

However, replace:

```text
INTERNAL_API_SECRET=${BETTER_AUTH_SECRET}
```

with a dedicated service secret:

```text
HERMES_INTERNAL_API_SECRET=<separate random secret>
```

Using `BETTER_AUTH_SECRET` as an internal bearer token couples unrelated security boundaries. If one side leaks, the other becomes compromised.

### Internal API hardening

Inspect and harden `src/app/api/internal/hermes/tasks/route.ts`:

- Authenticate with `HERMES_INTERNAL_API_SECRET`.
- Validate request body with a schema.
- Enforce that `userId` comes from the wrapper/tool context, not from free-form model text.
- Limit created task title/body length.
- Validate `estimatedMins`.
- Allow an explicit deadline only after validation.
- Log a request id and tool name.
- Return structured JSON errors.

## Phase 5: Fix sandbox tool wiring and security

### Definite route mismatch

Current tool draft:

```python
requests.get(f"{SANDBOX_URL}/session/{session_id}/extract")
```

Current sandbox server:

```text
POST /session/:id/extract
```

Fix the tool to call `POST`, not `GET`.

### Add missing wrappers

If Hermes is expected to operate the browser, expose wrappers for the sandbox routes that already exist:

- session creation
- navigation
- extraction
- action/click/type behavior
- screenshot
- close session

### Do not publicly expose sandbox by default

The current compose file has Traefik labels that can expose sandbox under:

```text
https://calmant.aaaryan.space/sandbox-api
```

A browser automation API exposed to the internet is high risk. It can become an SSRF, scraping, credential, or resource-exhaustion endpoint.

Preferred production posture:

- Keep `sandbox` reachable only from internal Docker networks.
- Let Hermes call `http://sandbox:4000`.
- Do not publish sandbox through Traefik.

If public exposure is absolutely required:

- Add authentication.
- Add rate limits.
- Validate target URL schemes.
- Block private/internal IP ranges unless explicitly needed.
- Add session TTLs.
- Limit page text size and screenshot size.
- Log caller identity and session id.

## Phase 6: Fix the Hermes wrapper

The wrapper is `hermes-backend/server.py`.

### Current problems

1. `/health` only proves FastAPI is alive. It does not prove Hermes works.
2. `ensure_profile()` runs on every request.
3. Profile creation errors are ignored.
4. The wrapper relies on `HERMES_PROFILE` instead of explicit CLI profile selection.
5. `subprocess.run()` is blocking inside an async FastAPI endpoint.
6. The web timeout and wrapper timeout are both around 90 seconds, so they can race.
7. Hermes subprocess errors are returned as a successful HTTP 200 response with text like `"Agent Error: ..."`.
8. `stderr` is not surfaced well enough for debugging.

### Use explicit profile selection

Prefer a documented CLI shape like:

```bash
hermes chat -p <profile-name> -q "<message>"
```

or whatever the deployed `hermes chat --help` confirms. Do not rely on `HERMES_PROFILE` unless the installed Hermes version explicitly documents it.

The Hermes CLI docs show profile selection through `-p/--profile`, including commands like:

```bash
hermes chat -p coder -q "hello"
```

### Make profile setup idempotent

Profiles are separate Hermes state directories. Use one profile per application user only if the product needs separate long-lived agent memory per user. If the app only needs stateless responses with Calmant context injected each request, use a shared locked-down profile and pass user context through the prompt/tools.

If using per-user profiles:

- Sanitize profile names.
- Use a creation lock to prevent concurrent creation races.
- Create from a known configured template profile if supported.
- Enable the Calmant plugin for each profile.
- Keep profile creation out of the hot path where possible.

### Use async subprocess execution

Replace blocking `subprocess.run()` with `asyncio.create_subprocess_exec()` or run blocking calls in a worker thread. Add a concurrency limit.

Sketch:

```python
sem = asyncio.Semaphore(int(os.getenv("HERMES_MAX_CONCURRENT", "2")))

async with sem:
    proc = await asyncio.create_subprocess_exec(
        "hermes", "chat", "-p", profile_name, "-q", req.message,
        stdout=asyncio.subprocess.PIPE,
        stderr=asyncio.subprocess.PIPE,
        env=env,
    )
    stdout, stderr = await asyncio.wait_for(
        proc.communicate(),
        timeout=HERMES_TIMEOUT_SECONDS,
    )
```

### Return real HTTP errors

If Hermes exits non-zero, return a non-2xx status:

```json
{
  "error": "hermes_subprocess_failed",
  "profile": "calmant_user_<id>",
  "exitCode": 1,
  "stderrTail": "..."
}
```

Do not wrap this as a successful `"reply"`.

This lets `src/lib/agent.ts` mark `AgentRun.status = "failed"` correctly.

### Add detailed health

Keep `/health` simple for Docker:

```json
{ "status": "ok" }
```

Add `/health/detailed` for debugging:

- `which hermes`
- `hermes version` or `hermes --help`
- provider key presence, redacted
- profile directory/check
- Calmant plugin enabled
- can reach `WEB_URL`
- can reach `SANDBOX_URL`

Do not put secrets in the health response.

### Timeout policy

Do not use identical timeouts at every layer.

Suggested starting point:

```text
Hermes subprocess timeout: 75s
FastAPI request timeout:   80s
Next.js fetch timeout:     95s or 120s
Browser UI timeout:        slightly above Next.js if needed
```

The inner layer should fail first and return a structured error. The outer layer should not abort first with a generic timeout.

## Phase 7: Consider using the official Hermes API server

Hermes provides an OpenAI-compatible API server with endpoints such as:

- `/health`
- `/v1/chat/completions`
- `/v1/responses`
- `/v1/runs`

This may be cleaner than wrapping the CLI with FastAPI.

Do not switch blindly. First answer these design questions:

1. Does the API server support the required profile isolation model?
2. Can one container safely serve multiple user profiles?
3. How are custom plugins enabled for API requests?
4. Can streaming events be consumed directly by the Next.js route?
5. How will the API key be protected inside Docker/Dokploy?

If the answers are acceptable, replace the custom `/chat` subprocess wrapper with a small adapter that calls Hermes API server endpoints. This should improve streaming, observability, and timeout behavior.

If profile-per-user plus API server is not straightforward, keep the wrapper but fix it properly.

## Phase 8: Fix response delivery and SSE

### Current delivery behavior

`agentReplyStream()` does not stream actual Hermes tokens. It starts one HTTP request to the wrapper, emits periodic `thinking` events every few seconds, and then emits one final response when Hermes completes.

This is acceptable as a temporary status stream, but it should not be treated as real token streaming.

### Server event contract

Define a stable SSE event shape:

```json
{ "type": "status", "runId": "...", "message": "Thinking..." }
{ "type": "delta", "runId": "...", "content": "partial text" }
{ "type": "final", "runId": "...", "content": "complete text" }
{ "type": "error", "runId": "...", "error": "..." }
{ "type": "done", "runId": "..." }
```

Even if true token streaming is not implemented yet, use `status`, `final`, `error`, and `done`.

### Next.js SSE headers

In `src/app/api/agent/chat/route.ts`, use headers like:

```ts
{
  "Content-Type": "text/event-stream; charset=utf-8",
  "Cache-Control": "no-cache, no-transform",
  "Connection": "keep-alive",
  "X-Accel-Buffering": "no"
}
```

The `X-Accel-Buffering` header helps avoid buffering in proxy layers that understand it. Traefik behavior still needs to be verified in Dokploy.

### Client parser must handle chunk boundaries

Do not assume each `reader.read()` returns full SSE events. JSON can be split across chunks.

Use a buffer:

```ts
const decoder = new TextDecoder();
let buffer = "";

while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  buffer += decoder.decode(value, { stream: true });
  const events = buffer.split("\n\n");
  buffer = events.pop() ?? "";

  for (const eventText of events) {
    const dataLine = eventText
      .split("\n")
      .find((line) => line.startsWith("data: "));

    if (!dataLine) continue;

    const payload = JSON.parse(dataLine.slice("data: ".length));
    // handle payload.type
  }
}

buffer += decoder.decode();
```

This is mandatory. The current parser can lose or corrupt events under normal network chunking.

## Phase 9: Dokploy/VPS deployment requirements

### Compose path

The relevant compose file is:

```text
app/docker-compose.yml
```

In Dokploy, confirm the compose project points at this file and not the repo root by mistake.

### Environment variables

Dokploy stores Docker Compose environment variables in a `.env` file near the compose file and supports `${VAR}` substitution. Variables are not magically available to containers unless the compose file passes them with `env_file:` or `environment:`.

The current compose file uses `env_file: .env` for the web service and explicit `environment:` entries for Hermes. Keep that model, but make the secret boundaries cleaner.

Recommended production variables:

| Variable | Service | Required | Notes |
| --- | --- | --- | --- |
| `BETTER_AUTH_SECRET` | web | yes | Auth/session secret only. Do not reuse as Hermes bearer token. |
| `BETTER_AUTH_URL` | web | yes | Should be the public app URL, e.g. `https://calmant.aaaryan.space`. |
| `DATABASE_URL` | web, hermes if needed | yes | Prefer only web if Hermes tools use internal API instead of direct DB. |
| `DIRECT_URL` | web/prisma if needed | maybe | Depends on Prisma setup. |
| `OPENROUTER_API_KEY` | hermes | yes | Required if Hermes uses OpenRouter provider. |
| `GEMINI_API_KEY` | web | maybe | Used by existing non-Hermes LLM paths. |
| `HERMES_AGENT_URL` | web | yes | In Dokploy Compose: `http://hermes:8000`. |
| `HERMES_INTERNAL_API_SECRET` | web, hermes | yes | New dedicated bearer secret for internal Hermes tool API. |
| `WEB_URL` | hermes | yes | In Compose: `http://web:3000`. |
| `SANDBOX_URL` | hermes | yes | In Compose: `http://sandbox:4000`. |
| `OLLAMA_URL` | web | no | Only if a real Ollama service is deployed. |
| `FORCE_LOCAL_LLM` | web | no | Keep false unless Ollama is intentionally deployed. |

Update compose to use:

```yaml
HERMES_INTERNAL_API_SECRET: ${HERMES_INTERNAL_API_SECRET}
```

instead of deriving the internal API token from `BETTER_AUTH_SECRET`.

### Networks

Current service communication should be:

```text
web     -> hermes  via Docker service name http://hermes:8000
hermes  -> web     via Docker service name http://web:3000
hermes  -> sandbox via Docker service name http://sandbox:4000
Traefik -> web     via dokploy-network
```

Hermes does not need to be public. Sandbox does not need to be public for the Hermes use case.

If using Dokploy's Domains UI, verify whether Dokploy injects Traefik labels and networks automatically. Do not mix manual Traefik labels and Dokploy-generated domain labels unless you know exactly what final Compose config is produced.

Use Dokploy's "Preview Compose" feature before redeploying.

### Public routing

Preferred public exposure:

```text
https://calmant.aaaryan.space -> web only
```

Avoid public exposure:

```text
hermes:8000
sandbox:4000
/sandbox-api
```

If existing manual Traefik labels expose sandbox, remove them unless a secured public sandbox API is a deliberate product requirement.

### VPS resource expectations

Hermes plus Playwright/browser sandbox can be memory-heavy. For a stable VPS deployment, start with at least:

```text
2 CPU cores
4 GB RAM
```

If browser sessions run concurrently, increase memory or add strict session/concurrency limits.

## Phase 10: Improve observability

Add a correlation id / run id through the whole path:

```text
AssistantChat request
  -> /api/agent/chat
  -> AgentRun.id
  -> Hermes wrapper request id
  -> Hermes profile
  -> tool calls
  -> internal API / sandbox logs
```

At minimum, log:

- `AgentRun.id`
- authenticated app `userId`
- Hermes profile name
- wrapper request id
- command exit code
- timeout vs non-timeout failure
- stderr tail
- tool name
- sandbox session id

Do not log:

- OpenRouter API key
- auth cookies
- internal bearer token
- full user secrets or private memory content unless deliberately redacted

## Phase 11: Tests and verification

### Local static gates

Run from `app/`:

```bash
npm run build
npm run lint
```

If lint is not configured or fails on old unrelated issues, document the exact unrelated failures and continue only if the build is clean.

### Compose validation

Run:

```bash
docker compose config
```

On the current local workstation, Docker daemon access may not be available. That does not prove the VPS deployment is broken. The authoritative checks should run on the Dokploy VPS or through Dokploy's terminal/log UI.

### Dokploy/VPS smoke checks

On the VPS or in Dokploy terminal:

```bash
docker compose ps
docker compose logs -f hermes
docker compose logs -f web
docker compose logs -f sandbox
```

Inside the Hermes container:

```bash
which hermes
hermes --help
hermes chat --help
curl -sf http://web:3000/api/health || true
curl -sf http://sandbox:4000/health || true
```

Inside the web container:

```bash
node -e "fetch(process.env.HERMES_AGENT_URL + '/health').then(r => console.log(r.status)).catch(e => { console.error(e); process.exit(1) })"
```

Against the Hermes wrapper:

```bash
curl -sS http://hermes:8000/health
curl -sS http://hermes:8000/health/detailed
```

Direct chat smoke test from inside the Docker network:

```bash
curl -sS -X POST http://hermes:8000/chat \
  -H 'content-type: application/json' \
  -d '{"user_id":"<real-user-id>","message":"Reply with a one sentence status check."}'
```

Tool smoke test after plugin wiring:

```bash
curl -sS -X POST http://hermes:8000/chat \
  -H 'content-type: application/json' \
  -d '{"user_id":"<real-user-id>","message":"List my current active tasks using the Calmant task tool."}'
```

Expected result:

- Hermes calls the Calmant task tool.
- The internal API authenticates the request.
- The response includes real tasks for that user.
- No tasks from other users are exposed.
- `AgentRun` status becomes `completed`.

### Browser chat verification

Use a real authenticated browser session. The existing `test-e2e.js` is likely stale because it sends `x-test-user-id`, while the app auth path expects a real Better Auth session.

Browser acceptance criteria:

- Message sends successfully.
- UI shows status while waiting.
- Final assistant response appears exactly once.
- No "No response received" caused by SSE chunk splitting.
- Network tab shows `text/event-stream`.
- Server logs contain one `AgentRun` for the request.
- Errors appear as user-readable messages and are recorded as failed runs.

## Phase 12: Other integrations that can conflict

### Telegram

Telegram uses the same `agentReply()` path. If Hermes is broken, Telegram responses break too.

Risk:

- Long polling inside the web process can duplicate if multiple web replicas are started.

Recommendation:

- In Dokploy, run one web replica if using polling.
- For multiple replicas, move Telegram to webhook mode or a dedicated worker.

### WhatsApp

WhatsApp also uses the same agent path.

Risks:

- It may acknowledge the webhook before long-running agent work finishes.
- Without a durable queue, failures can be lost.
- Missing webhook signature verification can allow spoofed requests and cost abuse.

Recommendation:

- Verify Meta webhook signatures.
- Queue incoming messages if responses are slow.
- Log and retry failed sends.

### Local LLM / Gemini paths

`src/lib/llm.ts` can use Gemini or local Ollama fallback for non-Hermes features. Failures there can look like general AI failures but are separate from Hermes Agent.

Recommendation:

- Keep Gemini/Ollama fallback paths clearly named.
- Do not call the local Ollama model "Hermes integration" in logs or UI.
- Disable forced local LLM mode unless the service exists in Docker.

### Prisma and internal APIs

The intended design should be:

```text
Hermes tool -> internal HTTP API -> Prisma -> database
```

not:

```text
Hermes tool -> direct database writes
```

This keeps auth, schema validation, and business rules centralized in the web app.

## If the primary fix does not work

Use this failure table.

| Symptom | Most likely cause | What to do |
| --- | --- | --- |
| `npm run build` still fails in `AssistantChat.tsx` | File still has duplicated pasted source or invalid SSE edit | Open the file and verify one `"use client"`, one import block, one component. |
| Hermes container is healthy but chat fails | `/health` only checks FastAPI, not Hermes CLI | Add `/health/detailed`; run `which hermes`, `hermes chat --help`, and direct CLI smoke tests inside the container. |
| Hermes says profile missing or misconfigured | Profile creation ignored errors or plugin not enabled per profile | Stop creating profiles blindly per request; create/configure a template profile and clone or initialize deterministically. |
| Tools are never called | Raw Python files are not registered tools | Implement a real Hermes plugin and enable it for the active profile. |
| Task tool returns unauthorized | Secret mismatch | Use one `HERMES_INTERNAL_API_SECRET` value in both web and Hermes services. |
| Task tool returns another user's data | User identity is model-controlled or not enforced | Derive user id from wrapper request context and enforce it server-side. |
| Sandbox extraction fails | Tool calls `GET` but server expects `POST` | Change the tool to POST and test directly with curl. |
| Browser assistant hangs then fails | Timeout race or proxy buffering | Stagger timeouts, add status events, add no-buffer headers, verify Traefik behavior. |
| User sees "No response received" | Client parser lost a split SSE event | Implement buffered SSE parsing. |
| Works locally but not in Dokploy | Env variables or networks differ | Use Preview Compose, inspect final env/network config, test from inside containers. |
| Dokploy routes wrong service | Manual labels conflict with Domains UI | Choose either Dokploy Domains UI or manual Traefik labels; inspect final Compose. |
| VPS becomes unstable | Playwright/Hermes memory pressure | Reduce concurrency, add session TTLs, increase RAM, or split services. |

Emergency fallback:

- Keep the UI alive by bypassing Hermes and returning a read-only Gemini response through the existing LLM path.
- Do not enable task creation, browser control, or other actions in fallback mode.
- Clearly label fallback responses as non-action-capable.

This fallback is for availability only. It does not fix the Hermes integration.

## Suggested implementation order

1. Fix `AssistantChat.tsx` so the app builds.
2. Add robust SSE parsing and event types.
3. Add structured errors in `src/lib/agent.ts` and `/api/agent/chat`.
4. Add `/health/detailed` to `hermes-backend/server.py`.
5. Fix Hermes CLI invocation to use explicit profile selection.
6. Make subprocess execution async and return non-2xx errors.
7. Replace `BETTER_AUTH_SECRET` reuse with `HERMES_INTERNAL_API_SECRET`.
8. Convert `db_tools.py` and `sandbox_tools.py` into a real Hermes plugin.
9. Fix sandbox extract route method and add missing wrappers.
10. Remove or secure public sandbox routing.
11. Pin Hermes installation/image version.
12. Verify on Dokploy using service logs, terminal, and Preview Compose.
13. Run authenticated browser smoke tests.
14. Run Telegram/WhatsApp smoke tests only after the browser path is stable.

## Done criteria

The integration is fixed when all of these are true:

- `npm run build` succeeds.
- The web container starts in Dokploy.
- The Hermes container starts in Dokploy.
- `/health/detailed` proves Hermes CLI and downstream service reachability.
- A direct wrapper `/chat` request returns a valid answer.
- Hermes can call the Calmant task tool and only access the correct user's data.
- Browser chat receives a final response reliably through SSE.
- Timeout failures are structured and recorded as failed `AgentRun` records.
- Sandbox is not publicly exposed unless secured.
- Telegram and WhatsApp do not regress.
- The deployment does not require local machine assumptions such as `localhost` for cross-container services.

## Reference links

Use official documentation as the source of truth when confirming exact Hermes and Dokploy behavior:

- Hermes CLI docs: https://hermes-agent.nousresearch.com/docs/user-guide/cli
- Hermes profiles docs: https://hermes-agent.nousresearch.com/docs/user-guide/profiles/
- Hermes environment variables: https://hermes-agent.nousresearch.com/docs/reference/environment-variables
- Hermes API server: https://hermes-agent.nousresearch.com/docs/user-guide/features/api-server/
- Hermes Docker docs: https://hermes-agent.nousresearch.com/docs/user-guide/docker/
- Hermes plugin guide: https://hermes-agent.nousresearch.com/docs/guides/build-a-hermes-plugin/
- Dokploy Docker Compose docs: https://docs.dokploy.com/docs/core/docker-compose
- Dokploy variables docs: https://docs.dokploy.com/docs/core/variables
- Dokploy Docker Compose domains docs: https://docs.dokploy.com/docs/core/docker-compose/domains
- Dokploy Docker Compose utilities docs: https://docs.dokploy.com/docs/core/docker-compose/utilities
