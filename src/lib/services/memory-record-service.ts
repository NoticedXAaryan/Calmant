import { prisma } from "../prisma";
import { MemoryRecord } from "@prisma/client";

export class MemoryRecordService {
  /**
   * Proposes a new memory record.
   */
  static async create(data: {
    userId: string;
    projectCellId?: string;
    type: string; // 'fact' | 'preference' | 'instruction' | 'summary'
    content: string;
    confidence?: number;
    sourceRunId?: string;
  }): Promise<MemoryRecord> {
    return prisma.memoryRecord.create({
      data: {
        userId: data.userId,
        projectCellId: data.projectCellId,
        type: data.type,
        content: data.content,
        confidence: data.confidence ?? 1.0,
        status: "proposed",
        sourceRunId: data.sourceRunId,
      },
    });
  }

  /**
   * Trusts a proposed memory.
   */
  static async trust(id: string): Promise<MemoryRecord> {
    return prisma.memoryRecord.update({
      where: { id },
      data: { status: "trusted" },
    });
  }

  /**
   * Rejects a proposed memory.
   */
  static async reject(id: string): Promise<MemoryRecord> {
    return prisma.memoryRecord.update({
      where: { id },
      data: { status: "rejected" },
    });
  }

  /**
   * Marks a memory as superseded by a new one.
   */
  static async supersede(oldId: string, newId: string): Promise<MemoryRecord> {
    return prisma.memoryRecord.update({
      where: { id: oldId },
      data: {
        status: "superseded",
        supersededById: newId,
      },
    });
  }

  /**
   * Corrects a memory by creating a new trusted memory and superseding the old one.
   */
  static async correct(
    oldId: string,
    newContent: string,
    newType?: string
  ): Promise<{ old: MemoryRecord; new: MemoryRecord }> {
    const oldRecord = await prisma.memoryRecord.findUniqueOrThrow({
      where: { id: oldId },
    });

    // Create new trusted memory
    const newRecord = await prisma.memoryRecord.create({
      data: {
        userId: oldRecord.userId,
        projectCellId: oldRecord.projectCellId,
        type: newType ?? oldRecord.type,
        content: newContent,
        confidence: 1.0,
        status: "trusted", // Corrections from user are implicitly trusted
      },
    });

    // Supersede old memory
    const updatedOld = await this.supersede(oldId, newRecord.id);

    return { old: updatedOld, new: newRecord };
  }

  /**
   * Lists active memories for a user.
   */
  static async list(
    userId: string,
    options?: { projectCellId?: string; status?: string; type?: string }
  ): Promise<MemoryRecord[]> {
    const where: any = { userId };

    if (options?.status) {
      where.status = options.status;
    } else {
      where.status = { in: ["trusted", "proposed"] }; // default to active ones
    }

    if (options?.projectCellId) {
      where.projectCellId = options.projectCellId;
    }

    if (options?.type) {
      where.type = options.type;
    }

    return prisma.memoryRecord.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Formats a package of memories for agent context.
   */
  static async getContextPackage(
    userId: string,
    projectCellId?: string
  ): Promise<string> {
    const memories = await this.list(userId, {
      status: "trusted",
      projectCellId,
    });

    if (memories.length === 0) return "No memories available.";

    const grouped = memories.reduce((acc, curr) => {
      acc[curr.type] = acc[curr.type] || [];
      acc[curr.type].push(curr.content);
      return acc;
    }, {} as Record<string, string[]>);

    let output = "## Context & Memory\n\n";
    for (const [type, contents] of Object.entries(grouped)) {
      output += `### ${type.toUpperCase()}\n`;
      contents.forEach((c) => (output += `- ${c}\n`));
      output += "\n";
    }

    return output.trim();
  }
}
