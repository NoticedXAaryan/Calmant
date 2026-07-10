import { prisma } from "../prisma";
import { ProjectCellService } from "./project-cell-service";

export class CommandCenterService {
  /**
   * Captures a new objective, creating both a Goal and a ProjectCell.
   */
  static async createObjective(userId: string, title: string, objective: string) {
    const goal = await prisma.goal.create({
      data: {
        userId,
        title,
        description: objective,
        status: "active",
      },
    });

    const projectCell = await ProjectCellService.create({
      userId,
      title,
      objective,
      goalId: goal.id,
    });

    await prisma.auditEvent.create({
      data: {
        userId,
        action: "command_center.objective_created",
        targetType: "Goal",
        targetId: goal.id,
        details: { projectCellId: projectCell.id, objective },
      },
    });

    return { goal, projectCell };
  }

  /**
   * Pauses an active goal and its corresponding project cell.
   */
  static async pause(userId: string, goalId: string) {
    const goal = await prisma.goal.update({
      where: { id: goalId, userId },
      data: { status: "paused" },
    });

    const cells = await prisma.projectCell.findMany({ where: { goalId } });
    for (const cell of cells) {
      await ProjectCellService.updateStatus(cell.id, "paused");
    }

    return goal;
  }

  /**
   * Resumes a paused goal and its corresponding project cell.
   */
  static async resume(userId: string, goalId: string) {
    const goal = await prisma.goal.update({
      where: { id: goalId, userId },
      data: { status: "active" },
    });

    const cells = await prisma.projectCell.findMany({ where: { goalId } });
    for (const cell of cells) {
      await ProjectCellService.updateStatus(cell.id, "active");
    }

    return goal;
  }

  /**
   * Archives a goal.
   */
  static async archive(userId: string, goalId: string) {
    const goal = await prisma.goal.update({
      where: { id: goalId, userId },
      data: { status: "abandoned" }, // using "abandoned" based on schema
    });

    const cells = await prisma.projectCell.findMany({ where: { goalId } });
    for (const cell of cells) {
      await ProjectCellService.updateStatus(cell.id, "abandoned");
    }

    return goal;
  }

  /**
   * Gathers the "Today" view aggregate data.
   */
  static async getToday(userId: string) {
    const activeGoals = await prisma.goal.findMany({
      where: { userId, status: "active" },
      include: { projectCells: true },
    });

    const activeProjectCells = await prisma.projectCell.findMany({
      where: { userId, status: "active" },
      include: {
        tasks: true,
      },
    });

    const approvals = await prisma.approvalRequest.findMany({
      where: { userId, status: "pending" },
    });

    let blockers = [];
    for (const cell of activeProjectCells) {
      blockers.push(...cell.tasks.filter((t) => t.status === "blocked"));
    }

    // Fetch the latest generated report for today
    const latestReport = await prisma.report.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    return {
      activeGoals,
      activeProjectCells,
      approvals,
      blockers,
      reportPreview: latestReport,
    };
  }
}
