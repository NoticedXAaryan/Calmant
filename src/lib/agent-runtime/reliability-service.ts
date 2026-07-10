import { prisma } from "../prisma";
import { EventService } from "./event-service";
import { BrowserSessionService } from "../services/browser-session-service";

export class ReliabilityService {
  /**
   * Detects and handles stuck runs (waiting_approval for too long)
   * and cleans up abandoned browser sessions.
   */
  static async performHealthCheck() {
    console.log("[ReliabilityService] Running health check...");

    const now = new Date();
    
    // 1. Check for stuck approvals (e.g., > 24 hours)
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const stuckApprovals = await prisma.approvalRequest.findMany({
      where: {
        status: "pending",
        createdAt: { lt: yesterday }
      }
    });

    for (const approval of stuckApprovals) {
      if (approval.agentRunId) {
        await EventService.emit(
          approval.agentRunId,
          approval.userId,
          "reliability.stuck_approval",
          `Approval ${approval.id} has been stuck for over 24 hours.`,
          "warn",
          { approvalId: approval.id }
        );
      }
    }

    // 2. Clean up old active browser sessions
    const oldSessions = await prisma.browserSession.findMany({
      where: {
        status: "active",
        createdAt: { lt: yesterday } // anything older than 24h
      }
    });

    for (const session of oldSessions) {
      await BrowserSessionService.closeSession(session.id);
      console.log(`[ReliabilityService] Cleaned up stuck browser session ${session.id}`);
    }

    // 3. Retry policy / failed worker detection
    // If a project task is running for > 2 hours, mark it failed and create blocker event
    const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
    const stuckTasks = await prisma.projectTask.findMany({
      where: {
        status: "running",
        updatedAt: { lt: twoHoursAgo }
      },
      include: { projectCell: true }
    });

    for (const task of stuckTasks) {
      await prisma.projectTask.update({
        where: { id: task.id },
        data: { status: "blocked" }
      });
      
      await EventService.emit(
        task.projectCellId, // Using cell ID as run ID for generic task failure
        task.projectCell.userId,
        "reliability.task_timeout",
        `Task ${task.title} timed out and was blocked.`,
        "error",
        { taskId: task.id }
      );
    }
    
    console.log("[ReliabilityService] Health check complete.");
  }
}
