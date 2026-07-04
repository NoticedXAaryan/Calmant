import { GoogleGenerativeAI, Schema, SchemaType } from "@google/generative-ai";
import { CLASSIFY_SYSTEM_PROMPT } from "./prompts/classify";
import { ClassificationResultSchema, TaskClassification } from "./types";
import { registry } from "../tools/registry";

export class TaskClassifier {
  private genAI: GoogleGenerativeAI;
  private modelName: string;

  constructor(apiKey: string, modelName: string = "gemini-2.5-flash") {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.modelName = modelName;
  }

  async classify(userInput: string, context?: string): Promise<TaskClassification> {
    const model = this.genAI.getGenerativeModel({
      model: this.modelName,
      generationConfig: {
        responseMimeType: "application/json",
        // Providing the schema equivalent to our Zod schema
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            type: {
              type: SchemaType.STRING,
              enum: ["question", "task", "watch"],
            },
            complexity: {
              type: SchemaType.STRING,
              enum: ["low", "medium", "high"],
            },
            requiredTools: {
              type: SchemaType.ARRAY,
              description: "Names of tools required from the registry",
              items: { type: SchemaType.STRING },
            },
            estimatedSteps: {
              type: SchemaType.INTEGER,
              description: "Estimated number of steps to complete the task",
            },
            reasoning: {
              type: SchemaType.STRING,
              description: "Brief explanation of the classification",
            },
          },
          required: ["type", "complexity", "requiredTools", "estimatedSteps", "reasoning"],
        } as unknown as Schema,
      },
    });

    const toolDescriptions = registry.getAll().map(t => `- ${t.name}: ${t.description}`).join('\n');
    
    let systemInstruction = CLASSIFY_SYSTEM_PROMPT.replace("{{TOOL_REGISTRY}}", toolDescriptions);

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
      
      // Validate with Zod just to be safe
      return ClassificationResultSchema.parse(parsedJson);
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
