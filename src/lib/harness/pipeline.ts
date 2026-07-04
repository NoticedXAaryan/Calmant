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

    // 3. Execution
    const results = await this.executor.executePlan(plan, toolContext);
    
    // 4. Synthesis
    const synthesizeModel = this.router.route(classification, "synthesize", options.routerOptions).modelName;
    const synthesizer = new TaskSynthesizer(options.apiKey, synthesizeModel);
    
    const synthesis = await synthesizer.synthesize(userInput, plan, results);
    console.log("[Pipeline] Synthesis complete");
    
    return synthesis;
  }
  
  private async generatePlan(userInput: string, classification: any, options: PipelineOptions) {
    const planModel = this.router.route(classification, "plan", options.routerOptions).modelName;
    const planner = new TaskPlanner(options.apiKey, planModel);
    return await planner.createPlan(userInput, classification, options.context);
  }
}
