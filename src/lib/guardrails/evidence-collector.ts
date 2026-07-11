/**
 * Evidence Collector — Records evidence for every significant action.
 * 
 * Every tool call, browser action, and external interaction produces
 * evidence that's stored as an artifact. This creates an audit trail
 * and provides context for the validate phase of the execution loop.
 */
import { prisma } from '../prisma';

// ── Types ────────────────────────────────────────────────

export interface EvidenceItem {
  type: 'screenshot' | 'api_response' | 'file_diff' | 'decision' | 'observation' | 'error';
  title: string;
  content: string;
  metadata?: Record<string, any>;
}

// ── Evidence Collector ───────────────────────────────────

export class EvidenceCollector {

  /**
   * Record evidence from a tool call.
   */
  static async recordToolEvidence(
    toolCallId: string,
    runId: string,
    toolName: string,
    args: Record<string, any>,
    result: any,
    status: 'success' | 'error',
    userId: string,
    projectCellId?: string,
  ): Promise<void> {
    // Create a summary of the evidence
    const summary = status === 'success'
      ? `Tool ${toolName} executed successfully`
      : `Tool ${toolName} failed`;

    const content = JSON.stringify({
      tool: toolName,
      args: this.sanitizeArgs(args),
      result: this.truncateResult(result),
      status,
      timestamp: new Date().toISOString(),
    }, null, 2);

    await prisma.artifact.create({
      data: {
        userId,
        type: 'evidence',
        title: `Evidence: ${toolName} [${status}]`,
        description: summary,
        content,
        metadata: {
          toolCallId,
          runId,
          toolName,
          status,
          evidenceType: 'tool_execution',
        },
        projectCellId,
      },
    });
  }

  /**
   * Record a screenshot as evidence.
   */
  static async recordScreenshot(
    runId: string,
    url: string,
    screenshotPath: string,
    context: string,
    userId: string,
    projectCellId?: string,
  ): Promise<void> {
    await prisma.artifact.create({
      data: {
        userId,
        type: 'screenshot',
        title: `Screenshot: ${new URL(url).hostname}`,
        description: context,
        filePath: screenshotPath,
        metadata: {
          runId,
          url,
          evidenceType: 'screenshot',
          capturedAt: new Date().toISOString(),
        },
        projectCellId,
      },
    });
  }

  /**
   * Record a decision made by the agent.
   */
  static async recordDecision(
    runId: string,
    decision: string,
    reasoning: string,
    alternatives: string[],
    userId: string,
    projectCellId?: string,
  ): Promise<void> {
    const content = JSON.stringify({
      decision,
      reasoning,
      alternatives,
      timestamp: new Date().toISOString(),
    }, null, 2);

    await prisma.artifact.create({
      data: {
        userId,
        type: 'evidence',
        title: `Decision: ${decision.substring(0, 100)}`,
        description: reasoning,
        content,
        metadata: {
          runId,
          evidenceType: 'decision',
        },
        projectCellId,
      },
    });
  }

  /**
   * Get all evidence for a project cell (for validation phase).
   */
  static async getEvidence(projectCellId: string): Promise<Array<{
    id: string;
    type: string;
    title: string;
    description: string | null;
    content: string | null;
    metadata: any;
    createdAt: Date;
  }>> {
    return prisma.artifact.findMany({
      where: {
        projectCellId,
        type: { in: ['evidence', 'screenshot'] },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        type: true,
        title: true,
        description: true,
        content: true,
        metadata: true,
        createdAt: true,
      },
    });
  }

  // ── Private Helpers ─────────────────────────────────────

  /**
   * Remove sensitive data from tool arguments before storing.
   */
  private static sanitizeArgs(args: Record<string, any>): Record<string, any> {
    const sanitized = { ...args };
    const sensitiveKeys = ['password', 'token', 'secret', 'key', 'apiKey', 'api_key', 'authorization'];

    for (const key of Object.keys(sanitized)) {
      if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk))) {
        sanitized[key] = '[REDACTED]';
      }
    }

    return sanitized;
  }

  /**
   * Truncate large results to prevent DB bloat.
   */
  private static truncateResult(result: any): any {
    const str = JSON.stringify(result);
    if (str.length > 5000) {
      return {
        _truncated: true,
        _originalLength: str.length,
        preview: str.substring(0, 5000) + '...',
      };
    }
    return result;
  }
}
