import { Plan, PlanStep, StepResult } from "./types";
import { registry, ToolContext } from "../tools/registry";

export class TaskExecutor {
  constructor() {}

  async executePlan(plan: Plan, context: ToolContext): Promise<StepResult[]> {
    const results: StepResult[] = [];
    const stepOutputs: Record<string, any> = {};

    for (const step of plan.steps) {
      console.log(`[Executor] Executing step ${step.id}: ${step.description}`);
      
      try {
        // Resolve arguments template using previous outputs
        const resolvedArgs = this.resolveArguments(step.argumentsTemplate, stepOutputs);
        
        // Execute tool
        const output = await registry.execute(step.tool, resolvedArgs, context);
        
        const result: StepResult = {
          stepId: step.id,
          tool: step.tool,
          status: "success",
          output
        };
        
        results.push(result);
        stepOutputs[step.id] = output;
      } catch (error) {
        console.error(`[Executor] Error in step ${step.id}:`, error);
        
        const result: StepResult = {
          stepId: step.id,
          tool: step.tool,
          status: "error",
          error: error instanceof Error ? error.message : String(error)
        };
        
        results.push(result);
        
        if (step.fallbackStrategy === "skip") {
          console.log(`[Executor] Skipping step ${step.id} due to error (fallback strategy)`);
          continue;
        } else if (step.fallbackStrategy === "ask_user_for_help") {
          // This would ideally pause execution and wait for user, but for now we throw to bubble up
          throw new Error(`Step ${step.id} failed and requires user intervention: ${result.error}`);
        } else {
          // Default behavior on error without specific fallback: fail the plan
          throw new Error(`Plan execution failed at step ${step.id}: ${result.error}`);
        }
      }
    }

    return results;
  }

  private resolveArguments(template: Record<string, any>, previousOutputs: Record<string, any>): any {
    if (typeof template === 'string') {
      return this.interpolateString(template, previousOutputs);
    }
    
    if (Array.isArray(template)) {
      return template.map(item => this.resolveArguments(item, previousOutputs));
    }
    
    if (typeof template === 'object' && template !== null) {
      const resolved: Record<string, any> = {};
      for (const [key, value] of Object.entries(template)) {
        resolved[key] = this.resolveArguments(value, previousOutputs);
      }
      return resolved;
    }
    
    return template;
  }

  private interpolateString(str: string, context: Record<string, any>): string {
    // Looks for {{stepId.field.subfield}} patterns
    return str.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
      const value = this.getValueByPath(context, path.trim());
      if (value === undefined) {
        console.warn(`[Executor] Warning: Unresolved interpolation path: ${path}`);
        return match; // Leave un-interpolated if not found
      }
      return typeof value === 'object' ? JSON.stringify(value) : String(value);
    });
  }

  private getValueByPath(obj: any, path: string): any {
    const parts = path.split('.');
    let current = obj;
    for (const part of parts) {
      if (current === null || current === undefined) return undefined;
      current = current[part];
    }
    return current;
  }
}
