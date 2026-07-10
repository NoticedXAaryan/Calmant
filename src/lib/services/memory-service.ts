import { prisma } from "../prisma";
import { addMemory } from "../memory";

export class MemoryService {
  /**
   * Fetch all active memories for a given user.
   */
  static async getActiveMemories(userId: string) {
    return await prisma.agentMemory.findMany({
      where: { userId, status: "active" },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Fetch all pending review memories for a given user.
   */
  static async getPendingMemories(userId: string) {
    return await prisma.agentMemory.findMany({
      where: { userId, status: "pending_review" },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Creates a new memory record.
   * If the memory is active, it will also be synced to the vector store.
   */
  static async createMemory(
    userId: string,
    fact: string,
    category: string,
    confidence: number = 0.8,
    status: string = "active",
    sourceRunId?: string
  ) {
    const memory = await prisma.agentMemory.create({
      data: {
        userId,
        fact,
        category,
        confidence,
        status,
        sourceRunId,
      },
    });

    if (status === "active") {
      try {
        await addMemory(fact, userId);
      } catch (err) {
        console.warn(`[MemoryService] Failed to sync memory ${memory.id} to mem0ai:`, err);
      }
    }

    return memory;
  }

  /**
   * Resolves a pending memory (approves or rejects it).
   * If approved (status = 'active'), it is synced to the vector store.
   */
  static async resolveMemory(memoryId: string, status: "active" | "rejected") {
    const memory = await prisma.agentMemory.findUnique({ where: { id: memoryId } });
    if (!memory) throw new Error("Memory not found");

    if (memory.status !== "pending_review") {
      throw new Error(`Memory is already ${memory.status}`);
    }

    const updated = await prisma.agentMemory.update({
      where: { id: memoryId },
      data: { status },
    });

    if (status === "active") {
      try {
        await addMemory(updated.fact, updated.userId);
      } catch (err) {
        console.warn(`[MemoryService] Failed to sync memory ${updated.id} to mem0ai:`, err);
      }
    }

    return updated;
  }
}
