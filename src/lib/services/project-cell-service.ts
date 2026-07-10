import { prisma } from "../prisma";
import { ProjectCell, ProjectTask } from "@prisma/client";

export class ProjectCellService {
  /**
   * Creates a project cell.
   */
  static async create(data: {
    userId: string;
    title: string;
    objective: string;
    goalId?: string;
    successCriteria?: any;
  }): Promise<ProjectCell> {
    const projectCell = await prisma.projectCell.create({
      data: {
        userId: data.userId,
        title: data.title,
        objective: data.objective,
        goalId: data.goalId,
        successCriteria: data.successCriteria,
        status: "active",
      },
    });

    // Emit audit event
    await prisma.auditEvent.create({
      data: {
        userId: data.userId,
        action: "project_cell.created",
        targetType: "ProjectCell",
        targetId: projectCell.id,
        details: { title: data.title, objective: data.objective },
      },
    });

    return projectCell;
  }

  /**
   * Updates project cell status.
   */
  static async updateStatus(
    id: string,
    status: string
  ): Promise<ProjectCell> {
    const projectCell = await prisma.projectCell.update({
      where: { id },
      data: { status },
    });

    await prisma.auditEvent.create({
      data: {
        userId: projectCell.userId,
        action: "project_cell.status_updated",
        targetType: "ProjectCell",
        targetId: id,
        details: { status },
      },
    });

    return projectCell;
  }

  /**
   * Adds a project task.
   */
  static async addTask(data: {
    projectCellId: string;
    title: string;
    description?: string;
    assignedSkill?: string;
    dependsOn?: string[];
  }): Promise<ProjectTask> {
    const projectCell = await prisma.projectCell.findUniqueOrThrow({
      where: { id: data.projectCellId },
    });

    const task = await prisma.projectTask.create({
      data: {
        projectCellId: data.projectCellId,
        title: data.title,
        description: data.description,
        assignedSkill: data.assignedSkill,
        dependsOn: data.dependsOn || [],
        status: "pending",
      },
    });

    await prisma.auditEvent.create({
      data: {
        userId: projectCell.userId,
        action: "project_task.created",
        targetType: "ProjectTask",
        targetId: task.id,
        details: { title: data.title },
      },
    });

    return task;
  }

  /**
   * Updates task status.
   */
  static async updateTaskStatus(
    id: string,
    status: string
  ): Promise<ProjectTask> {
    const data: any = { status };
    if (status === "completed") {
      data.completedAt = new Date();
    }

    const task = await prisma.projectTask.update({
      where: { id },
      data,
      include: { projectCell: true },
    });

    await prisma.auditEvent.create({
      data: {
        userId: task.projectCell.userId,
        action: "project_task.status_updated",
        targetType: "ProjectTask",
        targetId: id,
        details: { status },
      },
    });

    return task;
  }

  /**
   * Summarizes project cell including next action, blockers, approvals, and artifacts.
   */
  static async getSummary(id: string) {
    const projectCell = await prisma.projectCell.findUniqueOrThrow({
      where: { id },
      include: {
        tasks: {
          orderBy: { createdAt: "asc" },
        },
        approvals: {
          where: { status: "pending" },
        },
        artifacts: {
          orderBy: { createdAt: "desc" },
          take: 5,
        },
      },
    });

    const blockers = projectCell.tasks.filter((t) => t.status === "blocked");
    const nextActions = projectCell.tasks.filter((t) => t.status === "pending" || t.status === "running");

    return {
      id: projectCell.id,
      title: projectCell.title,
      status: projectCell.status,
      objective: projectCell.objective,
      nextAction: nextActions.length > 0 ? nextActions[0] : null,
      blockers,
      pendingApprovals: projectCell.approvals,
      recentArtifacts: projectCell.artifacts,
      totalTasks: projectCell.tasks.length,
      completedTasks: projectCell.tasks.filter((t) => t.status === "completed").length,
    };
  }
}
