import { CLASSIFY_SYSTEM_PROMPT } from "./prompts/classify";
import { ClassificationResultSchema, TaskClassification } from "./types";
import { registry } from "../tools/registry";
import { ModelRouter } from "../agent-runtime/model-router";

export class TaskClassifier {
  private modelName: string;
  
  // Note: apiKey is no longer needed since ModelRouter handles it internally,
  // but keeping it in constructor to avoid breaking existing callers immediately.
  constructor(apiKey: string, modelName: string = "gpt-4o-mini") {
    this.modelName = modelName;
  }

  async classify(userInput: string, context?: string, runId?: string): Promise<TaskClassification> {
    const toolDescriptions = registry.getAll().map(t => `- ${t.name}: ${t.description}`).join('\n');
    let systemInstruction = CLASSIFY_SYSTEM_PROMPT.replace("{{TOOL_REGISTRY}}", toolDescriptions);

    const prompt = `
Context:
${context || 'None'}

User Request:
${userInput}
`;

    try {
      const result = await ModelRouter.generateObject(
        prompt, 
        ClassificationResultSchema, 
        { 
          model: this.modelName, 
          system: systemInstruction,
          runId 
        }
      );
      
      return result;
    } catch (error) {
      console.error("Classification error:", error);
      // Fallback for graceful degradation
      return {
        type: "task",
        complexity: "high",
        requiredTools: [],
        estimatedSteps: 3,
        reasoning: "Fallback due to classification error: " + (error instanceof Error ? error.message : String(error)),
      };
    }
  }
}
