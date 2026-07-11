/**
 * Memory Manager — Bridges structured soul files with operational database memory.
 * 
 * This is the unified interface for all memory operations. It coordinates:
 * 1. Soul files (soul/*.md) — transparent, human-readable, git-trackable
 * 2. Database MemoryRecord — operational, queryable, auditable
 * 
 * The soul files are the source of truth for identity, preferences, and skills.
 * The database stores operational memory (task results, episodic logs, proposed changes).
 * The manager keeps them in sync.
 */
import { prisma } from '../prisma';
import { SoulReader, type SoulSnapshot, type MemoryEntry } from './soul-reader';
import { SoulWriter, type MemoryCategory, type MemoryProposal } from './soul-writer';

// ── Types ────────────────────────────────────────────────

export interface ContextPackage {
  /** Agent identity and boundaries */
  identity: string;
  /** Owner-specific context relevant to the task */
  ownerContext: string;
  /** Active goals summary */
  activeGoals: string;
  /** Available skills for this task type */
  relevantSkills: string;
  /** Recent project context (from DB) */
  projectContext: string;
  /** Recent episodic memory (from DB) */
  recentActivity: string;
}

export interface MemoryAddRequest {
  content: string;
  category: MemoryCategory;
  confidence?: number;
  source: string;
  projectCellId?: string;
  agentRunId?: string;
}

export interface MemorySearchResult {
  /** Entries from soul files */
  soulEntries: MemoryEntry[];
  /** Records from database */
  dbRecords: Array<{
    id: string;
    type: string;
    content: string;
    confidence: number;
    status: string;
    createdAt: Date;
  }>;
}

// ── Memory Manager ───────────────────────────────────────

export class MemoryManager {

  /**
   * Build a context package for an agent run.
   * Assembles relevant context from soul files and database.
   */
  static async buildContext(
    taskDescription: string,
    projectCellId?: string,
  ): Promise<ContextPackage> {
    // Read soul snapshot
    const snapshot = SoulReader.readSnapshot();

    // Build identity section
    const identity = [
      `Name: ${snapshot.identity.name} | Role: ${snapshot.identity.role}`,
      `Mission: ${snapshot.identity.mission}`,
      '',
      'Decision Boundaries:',
      ...snapshot.identity.decisionBoundaries.map(b => `- ${b}`),
    ].join('\n');

    // Build owner context from memory entries
    const allMemory = Object.entries(snapshot.memory)
      .flatMap(([cat, entries]: [string, any[]]) => entries.map((e: any) => ({ ...e, category: cat })))
      .filter(e => e.content.length > 0)
      .sort((a, b) => b.confidence - a.confidence);

    const ownerContext = allMemory.length > 0
      ? allMemory.slice(0, 15).map(e => `- [${e.category}] ${e.content}`).join('\n')
      : 'No owner context available yet.';

    // Build active goals
    const activeGoals = snapshot.goals
      .filter(g => g.status === 'active')
      .map(g => `- ${g.title} [${g.currentPhase || 'planning'}]${g.lastUpdate ? ' — ' + g.lastUpdate : ''}`)
      .join('\n') || 'No active goals.';

    // Find relevant skills
    const taskLower = taskDescription.toLowerCase();
    const relevantSkills = snapshot.skills
      .filter(s => {
        const triggers = s.trigger.toLowerCase().split(',').map(t => t.trim());
        return triggers.some(t => taskLower.includes(t)) || s.name.toLowerCase().includes(taskLower);
      })
      .map(s => `- ${s.name}: ${s.process}`)
      .join('\n') || snapshot.skills.map(s => `- ${s.name}: ${s.trigger}`).join('\n');

    // Fetch project-specific context from DB
    let projectContext = '';
    if (projectCellId) {
      const cell = await prisma.projectCell.findUnique({
        where: { id: projectCellId },
        include: {
          tasks: { where: { status: { not: 'completed' } }, take: 10 },
          memories: { where: { status: 'trusted' }, take: 5 },
        },
      });
      if (cell) {
        projectContext = [
          `Project: ${cell.title}`,
          `Objective: ${cell.objective}`,
          `Status: ${cell.status}`,
          cell.tasks.length > 0 ? `Tasks: ${cell.tasks.map(t => `${t.title} [${t.status}]`).join(', ')}` : '',
          cell.memories.length > 0 ? `Memory: ${cell.memories.map(m => m.content).join('; ')}` : '',
        ].filter(Boolean).join('\n');
      }
    }

    // Fetch recent activity from DB
    const recentRuns = await prisma.agentRun.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        prompt: true,
        status: true,
        createdAt: true,
        currentPhase: true,
      },
    });
    const recentActivity = recentRuns
      .map(r => `- [${r.status}] ${r.prompt.substring(0, 100)}${r.prompt.length > 100 ? '...' : ''}`)
      .join('\n') || 'No recent activity.';

    return {
      identity,
      ownerContext,
      activeGoals,
      relevantSkills,
      projectContext,
      recentActivity,
    };
  }

  /**
   * Add a memory entry. Routes to soul files and/or database based on category.
   */
  static async addMemory(request: MemoryAddRequest): Promise<{ soulResult: any; dbRecord: any }> {
    // Write to soul files
    const soulResult = SoulWriter.proposeMemory({
      category: request.category,
      content: request.content,
      confidence: request.confidence || 0.8,
      source: request.source,
      risk: 'low', // Will be re-classified by the writer
    });

    // Also store in DB for queryability and audit trail
    const dbRecord = await prisma.memoryRecord.create({
      data: {
        userId: await this.getOwnerId(),
        type: request.category,
        content: request.content,
        confidence: request.confidence || 0.8,
        status: soulResult.autoCommitted ? 'trusted' : 'proposed',
        sourceRunId: request.agentRunId,
        projectCellId: request.projectCellId,
      },
    });

    return { soulResult, dbRecord };
  }

  /**
   * Search memory across both soul files and database.
   */
  static async searchMemory(query: string): Promise<MemorySearchResult> {
    // Search soul files
    const soulEntries = SoulReader.searchMemory(query);

    // Search database
    const dbRecords = await prisma.memoryRecord.findMany({
      where: {
        OR: [
          { content: { contains: query, mode: 'insensitive' } },
          { type: { contains: query, mode: 'insensitive' } },
        ],
        status: { in: ['trusted', 'proposed'] },
      },
      orderBy: { confidence: 'desc' },
      take: 20,
      select: {
        id: true,
        type: true,
        content: true,
        confidence: true,
        status: true,
        createdAt: true,
      },
    });

    return { soulEntries, dbRecords };
  }

  /**
   * Correct a memory entry — marks old entry as superseded, creates new one.
   */
  static async correctMemory(
    originalContent: string,
    correction: string,
  ): Promise<void> {
    // Correct in soul files
    SoulWriter.correctMemory(originalContent, correction, 'owner_correction');

    // Correct in database
    const existing = await prisma.memoryRecord.findFirst({
      where: { content: { contains: originalContent } },
    });

    if (existing) {
      const newRecord = await prisma.memoryRecord.create({
        data: {
          userId: existing.userId,
          type: existing.type,
          content: correction,
          confidence: 1.0,
          status: 'trusted',
          supersededById: null,
          projectCellId: existing.projectCellId,
        },
      });

      await prisma.memoryRecord.update({
        where: { id: existing.id },
        data: {
          status: 'superseded',
          supersededById: newRecord.id,
        },
      });
    }
  }

  /**
   * Consolidate memory — merge duplicates, promote high-confidence, archive old entries.
   */
  static async consolidate(): Promise<{ merged: number; promoted: number; archived: number }> {
    let merged = 0;
    let promoted = 0;
    let archived = 0;

    // Promote high-confidence proposed memories
    const proposedMemories = await prisma.memoryRecord.findMany({
      where: { status: 'proposed', confidence: { gte: 0.8 } },
    });
    for (const mem of proposedMemories) {
      await prisma.memoryRecord.update({
        where: { id: mem.id },
        data: { status: 'trusted' },
      });
      promoted++;
    }

    // Archive old low-confidence entries (older than 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const oldEntries = await prisma.memoryRecord.updateMany({
      where: {
        status: 'proposed',
        confidence: { lt: 0.5 },
        createdAt: { lt: thirtyDaysAgo },
      },
      data: { status: 'superseded' },
    });
    archived = oldEntries.count;

    return { merged, promoted, archived };
  }

  /**
   * Get the owner ID — since we keep auth, get the first/only user.
   */
  private static async getOwnerId(): Promise<string> {
    const owner = await prisma.user.findFirst({ select: { id: true } });
    if (!owner) throw new Error('No owner found. Complete onboarding first.');
    return owner.id;
  }
}
