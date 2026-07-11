import { TaskClassifier } from "./classifier";
import { TaskPlanner } from "./planner";
import { TaskExecutor } from "./executor";
import { TaskSynthesizer } from "./synthesizer";
import { ModelRouter, RouterOptions } from "./model-router";
import { SynthesisResult } from "./types";
import { ToolContext } from "../tools/registry";
import { MemoryManager } from "../memory/memory-manager";
import { SoulWriter } from "../memory/soul-writer";
import { ExecutionLoop, type ExecutionState } from "../execution/execution-loop";

export interface PipelineOptions {
  apiKey: string;
  context?: string;
  routerOptions?: RouterOptions;
  callbacks?: {
    onClassified?: (classification: any) => void;
    onPlanned?: (plan: any) => void;
    onStepComplete?: (result: any) => void;
    onPhaseChange?: (phase: string) => void;
  };
}

export class AgentPipeline {
  private router: ModelRouter;
  private executor: TaskExecutor;

  constructor() {
    this.router = new ModelRouter();
    this.executor = new TaskExecutor();
  }

  async run(userInput: string, toolContext: ToolContext, options: PipelineOptions): Promise<SynthesisResult> {
    console.log("[Pipeline] Starting run for:", userInput.substring(0, 50) + "...");
    
    // ── Build structured memory context ──────────────────
    const memoryContext = await MemoryManager.buildContext(
      userInput,
      toolContext.projectCellId,
    );

    // Merge memory context into the options context
    const enrichedContext = [
      options.context || '',
      '',
      '## Memory Context (from soul files and database)',
      memoryContext.identity,
      '',
      '### Owner Context',
      memoryContext.ownerContext,
      '',
      '### Active Goals',
      memoryContext.activeGoals,
      '',
      '### Available Skills',
      memoryContext.relevantSkills,
      '',
      memoryContext.projectContext ? `### Project Context\n${memoryContext.projectContext}` : '',
      '',
      '### Recent Activity',
      memoryContext.recentActivity,
    ].filter(Boolean).join('\n');

    const enrichedOptions: PipelineOptions = {
      ...options,
      context: enrichedContext,
    };

    // 1. Classification
    const classifyModel = this.router.route({} as any, "classify", options.routerOptions).modelName;
    const classifier = new TaskClassifier(options.apiKey, classifyModel);
    
    const classification = await classifier.classify(userInput, enrichedOptions.context);
    console.log("[Pipeline] Classification:", classification.type, classification.complexity);
    if (options.callbacks?.onClassified) options.callbacks.onClassified(classification);

    // ── Check if this should be a long-term job ─────────
    const isLongTermJob = classification.complexity === 'high' && classification.estimatedSteps > 3;

    if (isLongTermJob && toolContext.projectCellId) {
      return await this.runWithExecutionLoop(
        userInput, toolContext, enrichedOptions, classification,
      );
    }

    // 2. Planning (short-term tasks)
    const plan = await this.generatePlan(userInput, classification, enrichedOptions);
    if (options.callbacks?.onPlanned) options.callbacks.onPlanned(plan);

    // Save classification and plan to DB
    const { prisma } = await import("../prisma");
    await prisma.agentRun.update({
      where: { id: toolContext.runId },
      data: { classification: classification as any, plan: plan as any }
    });

    if (toolContext.projectCellId) {
      for (const step of plan.steps) {
        await prisma.projectTask.create({
          data: {
            title: step.id,
            description: step.description,
            status: "pending",
            projectCellId: toolContext.projectCellId,
            assignedSkill: step.assignedSkill || null,
          }
        });
      }
    }

    // 3. Execution
    const results = await this.executor.executePlan(plan, toolContext);

    // Run QA if we are part of a project task
    let qaPassed = true;
    let qaFeedback = "";
    if (toolContext.projectTaskId) {
      const { QAService } = await import("../services/qa-service");
      const qaResult = await QAService.runQA(toolContext.projectTaskId, toolContext.runId, plan, results);
      qaPassed = qaResult.passed;
      qaFeedback = qaResult.feedback || "";
    }
    
    // 4. Synthesis
    const synthesizeModel = this.router.route(classification, "synthesize", options.routerOptions).modelName;
    const synthesizer = new TaskSynthesizer(options.apiKey, synthesizeModel);
    
    const synthesis = await synthesizer.synthesize(userInput, plan, results);
    if (!qaPassed) {
      synthesis.response = `⚠️ QA Failed: ${qaFeedback}\n\n${synthesis.response}`;
    }

    // ── Save learnings to soul memory ────────────────────
    if (synthesis.learnings && synthesis.learnings.length > 0) {
      for (const learning of synthesis.learnings) {
        await MemoryManager.addMemory({
          content: learning.fact,
          category: this.mapLearningCategory(learning.category),
          confidence: 0.7,
          source: `agent_run:${toolContext.runId}`,
          projectCellId: toolContext.projectCellId,
          agentRunId: toolContext.runId,
        });
      }
    }

    if (synthesis.proposeSkill && toolContext.projectCellId) {
      const { prisma } = await import("../prisma");
      await prisma.projectTask.create({
        data: {
          title: "Implement New Skill for: " + classification.type,
          description: "The agent proposed creating a new skill for this workflow: " + userInput,
          status: "pending",
          projectCellId: toolContext.projectCellId,
          assignedSkill: "Toolsmith Integrations Engineer Skill",
        }
      });

      // Also propose the skill in soul files
      SoulWriter.proposeSkill({
        name: `Learned: ${classification.type}`,
        trigger: userInput.substring(0, 100),
        process: plan.steps.map(s => s.description).join(' → '),
        tools: plan.steps.map(s => s.tool).join(', '),
        qualityGate: 'Verify output matches original request',
        learnedFrom: `Goal: ${userInput.substring(0, 100)}`,
      });

      synthesis.response += "\n\n💡 I've proposed creating a new reusable Skill based on this workflow.";
    }

    console.log("[Pipeline] Synthesis complete");
    
    return synthesis;
  }

  /**
   * Run a high-complexity job through the full execution loop
   * (Ideate → Research → Plan → Build → Validate → Deliver)
   */
  private async runWithExecutionLoop(
    userInput: string,
    toolContext: ToolContext,
    options: PipelineOptions,
    classification: any,
  ): Promise<SynthesisResult> {
    console.log("[Pipeline] Starting execution loop for complex job");

    if (!toolContext.projectCellId) {
      throw new Error("Long-term jobs require a project cell");
    }

    // Initialize or load execution state
    let state = await ExecutionLoop.loadState(toolContext.projectCellId);
    if (!state) {
      // Extract success criteria from the classification
      const successCriteria = classification.reasoning
        ? [classification.reasoning]
        : [`Complete: ${userInput.substring(0, 200)}`];

      state = await ExecutionLoop.initialize(
        toolContext.projectCellId,
        userInput,
        successCriteria,
      );
    }

    if (options.callbacks?.onPhaseChange) {
      options.callbacks.onPhaseChange(state.phase);
    }

    // Update the agent run with execution loop info
    const { prisma } = await import("../prisma");
    await prisma.agentRun.update({
      where: { id: toolContext.runId },
      data: {
        classification: classification as any,
        currentPhase: state.phase,
      }
    });

    // Return a status synthesis showing the execution loop state
    const statusSummary = ExecutionLoop.summarize(state);
    
    return {
      response: [
        `🏭 **Long-term job initialized**`,
        '',
        statusSummary,
        '',
        `The execution loop will run through: **Ideate → Research → Plan → Build → Validate → Deliver**`,
        '',
        `If issues are encountered, the system will loop back to research and try alternative approaches.`,
        `You'll be asked for approval before any external actions.`,
      ].join('\n'),
      learnings: [{
        fact: `Created long-term job: ${userInput.substring(0, 100)}`,
        category: 'task',
      }],
    };
  }
  
  private async generatePlan(userInput: string, classification: any, options: PipelineOptions) {
    const planModel = this.router.route(classification, "plan", options.routerOptions).modelName;
    const planner = new TaskPlanner(options.apiKey, planModel);
    return await planner.createPlan(userInput, classification, options.context);
  }

  async resume(runId: string, options: PipelineOptions): Promise<SynthesisResult> {
    const { prisma } = await import("../prisma");
    const run = await prisma.agentRun.findUnique({ where: { id: runId } });
    if (!run) throw new Error(`Cannot resume: Run ${runId} not found`);
    if (!run.plan) throw new Error(`Cannot resume: Run ${runId} has no plan`);

    const plan = run.plan as any;
    const contextSnapshot = run.contextSnapshot as { results: any[], outputs: Record<string, any> } | undefined;
    
    // Build memory context for the resumed run
    const memoryContext = await MemoryManager.buildContext(
      run.prompt,
      run.projectCellId || undefined,
    );

    const toolContext: ToolContext = {
      userId: run.userId,
      runId: run.id,
      cwd: process.cwd(),
      env: process.env as Record<string, string>,
      projectCellId: run.projectCellId || undefined,
      projectTaskId: run.projectTaskId || undefined,
    };

    console.log(`[Pipeline] Resuming run ${runId}...`);
    
    // 3. Resume Execution
    const results = await this.executor.executePlan(plan, toolContext, contextSnapshot);
    
    // Run QA if we are part of a project task
    let qaPassed = true;
    let qaFeedback = "";
    if (toolContext.projectTaskId) {
      const { QAService } = await import("../services/qa-service");
      const qaResult = await QAService.runQA(toolContext.projectTaskId, toolContext.runId, plan, results);
      qaPassed = qaResult.passed;
      qaFeedback = qaResult.feedback || "";
    }
    
    // 4. Synthesis
    const classification = run.classification || { type: "task", complexity: "medium" };
    const synthesizeModel = this.router.route(classification as any, "synthesize", options.routerOptions).modelName;
    const synthesizer = new TaskSynthesizer(options.apiKey, synthesizeModel);
    
    const synthesis = await synthesizer.synthesize("Resumed execution", plan, results);
    if (!qaPassed) {
      synthesis.response = `⚠️ QA Failed: ${qaFeedback}\n\n${synthesis.response}`;
    }

    // Save learnings from resumed run
    if (synthesis.learnings && synthesis.learnings.length > 0) {
      for (const learning of synthesis.learnings) {
        await MemoryManager.addMemory({
          content: learning.fact,
          category: this.mapLearningCategory(learning.category),
          confidence: 0.7,
          source: `agent_run:${runId}`,
          projectCellId: run.projectCellId || undefined,
          agentRunId: runId,
        });
      }
    }

    if (synthesis.proposeSkill && toolContext.projectCellId) {
      const { prisma } = await import("../prisma");
      await prisma.projectTask.create({
        data: {
          title: "Implement New Skill for: " + ((classification as any).type || "task"),
          description: "The agent proposed creating a new skill for this resumed workflow",
          status: "pending",
          projectCellId: toolContext.projectCellId,
          assignedSkill: "Toolsmith Integrations Engineer Skill",
        }
      });
      synthesis.response += "\n\n💡 I've proposed creating a new reusable Skill based on this workflow.";
    }

    console.log(`[Pipeline] Resumed synthesis complete for run ${runId}`);
    
    return synthesis;
  }

  /**
   * Map learning categories from synthesis to memory categories.
   */
  private mapLearningCategory(category: string): 'identity' | 'preferences' | 'projects' | 'skills' | 'relationships' | 'patterns' | 'corrections' {
    const mapping: Record<string, any> = {
      'preference': 'preferences',
      'fact': 'identity',
      'skill': 'skills',
      'pattern': 'patterns',
      'project': 'projects',
      'relationship': 'relationships',
      'correction': 'corrections',
    };
    return mapping[category.toLowerCase()] || 'patterns';
  }
}
