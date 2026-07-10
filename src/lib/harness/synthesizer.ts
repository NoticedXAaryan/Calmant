import { SYNTHESIZE_SYSTEM_PROMPT } from "./prompts/synthesize";
import { Plan, StepResult, SynthesisResult, SynthesisResultSchema } from "./types";
import { ModelRouter } from "../agent-runtime/model-router";

export class TaskSynthesizer {
  private modelName: string;

  constructor(apiKey: string, modelName: string = "gpt-4o") {
    this.modelName = modelName;
  }

  async synthesize(userInput: string, plan: Plan, results: StepResult[], runId?: string): Promise<SynthesisResult> {
    const prompt = `
User Request:
${userInput}

Execution Plan:
${JSON.stringify(plan, null, 2)}

Step Results:
${JSON.stringify(results, null, 2)}
`;

    try {
      const result = await ModelRouter.generateObject(
        prompt,
        SynthesisResultSchema,
        {
          model: this.modelName,
          system: SYNTHESIZE_SYSTEM_PROMPT,
          runId
        }
      );
      
      return result;
    } catch (error) {
      console.error("Synthesis error:", error);
      // Fallback response if the model fails to synthesize
      return {
        response: "I encountered an error while formulating my response, but the task steps have completed. Please check your dashboard or logs for details.",
      };
    }
  }
}
