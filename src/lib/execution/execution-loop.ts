/**
 * Execution Loop — The Research → Build → Validate cycle for long-term jobs.
 * 
 * This is the core differentiator. When an owner assigns a goal, the system
 * follows a human-like process:
 * 
 *   ┌──────────────────────────────────────────────────────────┐
 *   │                                                          │
 *   │  IDEATE ─→ RESEARCH ─→ PLAN ─→ BUILD ─→ VALIDATE ─→ DELIVER
 *   │    ↑          ↑                    │         │
 *   │    │          └────────────────────┘         │
 *   │    └────────────────────────────────────────-┘
 *   │                                                          │
 *   └──────────────────────────────────────────────────────────┘
 * 
 * If building fails → loop back to research with new information.
 * If validation fails → loop back to ideation with lessons learned.
 * Each phase persists its context so the job survives restarts.
 */
import { prisma } from '../prisma';
import { MemoryManager } from '../memory/memory-manager';
import { SoulWriter } from '../memory/soul-writer';

// ── Types ────────────────────────────────────────────────

export type ExecutionPhase = 
  | 'ideate'     // Understand the objective, break it down
  | 'research'   // Gather information, validate assumptions
  | 'plan'       // Create a concrete execution plan
  | 'build'      // Execute the plan step by step
  | 'validate'   // Verify outputs meet success criteria
  | 'deliver'    // Present results and close out
  | 'blocked'    // Waiting for owner input or approval
  | 'failed'     // Terminal failure (after max retries)
  | 'completed'; // Successfully delivered

export interface PhaseContext {
  /** What this phase is trying to accomplish */
  objective: string;
  /** Input from previous phase */
  input: Record<string, any>;
  /** Output produced by this phase */
  output: Record<string, any>;
  /** Decisions made during this phase */
  decisions: string[];
  /** Issues encountered */
  issues: string[];
  /** Lessons learned */
  lessons: string[];
}

export interface ExecutionState {
  /** The project cell this execution is attached to */
  projectCellId: string;
  /** Current phase */
  phase: ExecutionPhase;
  /** How many times we've looped back */
  iterationCount: number;
  /** Maximum iterations before escalating to owner */
  maxIterations: number;
  /** Context accumulated across phases */
  phaseContexts: Record<ExecutionPhase, PhaseContext | null>;
  /** The overall objective */
  objective: string;
  /** Success criteria from the goal */
  successCriteria: string[];
  /** Research data accumulated */
  researchData: ResearchItem[];
  /** Build artifacts produced */
  artifacts: ArtifactRef[];
  /** Validation results */
  validationResults: ValidationResult[];
  /** Why we looped back (if applicable) */
  loopBackReasons: string[];
  /** Timestamp tracking */
  startedAt: string;
  lastUpdatedAt: string;
}

export interface ResearchItem {
  topic: string;
  findings: string;
  sources: string[];
  confidence: number;
  timestamp: string;
}

export interface ArtifactRef {
  type: string;
  title: string;
  description: string;
  artifactId?: string;
  filePath?: string;
}

export interface ValidationResult {
  criterion: string;
  passed: boolean;
  evidence: string;
  suggestion?: string;
}

export interface PhaseTransition {
  from: ExecutionPhase;
  to: ExecutionPhase;
  reason: string;
  timestamp: string;
}

// ── Valid Transitions ────────────────────────────────────

const VALID_TRANSITIONS: Record<ExecutionPhase, ExecutionPhase[]> = {
  ideate:    ['research', 'blocked', 'failed'],
  research:  ['plan', 'ideate', 'blocked', 'failed'],     // Can loop back to ideate
  plan:      ['build', 'research', 'blocked', 'failed'],   // Can loop back to research
  build:     ['validate', 'research', 'blocked', 'failed'], // Can loop back to research
  validate:  ['deliver', 'ideate', 'research', 'build', 'blocked', 'failed'], // Can loop back to any earlier phase
  deliver:   ['completed', 'blocked'],
  blocked:   ['ideate', 'research', 'plan', 'build', 'validate', 'deliver', 'failed'],
  failed:    [],
  completed: [],
};

// ── Execution Loop Engine ────────────────────────────────

export class ExecutionLoop {

  /**
   * Initialize a new execution loop for a project cell.
   */
  static async initialize(
    projectCellId: string,
    objective: string,
    successCriteria: string[] = [],
  ): Promise<ExecutionState> {
    const state: ExecutionState = {
      projectCellId,
      phase: 'ideate',
      iterationCount: 0,
      maxIterations: 5,
      phaseContexts: {
        ideate: null,
        research: null,
        plan: null,
        build: null,
        validate: null,
        deliver: null,
        blocked: null,
        failed: null,
        completed: null,
      },
      objective,
      successCriteria,
      researchData: [],
      artifacts: [],
      validationResults: [],
      loopBackReasons: [],
      startedAt: new Date().toISOString(),
      lastUpdatedAt: new Date().toISOString(),
    };

    // Persist state to project cell
    await this.persistState(state);

    // Create an event
    await this.emitEvent(projectCellId, 'execution_loop.initialized', {
      objective,
      successCriteria,
    });

    return state;
  }

  /**
   * Transition to the next phase. Validates the transition is legal.
   */
  static async transition(
    state: ExecutionState,
    toPhase: ExecutionPhase,
    reason: string,
    phaseOutput?: Record<string, any>,
  ): Promise<ExecutionState> {
    const fromPhase = state.phase;

    // Validate transition
    if (!VALID_TRANSITIONS[fromPhase]?.includes(toPhase)) {
      throw new Error(
        `Invalid transition: ${fromPhase} → ${toPhase}. ` +
        `Valid targets: ${VALID_TRANSITIONS[fromPhase]?.join(', ') || 'none'}`
      );
    }

    // Save the current phase output
    if (phaseOutput) {
      state.phaseContexts[fromPhase] = {
        objective: state.objective,
        input: state.phaseContexts[fromPhase]?.input || {},
        output: phaseOutput,
        decisions: phaseOutput.decisions || [],
        issues: phaseOutput.issues || [],
        lessons: phaseOutput.lessons || [],
      };
    }

    // Detect loop-back
    const isLoopBack = this.isLoopBack(fromPhase, toPhase);
    if (isLoopBack) {
      state.iterationCount++;
      state.loopBackReasons.push(`[${state.iterationCount}] ${fromPhase} → ${toPhase}: ${reason}`);

      // Check iteration limit
      if (state.iterationCount >= state.maxIterations) {
        console.warn(`[ExecutionLoop] Max iterations (${state.maxIterations}) reached. Blocking for owner input.`);
        state.phase = 'blocked';
        state.lastUpdatedAt = new Date().toISOString();
        await this.persistState(state);
        await this.emitEvent(state.projectCellId, 'execution_loop.max_iterations', {
          iterations: state.iterationCount,
          lastReason: reason,
        });
        return state;
      }

      // Learn from the loop-back
      await MemoryManager.addMemory({
        content: `Loop-back in goal "${state.objective}": ${reason}`,
        category: 'patterns',
        confidence: 0.6,
        source: 'execution_loop',
        projectCellId: state.projectCellId,
      });
    }

    // Transition
    state.phase = toPhase;
    state.lastUpdatedAt = new Date().toISOString();

    // Set input for the new phase from accumulated context
    state.phaseContexts[toPhase] = {
      objective: state.objective,
      input: this.buildPhaseInput(state, toPhase),
      output: {},
      decisions: [],
      issues: [],
      lessons: [],
    };

    // Persist and emit
    await this.persistState(state);
    await this.emitEvent(state.projectCellId, `execution_loop.phase_changed`, {
      from: fromPhase,
      to: toPhase,
      reason,
      iteration: state.iterationCount,
      isLoopBack,
    });

    // Update goal phase in soul files
    SoulWriter.writeGoal({
      title: state.objective,
      currentPhase: toPhase,
      lastUpdate: reason,
    });

    return state;
  }

  /**
   * Add research data to the execution state.
   */
  static async addResearch(
    state: ExecutionState,
    research: Omit<ResearchItem, 'timestamp'>,
  ): Promise<ExecutionState> {
    state.researchData.push({
      ...research,
      timestamp: new Date().toISOString(),
    });
    state.lastUpdatedAt = new Date().toISOString();
    await this.persistState(state);
    return state;
  }

  /**
   * Add an artifact reference.
   */
  static async addArtifact(
    state: ExecutionState,
    artifact: ArtifactRef,
  ): Promise<ExecutionState> {
    state.artifacts.push(artifact);
    state.lastUpdatedAt = new Date().toISOString();
    await this.persistState(state);
    return state;
  }

  /**
   * Record validation results and determine if we need to loop back.
   */
  static async validate(
    state: ExecutionState,
    results: ValidationResult[],
  ): Promise<{ state: ExecutionState; allPassed: boolean; failedCriteria: string[] }> {
    state.validationResults = results;
    state.lastUpdatedAt = new Date().toISOString();

    const allPassed = results.every(r => r.passed);
    const failedCriteria = results.filter(r => !r.passed).map(r => r.criterion);

    await this.persistState(state);
    await this.emitEvent(state.projectCellId, 'execution_loop.validated', {
      allPassed,
      passed: results.filter(r => r.passed).length,
      failed: failedCriteria.length,
      failedCriteria,
    });

    return { state, allPassed, failedCriteria };
  }

  /**
   * Load execution state from database.
   */
  static async loadState(projectCellId: string): Promise<ExecutionState | null> {
    const cell = await prisma.projectCell.findUnique({
      where: { id: projectCellId },
      select: {
        id: true,
        objective: true,
        successCriteria: true,
        status: true,
      },
    });

    if (!cell) return null;

    // Look for the execution state in the project cell's metadata
    // We store it as an artifact of type 'execution_state'
    const stateArtifact = await prisma.artifact.findFirst({
      where: {
        projectCellId,
        type: 'execution_state',
      },
      orderBy: { createdAt: 'desc' },
    });

    if (stateArtifact?.content) {
      try {
        return JSON.parse(stateArtifact.content) as ExecutionState;
      } catch {
        console.error('[ExecutionLoop] Failed to parse stored state');
      }
    }

    return null;
  }

  /**
   * Get a human-readable status summary.
   */
  static summarize(state: ExecutionState): string {
    const lines: string[] = [];
    lines.push(`📋 ${state.objective}`);
    lines.push(`Phase: ${state.phase.toUpperCase()} (iteration ${state.iterationCount})`);

    if (state.researchData.length > 0) {
      lines.push(`📚 ${state.researchData.length} research items collected`);
    }
    if (state.artifacts.length > 0) {
      lines.push(`📦 ${state.artifacts.length} artifacts produced`);
    }
    if (state.validationResults.length > 0) {
      const passed = state.validationResults.filter(r => r.passed).length;
      lines.push(`✅ ${passed}/${state.validationResults.length} criteria passed`);
    }
    if (state.loopBackReasons.length > 0) {
      lines.push(`🔄 ${state.loopBackReasons.length} loop-backs:`);
      state.loopBackReasons.slice(-3).forEach(r => lines.push(`  ${r}`));
    }

    return lines.join('\n');
  }

  // ── Private Helpers ─────────────────────────────────────

  private static isLoopBack(from: ExecutionPhase, to: ExecutionPhase): boolean {
    const phaseOrder: ExecutionPhase[] = ['ideate', 'research', 'plan', 'build', 'validate', 'deliver'];
    const fromIndex = phaseOrder.indexOf(from);
    const toIndex = phaseOrder.indexOf(to);
    return fromIndex >= 0 && toIndex >= 0 && toIndex < fromIndex;
  }

  private static buildPhaseInput(
    state: ExecutionState,
    phase: ExecutionPhase,
  ): Record<string, any> {
    const input: Record<string, any> = {
      objective: state.objective,
      successCriteria: state.successCriteria,
      iterationCount: state.iterationCount,
    };

    // Each phase gets accumulated context from previous phases
    switch (phase) {
      case 'ideate':
        input.previousAttempts = state.loopBackReasons;
        input.validationFailures = state.validationResults.filter(r => !r.passed);
        break;

      case 'research':
        input.ideation = state.phaseContexts.ideate?.output || {};
        input.previousResearch = state.researchData;
        input.knownIssues = state.phaseContexts.build?.issues || [];
        break;

      case 'plan':
        input.research = state.researchData;
        input.previousPlans = state.phaseContexts.plan?.output || {};
        input.constraints = state.phaseContexts.ideate?.decisions || [];
        break;

      case 'build':
        input.plan = state.phaseContexts.plan?.output || {};
        input.research = state.researchData;
        input.previousArtifacts = state.artifacts;
        break;

      case 'validate':
        input.artifacts = state.artifacts;
        input.successCriteria = state.successCriteria;
        input.plan = state.phaseContexts.plan?.output || {};
        break;

      case 'deliver':
        input.artifacts = state.artifacts;
        input.validationResults = state.validationResults;
        break;
    }

    return input;
  }

  private static async persistState(state: ExecutionState): Promise<void> {
    const ownerId = await this.getOwnerId();
    const content = JSON.stringify(state, null, 2);

    // Upsert the execution state artifact
    const existing = await prisma.artifact.findFirst({
      where: {
        projectCellId: state.projectCellId,
        type: 'execution_state',
      },
    });

    if (existing) {
      await prisma.artifact.update({
        where: { id: existing.id },
        data: {
          content,
          metadata: {
            phase: state.phase,
            iteration: state.iterationCount,
            updatedAt: state.lastUpdatedAt,
          },
        },
      });
    } else {
      await prisma.artifact.create({
        data: {
          userId: ownerId,
          projectCellId: state.projectCellId,
          type: 'execution_state',
          title: `Execution State: ${state.objective}`,
          content,
          metadata: {
            phase: state.phase,
            iteration: state.iterationCount,
          },
        },
      });
    }

    // Update project cell status
    const cellStatus = state.phase === 'completed' ? 'completed'
      : state.phase === 'failed' ? 'abandoned'
      : state.phase === 'blocked' ? 'paused'
      : 'active';

    await prisma.projectCell.update({
      where: { id: state.projectCellId },
      data: { status: cellStatus },
    });
  }

  private static async emitEvent(
    projectCellId: string,
    type: string,
    metadata: Record<string, any>,
  ): Promise<void> {
    const ownerId = await this.getOwnerId();

    // Get next sequence number
    const lastEvent = await prisma.agentEvent.findFirst({
      where: { projectCellId },
      orderBy: { seq: 'desc' },
      select: { seq: true },
    });

    await prisma.agentEvent.create({
      data: {
        userId: ownerId,
        projectCellId,
        seq: (lastEvent?.seq || 0) + 1,
        type,
        level: 'info',
        message: `${type}: ${JSON.stringify(metadata).substring(0, 200)}`,
        metadata: metadata as any,
      },
    });
  }

  private static async getOwnerId(): Promise<string> {
    const owner = await prisma.user.findFirst({ select: { id: true } });
    if (!owner) throw new Error('No owner found.');
    return owner.id;
  }
}
