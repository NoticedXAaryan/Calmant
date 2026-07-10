import { prisma } from "../prisma";

export class EventService {
  /**
   * Emit a new AgentEvent and attach it to the run.
   */
  static async emit(
    runId: string,
    userId: string,
    type: string,
    message: string,
    level: "debug" | "info" | "warn" | "error" = "info",
    metadata?: any
  ) {
    // In a production system this should be atomic, but a fast findFirst is sufficient for MVP
    const lastEvent = await prisma.agentEvent.findFirst({
      where: { runId },
      orderBy: { seq: 'desc' },
    });

    const seq = lastEvent ? lastEvent.seq + 1 : 1;

    return await prisma.agentEvent.create({
      data: {
        runId,
        userId,
        seq,
        type,
        level,
        message,
        metadata: metadata ? JSON.parse(JSON.stringify(metadata)) : undefined,
      }
    });
  }

  static async getEvents(runId: string) {
    return await prisma.agentEvent.findMany({
      where: { runId },
      orderBy: { seq: 'asc' }
    });
  }
}
