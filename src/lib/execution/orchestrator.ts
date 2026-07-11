/**
 * Execution Orchestrator — Connects the execution loop with BullMQ workers.
 * 
 * This is the bridge between the state machine (execution-loop.ts) and the
 * actual work being done (via BullMQ queues). When a phase runs, the
 * orchestrator dispatches the right jobs to the right queues and handles
 * the results.
 * 
 * The orchestrator is called by the BullMQ orchestration worker.
 */
import { prisma } from '../prisma';
import { ExecutionLoop, type ExecutionState, type ExecutionPhase } from './execution-loop';
import {
  IdeatePhaseRunner,
  ResearchPhaseRunner,
  PlanPhaseRunner,
  BuildPhaseRunner,
  ValidatePhaseRunner,
  DeliverPhaseRunner,
  type PhaseResult,
} from './phase-runners';
import { MemoryManager } from '../memory/memory-manager';
import { enqueueOrchestration, enqueueNotification } from '../queue';

// ── Orchestrator ─────────────────────────────────────────

export class ExecutionOrchestrator {

  /**
   * Run a single phase of the execution loop and handle the transition.
   * Called by the orchestration BullMQ worker.
   */
  static async runPhase(
    projectCellId: string,
    agentRunId?: string,
  ): Promise<{ state: ExecutionState; result: PhaseResult }> {
    // Load or initialize state
    let state = await ExecutionLoop.loadState(projectCellId);
    if (!state) {
      const cell = await prisma.projectCell.findUnique({
        where: { id: projectCellId },
        select: { objective: true, successCriteria: true },
      });
      if (!cell) throw new Error(`ProjectCell ${projectCellId} not found`);

      state = await ExecutionLoop.initialize(
        projectCellId,
        cell.objective,
        Array.isArray(cell.successCriteria) ? cell.successCriteria as string[] : [],
      );
    }

    // Execute the current phase
    const result = await this.executePhase(state, agentRunId);

    // Transition to the recommended next phase
    if (result.recommendedNextPhase && result.recommendedNextPhase !== state.phase) {
      state = await ExecutionLoop.transition(
        state,
        result.recommendedNextPhase as ExecutionPhase,
        result.reason,
        result.output,
      );
    }

    // If the new phase isn't terminal, schedule the next phase
    if (!['completed', 'failed', 'blocked'].includes(state.phase)) {
      await enqueueOrchestration({
        type: 'run_phase',
        projectCellId,
        phase: state.phase,
        userId: await this.getOwnerId(),
      }, { delay: 1000 }); // Small delay to prevent tight loops
    }

    // If blocked, notify the owner
    if (state.phase === 'blocked') {
      await this.notifyOwnerBlocked(state, result);
    }

    // If completed, notify the owner
    if (state.phase === 'completed') {
      await this.notifyOwnerCompleted(state);
    }

    // Update the agent run if we have one
    if (agentRunId) {
      await prisma.agentRun.update({
        where: { id: agentRunId },
        data: {
          currentPhase: state.phase,
          status: state.phase === 'completed' ? 'completed' 
               : state.phase === 'failed' ? 'failed' 
               : 'running',
        },
      });
    }

    return { state, result };
  }

  /**
   * Start a new goal through the execution loop.
   */
  static async startGoal(
    projectCellId: string,
    userId: string,
  ): Promise<ExecutionState> {
    const cell = await prisma.projectCell.findUnique({
      where: { id: projectCellId },
      select: { objective: true, successCriteria: true },
    });
    if (!cell) throw new Error(`ProjectCell ${projectCellId} not found`);

    const state = await ExecutionLoop.initialize(
      projectCellId,
      cell.objective,
      Array.isArray(cell.successCriteria) ? cell.successCriteria as string[] : [],
    );

    // Enqueue the first phase
    await enqueueOrchestration({
      type: 'run_phase',
      projectCellId,
      phase: 'ideate',
      userId,
    });

    return state;
  }

  /**
   * Resume a blocked execution loop (after owner provides input).
   */
  static async resumeFromBlocked(
    projectCellId: string,
    resumeToPhase: ExecutionPhase,
    ownerInput?: string,
  ): Promise<ExecutionState> {
    let state = await ExecutionLoop.loadState(projectCellId);
    if (!state) throw new Error(`No execution state for ${projectCellId}`);
    if (state.phase !== 'blocked') {
      throw new Error(`Cannot resume: state is ${state.phase}, not blocked`);
    }

    // Record the owner's input
    if (ownerInput) {
      await MemoryManager.addMemory({
        content: `Owner input for "${state.objective}": ${ownerInput}`,
        category: 'projects',
        confidence: 1.0,
        source: 'owner_input',
        projectCellId,
      });
    }

    // Transition to the requested phase
    state = await ExecutionLoop.transition(
      state,
      resumeToPhase,
      `Owner resumed with input: ${ownerInput || 'no additional input'}`,
    );

    // Enqueue the next phase
    await enqueueOrchestration({
      type: 'run_phase',
      projectCellId,
      phase: state.phase,
      userId: await this.getOwnerId(),
    });

    return state;
  }

  // ── Private: Phase Dispatch ─────────────────────────────

  private static async executePhase(
    state: ExecutionState,
    agentRunId?: string,
  ): Promise<PhaseResult> {
    console.log(`[Orchestrator] Executing phase: ${state.phase} for "${state.objective.substring(0, 50)}..."`);

    switch (state.phase) {
      case 'ideate':
        return IdeatePhaseRunner.run(state, agentRunId);

      case 'research':
        return ResearchPhaseRunner.run(state, agentRunId);

      case 'plan':
        return PlanPhaseRunner.run(state, agentRunId);

      case 'build':
        return BuildPhaseRunner.run(state, agentRunId);

      case 'validate':
        return ValidatePhaseRunner.run(state, agentRunId);

      case 'deliver':
        return DeliverPhaseRunner.run(state, agentRunId);

      default:
        throw new Error(`Unknown phase: ${state.phase}`);
    }
  }

  // ── Private: Notifications ──────────────────────────────

  private static async notifyOwnerBlocked(
    state: ExecutionState,
    result: PhaseResult,
  ): Promise<void> {
    const userId = await this.getOwnerId();
    const message = [
      `🚧 *Execution Blocked*`,
      ``,
      `Goal: ${state.objective}`,
      `Phase: ${state.phase}`,
      `Reason: ${result.reason}`,
      ``,
      `Iterations: ${state.iterationCount}/${state.maxIterations}`,
      result.issues.length > 0 ? `Issues: ${result.issues.join('; ')}` : '',
      ``,
      `Reply to resume or provide guidance.`,
    ].filter(Boolean).join('\n');

    await enqueueNotification({
      type: 'send_notification',
      channel: 'telegram',
      userId,
      message,
      metadata: {
        projectCellId: state.projectCellId,
        phase: state.phase,
        action: 'execution_blocked',
      },
    });
  }

  private static async notifyOwnerCompleted(state: ExecutionState): Promise<void> {
    const userId = await this.getOwnerId();
    const summary = ExecutionLoop.summarize(state);

    await enqueueNotification({
      type: 'send_notification',
      channel: 'telegram',
      userId,
      message: `✅ *Goal Completed*\n\n${summary}`,
      metadata: {
        projectCellId: state.projectCellId,
        action: 'execution_completed',
      },
    });
  }

  private static async getOwnerId(): Promise<string> {
    const owner = await prisma.user.findFirst({ select: { id: true } });
    if (!owner) throw new Error('No owner found.');
    return owner.id;
  }
}
