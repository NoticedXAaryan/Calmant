import { CommandCenterService } from "./command-center-service";
import { ReportService } from "./report-service";
import { MemoryRecordService } from "./memory-record-service";
import { prisma } from "../prisma";
import { ApprovalService } from "../agent-runtime/approval-service";

export class TelegramProductivityService {
  static async formatToday(userId: string): Promise<string> {
    const today = await CommandCenterService.getToday(userId);
    let msg = `📅 **Today**\n\n`;
    
    if (today.activeGoals.length > 0) {
      msg += `🎯 Active Goals:\n`;
      for (const g of today.activeGoals) {
        msg += `• ${g.title}\n`;
      }
      msg += `\n`;
    }

    if (today.activeProjectCells.length > 0) {
      msg += `🚀 Active Missions:\n`;
      for (const p of today.activeProjectCells) {
        msg += `• ${p.title} (${p.status})\n`;
      }
      msg += `\n`;
    }

    if (today.approvals.length > 0) {
      msg += `⏳ Approvals Needed: ${today.approvals.length}\n\n`;
    }

    if (today.blockers.length > 0) {
      msg += `🛑 Blockers:\n`;
      for (const b of today.blockers) {
        msg += `• ${b.title}\n`;
      }
      msg += `\n`;
    }

    if (!today.activeGoals.length && !today.activeProjectCells.length) {
      msg += `All clear! Use /new to create a new goal.`;
    }

    return msg.trim();
  }

  static async formatStatus(userId: string): Promise<string> {
    const cells = await prisma.projectCell.findMany({
      where: { userId, status: { in: ['active', 'running'] } },
      include: { tasks: true }
    });

    if (!cells.length) {
      return "🟢 No active missions currently running.";
    }

    let msg = `🟢 **Status**\n\n`;
    for (const c of cells) {
      const completed = c.tasks.filter((t) => t.status === 'completed').length;
      msg += `• ${c.title} [${completed}/${c.tasks.length} tasks]\n`;
    }
    return msg;
  }

  static async formatApprovals(userId: string): Promise<string> {
    const approvals = await prisma.approvalRequest.findMany({
      where: { userId, status: 'pending' },
      orderBy: { createdAt: 'desc' }
    });

    if (!approvals.length) return "✅ No pending approvals.";

    let msg = `⏳ **Pending Approvals:**\n\n`;
    for (const app of approvals) {
      msg += `• ${app.title} (ID: \`${app.id}\`)\n`;
    }
    return msg;
  }

  static async formatHelp(): Promise<string> {
    return `🤖 **Company OS Commands**

/today - View today's summary
/status - Check active missions
/report now - Generate immediate report
/approvals - List pending approvals
/memories - List saved memories
/review - Review pending memories
/new [objective] - Create a new goal
/pause [id] - Pause a goal
/resume [id] - Resume a goal
/help - Show this message`;
  }
}
