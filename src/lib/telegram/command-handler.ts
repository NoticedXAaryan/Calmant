import TelegramBot from "node-telegram-bot-api";
import { prisma } from "../prisma";
import { TelegramProductivityService } from "../services/telegram-productivity-service";
import { CommandCenterService } from "../services/command-center-service";
import { ReportService } from "../services/report-service";
import { MemoryRecordService } from "../services/memory-record-service";
import { ApprovalService } from "../agent-runtime/approval-service";
import { ExecutionOrchestrator } from "../execution/orchestrator";
import { ExecutionLoop } from "../execution/execution-loop";
import { MemoryManager } from "../memory/memory-manager";
import { SoulReader } from "../memory/soul-reader";

export class CommandHandler {
  static async handle(bot: TelegramBot, msg: import("node-telegram-bot-api").Message, userId: string, text: string) {
    const chatId = msg.chat.id;

    if (text === "/today") {
      const todayMsg = await TelegramProductivityService.formatToday(userId);
      await bot.sendMessage(chatId, todayMsg, { parse_mode: "Markdown" });
      return true;
    }

    if (text === "/status") {
      const statusMsg = await TelegramProductivityService.formatStatus(userId);
      await bot.sendMessage(chatId, statusMsg, { parse_mode: "Markdown" });
      return true;
    }

    if (text === "/approvals") {
      const appMsg = await TelegramProductivityService.formatApprovals(userId);
      await bot.sendMessage(chatId, appMsg, { parse_mode: "Markdown" });
      return true;
    }

    if (text === "/help") {
      const helpMsg = `🤖 *Calmant Command Center*

*Goals & Execution*
/new <title> — Create a new goal
/run <goal-id> — Start execution loop for a goal
/loop — Show active execution loop status
/pause <id> — Pause a goal
/resume <id> — Resume a goal

*Sandbox & Browser*
/browser <url> — Navigate sandbox to a URL
/screenshot — Capture current browser view

*Memory*
/remember <fact> — Store a memory
/memories — List your memories
/soul — Show your persona summary

*Reports*
/today — Today's briefing
/status — Current system status
/report now — Generate morning report
/approvals — Pending approvals
/approve <id> — Approve a request
/reject <id> — Reject a request`;

      await bot.sendMessage(chatId, helpMsg, { parse_mode: "Markdown" });
      return true;
    }

    if (text === "/report now") {
      await bot.sendMessage(chatId, "Generating morning report...");
      await ReportService.generateMorningReport(userId);
      return true;
    }

    // ── Goal & Execution Commands ────────────────────────

    if (text.startsWith("/new ")) {
      const title = text.replace("/new ", "").trim();
      const res = await CommandCenterService.createObjective(userId, title, title);
      await bot.sendMessage(chatId, `✅ Goal created: *${res.goal.title}*\n\nUse \`/run ${res.goal.id.slice(-8)}\` to start the execution loop.`, { parse_mode: "Markdown" });
      return true;
    }

    if (text.startsWith("/run ")) {
      const idSuffix = text.replace("/run ", "").trim();

      // Find the goal by ID suffix
      const goals = await prisma.goal.findMany({
        where: { userId, status: "active" },
        include: { projectCells: { select: { id: true, status: true } } },
      });

      const goal = goals.find(g => g.id.endsWith(idSuffix));
      if (!goal) {
        await bot.sendMessage(chatId, `❌ No active goal found matching \`${idSuffix}\``);
        return true;
      }

      // Check if there's already an active project cell
      const activeCell = goal.projectCells.find((c: any) => c.status === "active");
      if (activeCell) {
        await bot.sendMessage(chatId, `⚡ Goal already has an active execution loop.`);
        return true;
      }

      await bot.sendMessage(chatId, `🚀 Starting execution loop for: *${goal.title}*`, { parse_mode: "Markdown" });

      // Create project cell and start execution
      const cell = await prisma.projectCell.create({
        data: {
          userId,
          goalId: goal.id,
          title: goal.title,
          objective: goal.description || goal.title,
          status: "active",
        },
      });

      const state = await ExecutionOrchestrator.startGoal(cell.id, userId);
      await bot.sendMessage(chatId, `✅ Execution started — Phase: *${state.phase}*\n\nUse \`/loop\` to check progress.`, { parse_mode: "Markdown" });
      return true;
    }

    if (text === "/loop") {
      // Find active project cells
      const cells = await prisma.projectCell.findMany({
        where: { userId, status: "active" },
        include: { goal: { select: { title: true } } },
        take: 5,
      });

      if (cells.length === 0) {
        await bot.sendMessage(chatId, "No active execution loops. Create a goal with `/new` and start it with `/run`.");
        return true;
      }

      let msg = "🔄 *Active Execution Loops*\n\n";
      for (const cell of cells) {
        const state = await ExecutionLoop.loadState(cell.id);
        if (state) {
          msg += `*${cell.goal?.title || cell.title}*\n`;
          msg += `Phase: ${state.phase.toUpperCase()} | Iteration: ${state.iterationCount}/${state.maxIterations}\n`;
          msg += `Research: ${state.researchData.length} | Artifacts: ${state.artifacts.length}\n`;
          if (state.loopBackReasons.length > 0) msg += `⟳ Loop-backs: ${state.loopBackReasons.length}\n`;
          msg += "\n";
        }
      }

      await bot.sendMessage(chatId, msg, { parse_mode: "Markdown" });
      return true;
    }

    if (text.startsWith("/pause ")) {
      const id = text.replace("/pause ", "").trim();
      await CommandCenterService.pause(userId, id);
      await bot.sendMessage(chatId, `Goal paused.`);
      return true;
    }

    if (text.startsWith("/resume ")) {
      const id = text.replace("/resume ", "").trim();
      await CommandCenterService.resume(userId, id);
      await bot.sendMessage(chatId, `Goal resumed.`);
      return true;
    }

    // ── Sandbox & Browser Commands ───────────────────────

    if (text.startsWith("/browser ")) {
      const url = text.replace("/browser ", "").trim();
      if (!url.startsWith("http")) {
        await bot.sendMessage(chatId, "Please provide a full URL (starting with http:// or https://)");
        return true;
      }

      const sandboxUrl = process.env.SANDBOX_URL || "http://localhost:4000";

      try {
        // Get or create session
        let activeRes = await fetch(`${sandboxUrl}/sessions/active`);
        let activeData = await activeRes.json();
        let sessionId = activeData.sessionId;

        if (!sessionId) {
          const createRes = await fetch(`${sandboxUrl}/session`, { method: "POST" });
          const createData = await createRes.json();
          sessionId = createData.sessionId;
        }

        // Navigate
        await bot.sendMessage(chatId, `🌐 Navigating to: ${url}`);
        const navRes = await fetch(`${sandboxUrl}/session/${sessionId}/navigate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url }),
        });
        const navData = await navRes.json();

        await bot.sendMessage(chatId, `✅ *${navData.title || "Page loaded"}*\n\n${navData.text?.substring(0, 500) || ""}`, { parse_mode: "Markdown" });

        // Auto-screenshot
        const ssRes = await fetch(`${sandboxUrl}/session/${sessionId}/screenshot`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });
        const ssData = await ssRes.json();

        if (ssData.filepath) {
          // Send screenshot as photo if available
          const { sendTelegramPhoto } = await import("./telegram-service");
          // The sandbox stores artifacts locally — for now just notify
          await bot.sendMessage(chatId, `📸 Screenshot saved: ${ssData.filename}`);
        }
      } catch (err: any) {
        await bot.sendMessage(chatId, `❌ Browser error: ${err.message}`);
      }
      return true;
    }

    if (text === "/screenshot") {
      const sandboxUrl = process.env.SANDBOX_URL || "http://localhost:4000";

      try {
        const activeRes = await fetch(`${sandboxUrl}/sessions/active`);
        const activeData = await activeRes.json();

        if (!activeData.sessionId) {
          await bot.sendMessage(chatId, "No active browser session.");
          return true;
        }

        const ssRes = await fetch(`${sandboxUrl}/session/${activeData.sessionId}/screenshot`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });
        const ssData = await ssRes.json();

        await bot.sendMessage(chatId, `📸 Screenshot captured: ${ssData.filename || "screenshot.png"}`);
      } catch (err: any) {
        await bot.sendMessage(chatId, `❌ Screenshot failed: ${err.message}`);
      }
      return true;
    }

    // ── Memory Commands (wired to soul system) ───────────

    if (text === "/memories") {
      const memories = await MemoryRecordService.list(userId);
      if (memories.length === 0) {
        await bot.sendMessage(chatId, "You have no saved memories.");
        return true;
      }
      let msgText = "**Your Memories:**\n\n";
      for (const m of memories.slice(0, 10)) {
        msgText += `• ${m.content} (Type: ${m.type})\n`;
      }
      if (memories.length > 10) msgText += `\n...and ${memories.length - 10} more.`;
      await bot.sendMessage(chatId, msgText, { parse_mode: "Markdown" });
      return true;
    }

    if (text.startsWith("/remember ")) {
      const content = text.replace("/remember ", "").trim();

      // Write to both Postgres and soul memory system
      await MemoryRecordService.create({
        userId, type: "fact", content, confidence: 1.0
      });
      await MemoryManager.addMemory({
        content,
        category: "corrections",
        confidence: 1.0,
        source: "owner_telegram",
      });

      await bot.sendMessage(chatId, `✅ Remembered (stored in both DB and soul memory).`);
      return true;
    }

    if (text === "/soul") {
      try {
        const snapshot = SoulReader.readSnapshot();
        let msg = `🧠 *Your Soul*\n\n`;
        msg += `*Name:* ${snapshot.identity.name}\n`;
        msg += `*Personality:* ${snapshot.identity.personalityTraits.join(", ")}\n`;
        msg += `*Communication:* ${snapshot.identity.communicationStyle.join(", ")}\n\n`;
        msg += `*Goals:* ${snapshot.goals.map((g: any) => g.title).join(", ") || "None"}\n`;
        msg += `*Skills:* ${snapshot.skills.length} registered\n`;

        await bot.sendMessage(chatId, msg, { parse_mode: "Markdown" });
      } catch (err: any) {
        await bot.sendMessage(chatId, "Soul files not initialized yet. Complete onboarding first.");
      }
      return true;
    }

    // ── Approval Commands ────────────────────────────────

    if (text.startsWith("/approve ")) {
      const id = text.replace("/approve ", "").trim();
      await ApprovalService.resolveApproval(id, "approve", userId);
      await bot.sendMessage(chatId, `✅ Approved.`);
      return true;
    }

    if (text.startsWith("/reject ")) {
      const id = text.replace("/reject ", "").trim();
      await ApprovalService.resolveApproval(id, "reject", userId);
      await bot.sendMessage(chatId, `❌ Rejected.`);
      return true;
    }

    // fallback to old handling in update-router if return false
    return false;
  }
}
