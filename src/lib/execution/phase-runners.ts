/**
 * Phase Runners — Execute each phase of the Research → Build → Validate cycle.
 * 
 * Each runner:
 * 1. Receives context from the execution loop
 * 2. Performs its work (calling tools, models, etc.)
 * 3. Returns output and a recommended next phase
 * 
 * The runners are designed to be called by the orchestrator,
 * not directly. They don't make transition decisions — they
 * produce output and recommendations.
 */
import { prisma } from '../prisma';
import { MemoryManager } from '../memory/memory-manager';
import type { ExecutionState, PhaseContext, ResearchItem, ValidationResult } from './execution-loop';

// ── Types ────────────────────────────────────────────────

export interface PhaseResult {
  /** Output data from this phase */
  output: Record<string, any>;
  /** Recommended next phase */
  recommendedNextPhase: string;
  /** Reason for the recommendation */
  reason: string;
  /** Whether the phase completed successfully */
  success: boolean;
  /** Issues encountered */
  issues: string[];
  /** Lessons learned */
  lessons: string[];
  /** Decisions made */
  decisions: string[];
}

// ── Ideation Phase ───────────────────────────────────────

export class IdeatePhaseRunner {
  /**
   * Break down the objective into sub-problems and success criteria.
   * If this is a loop-back, incorporate lessons from previous attempts.
   */
  static async run(state: ExecutionState, agentRunId?: string): Promise<PhaseResult> {
    const issues: string[] = [];
    const lessons: string[] = [];
    const decisions: string[] = [];

    // Build context
    const context = await MemoryManager.buildContext(state.objective, state.projectCellId);

    // Analyze the objective
    const breakdown = {
      objective: state.objective,
      subProblems: [] as string[],
      assumptions: [] as string[],
      risks: [] as string[],
      requiredResearch: [] as string[],
      successCriteria: state.successCriteria,
    };

    // If we're looping back, we have previous context
    if (state.iterationCount > 0) {
      const previousIssues = state.phaseContexts.build?.issues || [];
      const validationFailures = state.validationResults.filter(r => !r.passed);

      if (previousIssues.length > 0) {
        breakdown.requiredResearch.push(
          `Previous attempt failed due to: ${previousIssues.join('; ')}. Need to research alternative approaches.`
        );
        lessons.push(`Previous approach had issues: ${previousIssues.join('; ')}`);
      }

      if (validationFailures.length > 0) {
        breakdown.requiredResearch.push(
          `Validation failed for: ${validationFailures.map(f => f.criterion).join('; ')}. Need to adjust approach.`
        );
        lessons.push(`Failed criteria: ${validationFailures.map(f => `${f.criterion} — ${f.suggestion || 'no suggestion'}`).join('; ')}`);
      }

      decisions.push(`Iteration ${state.iterationCount}: re-evaluating approach based on previous failures`);
    }

    // Determine what research is needed
    if (breakdown.requiredResearch.length === 0) {
      breakdown.requiredResearch.push(`Understand the domain and requirements for: ${state.objective}`);
      breakdown.requiredResearch.push(`Identify available tools and approaches`);
      breakdown.requiredResearch.push(`Find examples of successful implementations`);
    }

    // Store as project tasks
    for (const research of breakdown.requiredResearch) {
      await prisma.projectTask.create({
        data: {
          projectCellId: state.projectCellId,
          title: `Research: ${research.substring(0, 100)}`,
          description: research,
          status: 'pending',
          assignedSkill: 'Research Analyst',
        },
      });
    }

    return {
      output: breakdown,
      recommendedNextPhase: 'research',
      reason: `Identified ${breakdown.requiredResearch.length} research topics to explore`,
      success: true,
      issues,
      lessons,
      decisions,
    };
  }
}

// ── Research Phase ───────────────────────────────────────

export class ResearchPhaseRunner {
  /**
   * Gather information, validate assumptions, structure findings.
   * This is where the agent does its homework before building.
   */
  static async run(state: ExecutionState, agentRunId?: string): Promise<PhaseResult> {
    const issues: string[] = [];
    const lessons: string[] = [];
    const decisions: string[] = [];

    // Get research topics from ideation
    const ideationOutput = state.phaseContexts.ideate?.output || {};
    const requiredResearch: string[] = ideationOutput.requiredResearch || [state.objective];

    // For each research topic, create a structured research item
    const newResearch: ResearchItem[] = [];
    for (const topic of requiredResearch) {
      // Mark the research task as running
      const researchTask = await prisma.projectTask.findFirst({
        where: {
          projectCellId: state.projectCellId,
          title: { contains: topic.substring(0, 50) },
          status: 'pending',
        },
      });

      if (researchTask) {
        await prisma.projectTask.update({
          where: { id: researchTask.id },
          data: { status: 'running' },
        });
      }

      // Create a research item (actual research will be done by the agent pipeline)
      newResearch.push({
        topic,
        findings: '', // To be filled by the agent
        sources: [],
        confidence: 0.5, // Low until validated
        timestamp: new Date().toISOString(),
      });
    }

    // Check if we have enough prior research
    const totalResearch = [...state.researchData, ...newResearch];
    const hasEnoughResearch = totalResearch.some(r => r.confidence >= 0.7);

    if (!hasEnoughResearch && state.iterationCount === 0) {
      decisions.push('First iteration — proceeding to planning with available research');
    }

    return {
      output: {
        researchItems: newResearch,
        totalResearchCount: totalResearch.length,
        previousResearch: state.researchData,
        readyForPlanning: true,
      },
      recommendedNextPhase: 'plan',
      reason: `Compiled ${totalResearch.length} research items. Ready to create execution plan.`,
      success: true,
      issues,
      lessons,
      decisions,
    };
  }
}

// ── Plan Phase ───────────────────────────────────────────

export class PlanPhaseRunner {
  /**
   * Create a concrete, step-by-step execution plan based on research.
   */
  static async run(state: ExecutionState, agentRunId?: string): Promise<PhaseResult> {
    const issues: string[] = [];
    const lessons: string[] = [];
    const decisions: string[] = [];

    // Build plan from research
    const plan = {
      steps: [] as Array<{
        order: number;
        title: string;
        description: string;
        skill: string;
        estimatedMinutes: number;
        requiresApproval: boolean;
        dependsOn: number[];
      }>,
      totalEstimatedMinutes: 0,
      requiredApprovals: 0,
      risks: [] as string[],
    };

    // If we have previous plan context (loop-back), use it to improve
    if (state.phaseContexts.plan?.output?.steps) {
      const previousPlan = state.phaseContexts.plan.output;
      lessons.push(`Previous plan had ${previousPlan.steps?.length || 0} steps. Revising based on new research.`);
    }

    // Create plan steps as project tasks
    // The actual plan generation will be done by the LLM through the agent pipeline
    // Here we set up the structure for the plan to be filled in
    decisions.push(`Plan created with research data from ${state.researchData.length} items`);

    return {
      output: plan,
      recommendedNextPhase: 'build',
      reason: 'Plan created. Ready to execute.',
      success: true,
      issues,
      lessons,
      decisions,
    };
  }
}

// ── Build Phase ──────────────────────────────────────────

export class BuildPhaseRunner {
  /**
   * Execute the plan step by step. If a step fails, record the issue
   * and recommend looping back to research.
   */
  static async run(state: ExecutionState, agentRunId?: string): Promise<PhaseResult> {
    const issues: string[] = [];
    const lessons: string[] = [];
    const decisions: string[] = [];

    // Get plan steps
    const plan = state.phaseContexts.plan?.output || {};
    const tasks = await prisma.projectTask.findMany({
      where: {
        projectCellId: state.projectCellId,
        status: { in: ['pending', 'running'] },
      },
      orderBy: { createdAt: 'asc' },
    });

    let completedCount = 0;
    let failedCount = 0;
    let blockedCount = 0;

    for (const task of tasks) {
      // Skip research tasks in the build phase
      if (task.title.startsWith('Research:')) continue;

      // Check task status
      if (task.status === 'completed') {
        completedCount++;
      } else if (task.status === 'failed') {
        failedCount++;
        issues.push(`Task failed: ${task.title}`);
      } else if (task.status === 'blocked') {
        blockedCount++;
      }
    }

    // Determine recommendation
    let recommendedNextPhase = 'validate';
    let reason = `Build phase complete. ${completedCount} tasks done.`;

    if (failedCount > 0) {
      // Failures detected — loop back to research
      recommendedNextPhase = 'research';
      reason = `${failedCount} tasks failed. Need to research alternative approaches.`;
      lessons.push(`Build phase encountered ${failedCount} failures. Looping back to research.`);
    } else if (blockedCount > 0) {
      recommendedNextPhase = 'blocked';
      reason = `${blockedCount} tasks blocked. Waiting for owner input.`;
    }

    return {
      output: {
        completedTasks: completedCount,
        failedTasks: failedCount,
        blockedTasks: blockedCount,
        artifacts: state.artifacts,
      },
      recommendedNextPhase,
      reason,
      success: failedCount === 0,
      issues,
      lessons,
      decisions,
    };
  }
}

// ── Validate Phase ───────────────────────────────────────

export class ValidatePhaseRunner {
  /**
   * Verify outputs against success criteria.
   * If validation fails, recommend looping back with specific feedback.
   */
  static async run(state: ExecutionState, agentRunId?: string): Promise<PhaseResult> {
    const issues: string[] = [];
    const lessons: string[] = [];
    const decisions: string[] = [];

    const results: ValidationResult[] = [];

    // Check each success criterion
    for (const criterion of state.successCriteria) {
      // Basic validation — in production, this would call QA tools
      const hasArtifact = state.artifacts.some(a =>
        a.description.toLowerCase().includes(criterion.toLowerCase().substring(0, 30))
      );

      results.push({
        criterion,
        passed: hasArtifact, // Simplified — real validation would be more sophisticated
        evidence: hasArtifact
          ? `Artifact found matching criterion`
          : `No artifact found matching: ${criterion}`,
        suggestion: hasArtifact ? undefined : `Need to create output that satisfies: ${criterion}`,
      });
    }

    // If no success criteria defined, check that we have at least one artifact
    if (state.successCriteria.length === 0) {
      results.push({
        criterion: 'At least one deliverable produced',
        passed: state.artifacts.length > 0,
        evidence: state.artifacts.length > 0
          ? `${state.artifacts.length} artifacts produced`
          : 'No artifacts produced',
      });
    }

    const allPassed = results.every(r => r.passed);
    const failedCriteria = results.filter(r => !r.passed);

    let recommendedNextPhase = allPassed ? 'deliver' : 'ideate';
    let reason = allPassed
      ? 'All validation criteria passed. Ready to deliver.'
      : `${failedCriteria.length} criteria failed. Looping back to re-evaluate approach.`;

    if (!allPassed) {
      // If only minor failures, try building again instead of full ideation loop
      if (failedCriteria.length === 1 && state.iterationCount < 2) {
        recommendedNextPhase = 'build';
        reason = `1 criterion failed: ${failedCriteria[0].criterion}. Attempting targeted fix.`;
      }
      issues.push(...failedCriteria.map(f => `Failed: ${f.criterion}`));
      lessons.push(`Validation attempt ${state.iterationCount + 1} failed: ${failedCriteria.map(f => f.criterion).join('; ')}`);
    }

    return {
      output: {
        validationResults: results,
        allPassed,
        failedCriteria: failedCriteria.map(f => f.criterion),
      },
      recommendedNextPhase,
      reason,
      success: allPassed,
      issues,
      lessons,
      decisions,
    };
  }
}

// ── Deliver Phase ────────────────────────────────────────

export class DeliverPhaseRunner {
  /**
   * Package results and present to the owner.
   */
  static async run(state: ExecutionState, agentRunId?: string): Promise<PhaseResult> {
    const decisions: string[] = [];

    // Create a delivery summary
    const summary = {
      objective: state.objective,
      completedAt: new Date().toISOString(),
      iterations: state.iterationCount,
      artifacts: state.artifacts,
      researchCount: state.researchData.length,
      validationResults: state.validationResults,
      loopBacks: state.loopBackReasons,
    };

    // Store as a report
    const owner = await prisma.user.findFirst({ select: { id: true } });
    if (owner) {
      await prisma.report.create({
        data: {
          userId: owner.id,
          projectCellId: state.projectCellId,
          type: 'ad_hoc',
          title: `Delivery Report: ${state.objective}`,
          content: JSON.stringify(summary, null, 2),
          payload: summary as any,
          status: 'generated',
        },
      });
    }

    // Learn from the successful completion
    if (state.iterationCount > 0) {
      await MemoryManager.addMemory({
        content: `Completed "${state.objective}" after ${state.iterationCount} iterations. Key lessons: ${state.phaseContexts.validate?.lessons?.join('; ') || 'none recorded'}.`,
        category: 'patterns',
        confidence: 0.8,
        source: 'execution_loop',
        projectCellId: state.projectCellId,
      });
    }

    decisions.push('Goal delivered successfully');

    return {
      output: summary,
      recommendedNextPhase: 'completed',
      reason: 'Delivery complete. All criteria met.',
      success: true,
      issues: [],
      lessons: state.loopBackReasons.length > 0
        ? [`Task required ${state.iterationCount} iterations to complete`]
        : ['Completed on first attempt'],
      decisions,
    };
  }
}
