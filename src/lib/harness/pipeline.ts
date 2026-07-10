import { TaskClassifier } from "./classifier";
import { TaskPlanner } from "./planner";
import { TaskExecutor } from "./executor";
import { TaskSynthesizer } from "./synthesizer";
import { ModelRouter, RouterOptions } from "./model-router";
import { SynthesisResult } from "./types";
import { ToolContext } from "../tools/registry";

export interface PipelineOptions {
  apiKey: string;
  context?: string;
  routerOptions?: RouterOptions;
  callbacks?: {
    onClassified?: (classification: any) => void;
    onPlanned?: (plan: any) => void;
    onStepComplete?: (result: any) => void;
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
    
    // 1. Classification
    const classifyModel = this.router.route({} as any, "classify", options.routerOptions).modelName;
    const classifier = new TaskClassifier(options.apiKey, classifyModel);
    
    const classification = await classifier.classify(userInput, options.context);
    console.log("[Pipeline] Classification:", classification.type, classification.complexity);
    if (options.callbacks?.onClassified) options.callbacks.onClassified(classification);

    // 2. Planning
    let plan;
    if (classification.type === "question" && classification.complexity === "low") {
      // Very simple questions might not need a complex plan, but for uniformity we generate one
      // In a more advanced version, we might skip straight to execution for single-tool lookups
      plan = await this.generatePlan(userInput, classification, options);
    } else {
      plan = await this.generatePlan(userInput, classification, options);
    }
    
    if (options.callbacks?.onPlanned) options.callbacks.onPlanned(plan);

    // Save classification and plan to DB for observability and resuming
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

    if (synthesis.proposeSkill && toolContext.projectCellId) {
      // Create a task for the Toolsmith to implement this new skill
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
      synthesis.response += "\n\n💡 I've proposed creating a new reusable Skill based on this workflow.";
    }

    console.log("[Pipeline] Synthesis complete");
    
    return synthesis;
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
    
    const toolContext: ToolContext = {
      userId: run.userId,
      runId: run.id,
      cwd: process.cwd(),
      env: process.env as Record<string, string>,
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

    if (synthesis.proposeSkill && toolContext.projectCellId) {
      const { prisma } = await import("../prisma");
      await prisma.projectTask.create({
        data: {
          title: "Implement New Skill for: " + classification.type,
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
}
