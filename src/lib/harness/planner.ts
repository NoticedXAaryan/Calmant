import { GoogleGenerativeAI, Schema, SchemaType } from "@google/generative-ai";
import { PLAN_SYSTEM_PROMPT } from "./prompts/plan";
import { Plan, PlanSchema, TaskClassification } from "./types";
import { registry } from "../tools/registry";

export class TaskPlanner {
  private genAI: GoogleGenerativeAI;
  private modelName: string;

  constructor(apiKey: string, modelName: string = "gemini-2.5-pro") {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.modelName = modelName;
  }

  async createPlan(userInput: string, classification: TaskClassification, context?: string): Promise<Plan> {
    const model = this.genAI.getGenerativeModel({
      model: this.modelName,
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            goal: { type: SchemaType.STRING },
            steps: {
              type: SchemaType.ARRAY,
              items: {
                type: SchemaType.OBJECT,
                properties: {
                  id: { type: SchemaType.STRING, description: "Unique identifier for the step (e.g., 'step-1')" },
                  description: { type: SchemaType.STRING, description: "What this step accomplishes" },
                  tool: { type: SchemaType.STRING, description: "The name of the tool to execute" },
                  argumentsTemplate: { type: SchemaType.OBJECT, description: "The arguments to pass to the tool." },
                  fallbackStrategy: { type: SchemaType.STRING, description: "What to do if this step fails" },
                },
                required: ["id", "description", "tool", "argumentsTemplate"],
              }
            }
          },
          required: ["goal", "steps"],
        } as unknown as Schema,
      },
    });

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
      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        systemInstruction,
      });

      const responseText = result.response.text();
      const parsedJson = JSON.parse(responseText);
      
      // Validate with Zod
      return PlanSchema.parse(parsedJson);
    } catch (error) {
      console.error("Planning error:", error);
      throw new Error("Failed to generate a valid plan: " + (error instanceof Error ? error.message : String(error)));
    }
  }
}
