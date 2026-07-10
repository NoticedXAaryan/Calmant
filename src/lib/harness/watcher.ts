import { PrismaClient } from "@prisma/client";
import * as cron from "node-cron";
import { AgentPipeline } from "./pipeline";
import { mcpClient } from "../tools/mcp";

const prisma = new PrismaClient();
const pipeline = new AgentPipeline();

export class WatcherEngine {
  private activeJobs: Map<string, cron.ScheduledTask> = new Map();

  constructor() {
    // Optionally start the polling loop for database/webhook watchers
  }

  async initialize() {
    console.log("[WatcherEngine] Initializing...");
    const watchers = await prisma.watcher.findMany({
      where: { enabled: true },
    });

    for (const watcher of watchers) {
      if (watcher.type === "schedule") {
        this.scheduleWatcher(watcher);
      }
    }
  }

  private scheduleWatcher(watcher: any) {
    if (this.activeJobs.has(watcher.id)) {
      this.activeJobs.get(watcher.id)?.stop();
    }

    try {
      const task = cron.schedule(watcher.target, async () => {
        await this.executeWatcher(watcher.id);
      });
      this.activeJobs.set(watcher.id, task);
      console.log(`[WatcherEngine] Scheduled watcher ${watcher.name} with cron ${watcher.target}`);
    } catch (error) {
      console.error(`[WatcherEngine] Failed to schedule watcher ${watcher.id}:`, error);
    }
  }

  async executeWatcher(watcherId: string) {
    const watcher = await prisma.watcher.findUnique({
      where: { id: watcherId },
    });

    if (!watcher || !watcher.enabled) return;

    console.log(`[WatcherEngine] Executing watcher ${watcher.name}...`);

    try {
      // 1. Evaluate Condition if any
      if (watcher.condition) {
        // Mock condition evaluation (could use tools or LLM)
        console.log(`[WatcherEngine] Evaluating condition for ${watcher.name}`);
      }

      // 2. Perform Action
      let result: any = null;
      
      const run = await prisma.agentRun.create({
        data: {
          userId: watcher.userId,
          prompt: `Watcher ${watcher.name} triggered`,
          status: "running",
          channel: "watcher",
        }
      });

      if (watcher.action === "spawn_agent") {
        const payload = watcher.actionPayload as { prompt: string };
        if (payload && payload.prompt) {
           console.log(`[WatcherEngine] Spawning agent for ${watcher.name}`);
           result = await pipeline.run(payload.prompt, { cwd: process.cwd(), env: process.env as Record<string, string>, userId: watcher.userId, runId: run.id }, { apiKey: process.env.GEMINI_API_KEY || process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY || "" });
        }
      } else if (watcher.action === "run_mcp") {
        const payload = watcher.actionPayload as { server: string; tool: string; args: any };
        if (payload && payload.server && payload.tool) {
           console.log(`[WatcherEngine] Running MCP tool for ${watcher.name}`);
           result = await mcpClient.executeTool(payload, { cwd: process.cwd(), env: process.env as Record<string, string>, userId: watcher.userId, runId: run.id, toolCallId: 'watcher-tool-call' });
        }
      }

      await prisma.agentRun.update({
        where: { id: run.id },
        data: { status: "completed", response: result ? JSON.stringify(result) : "" }
      });

      // 3. Log Event
      await prisma.watcherEvent.create({
        data: {
          watcherId: watcher.id,
          status: "processed",
          result: result ? JSON.parse(JSON.stringify(result)) : null,
        },
      });

      await prisma.watcher.update({
        where: { id: watcher.id },
        data: {
          lastRunAt: new Date(),
          lastTriggeredAt: new Date(),
          lastStatus: "success",
        },
      });

    } catch (error: any) {
      console.error(`[WatcherEngine] Watcher ${watcher.name} failed:`, error);
      
      await prisma.watcherEvent.create({
        data: {
          watcherId: watcher.id,
          status: "failed",
          error: error.message,
        },
      });
      
      await prisma.watcher.update({
        where: { id: watcher.id },
        data: {
          lastRunAt: new Date(),
          lastStatus: "failed",
          lastError: error.message,
        },
      });
    }
  }

  stopAll() {
    for (const [id, task] of this.activeJobs.entries()) {
      task.stop();
    }
    this.activeJobs.clear();
  }
}

export const watcherEngine = new WatcherEngine();
