import { prisma } from "../prisma";
import { Report } from "@prisma/client";
import { TelegramService } from "./telegram-service";

export class ReportService {
  /**
   * Generates a morning report from database state.
   */
  static async generateMorningReport(userId: string): Promise<Report> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const activeGoals = await prisma.goal.findMany({
      where: { userId, status: "active" },
    });

    const pendingApprovals = await prisma.approvalRequest.findMany({
      where: { userId, status: "pending" },
    });

    const activeTasks = await prisma.projectTask.findMany({
      where: {
        projectCell: { userId },
        status: { in: ["pending", "running"] },
      },
    });

    const data = {
      type: "morning",
      activeGoalsCount: activeGoals.length,
      pendingApprovalsCount: pendingApprovals.length,
      plannedTasksCount: activeTasks.length,
      priorities: activeTasks.slice(0, 3).map((t) => t.title),
    };

    const telegramSummary = `🌅 *Morning Report*\n\n` +
      `🎯 Active Goals: ${data.activeGoalsCount}\n` +
      `📋 Planned Tasks: ${data.plannedTasksCount}\n` +
      `✅ Approvals Needed: ${data.pendingApprovalsCount}\n\n` +
      `*Top Priorities:*\n${data.priorities.map((p) => `- ${p}`).join("\n") || "None"}`;

    const report = await prisma.report.create({
      data: {
        userId,
        type: "morning",
        title: "Morning Report",
        payload: data,
        content: telegramSummary,
      },
    });

    await TelegramService.sendMessage(userId, telegramSummary, { parse_mode: "Markdown" });
    
    return prisma.report.update({
      where: { id: report.id },
      data: { status: "sent" }
    });
  }

  /**
   * Generates an evening report from database state.
   */
  static async generateEveningReport(userId: string): Promise<Report> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const completedTasks = await prisma.projectTask.findMany({
      where: {
        projectCell: { userId },
        status: "completed",
        completedAt: { gte: today },
      },
    });

    const blockedTasks = await prisma.projectTask.findMany({
      where: {
        projectCell: { userId },
        status: "blocked",
      },
    });

    const nextTasks = await prisma.projectTask.findMany({
      where: {
        projectCell: { userId },
        status: "pending",
      },
      take: 3,
    });

    const data = {
      type: "evening",
      completedTasksCount: completedTasks.length,
      blockedTasksCount: blockedTasks.length,
      completedToday: completedTasks.map((t) => t.title),
      blockers: blockedTasks.map((t) => t.title),
      nextWork: nextTasks.map((t) => t.title),
    };

    const telegramSummary = `🌙 *Evening Report*\n\n` +
      `✅ Completed Today: ${data.completedTasksCount}\n` +
      `🚧 Blocked: ${data.blockedTasksCount}\n\n` +
      `*Completed:*\n${data.completedToday.map((p) => `- ${p}`).join("\n") || "None"}\n\n` +
      `*Blockers:*\n${data.blockers.map((p) => `- ${p}`).join("\n") || "None"}\n\n` +
      `*Next Up:*\n${data.nextWork.map((p) => `- ${p}`).join("\n") || "None"}`;

    const report = await prisma.report.create({
      data: {
        userId,
        type: "evening",
        title: "Evening Report",
        payload: data,
        content: telegramSummary,
      },
    });

    await TelegramService.sendMessage(userId, telegramSummary, { parse_mode: "Markdown" });
    
    return prisma.report.update({
      where: { id: report.id },
      data: { status: "sent" }
    });
  }
}
