import { Plan, PlanStep, StepResult } from "./types";
import { registry, ToolContext } from "../tools/registry";

import { ApprovalRequiredError } from "../errors";
import { ApprovalService } from "../agent-runtime/approval-service";
import { prisma } from "../prisma";

export class PipelinePausedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PipelinePausedError';
  }
}

export class TaskExecutor {
  constructor() {}

  async executePlan(plan: Plan, context: ToolContext, previousState?: { results: StepResult[], outputs: Record<string, any> }): Promise<StepResult[]> {
    const results: StepResult[] = previousState?.results || [];
    const stepOutputs: Record<string, any> = previousState?.outputs || {};

    for (const step of plan.steps) {
      if (stepOutputs[step.id]) {
        console.log(`[Executor] Skipping already completed step ${step.id}`);
        continue;
      }
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
        if (error instanceof ApprovalRequiredError) {
          console.log(`[Executor] Step ${step.id} requires approval. Pausing execution.`);
          await ApprovalService.createApproval(error.toolCallId);
          
          // Save state to AgentRun
          await prisma.agentRun.update({
            where: { id: context.runId },
            data: {
              contextSnapshot: { results, outputs: stepOutputs } as any,
              currentPhase: step.id
            }
          });

          throw new PipelinePausedError(`Pipeline paused for approval on step ${step.id}`);
        }

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
