import { PLAN_SYSTEM_PROMPT } from "./prompts/plan";
import { Plan, PlanSchema, TaskClassification } from "./types";
import { registry } from "../tools/registry";
import { ModelRouter } from "../agent-runtime/model-router";

export class TaskPlanner {
  private modelName: string;

  constructor(apiKey: string, modelName: string = "gpt-4o") {
    this.modelName = modelName;
  }

  async createPlan(userInput: string, classification: TaskClassification, context?: string, runId?: string): Promise<Plan> {
    const toolDescriptions = registry.getAll().map(t => `- ${t.name}: ${t.description}`).join('\n');
    
    let systemInstruction = PLAN_SYSTEM_PROMPT
      .replace("{{TOOL_REGISTRY}}", toolDescriptions)
      .replace("{{CLASSIFICATION}}", JSON.stringify(classification, null, 2));

    const prompt = `
Context:
${context || 'None'}

User Request:
${userInput}
`;

    try {
      const result = await ModelRouter.generateObject(
        prompt,
        PlanSchema,
        {
          model: this.modelName,
          system: systemInstruction,
          runId
        }
      );
      
      return result;
    } catch (error) {
      console.error("Planning error:", error);
      throw new Error("Failed to generate a valid plan: " + (error instanceof Error ? error.message : String(error)));
    }
  }
}
