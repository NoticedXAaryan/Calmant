import { GoogleGenerativeAI, Schema, SchemaType } from "@google/generative-ai";
import { SYNTHESIZE_SYSTEM_PROMPT } from "./prompts/synthesize";
import { Plan, StepResult, SynthesisResult, SynthesisResultSchema } from "./types";

export class TaskSynthesizer {
  private genAI: GoogleGenerativeAI;
  private modelName: string;

  constructor(apiKey: string, modelName: string = "gemini-2.5-pro") {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.modelName = modelName;
  }

  async synthesize(userInput: string, plan: Plan, results: StepResult[]): Promise<SynthesisResult> {
    const model = this.genAI.getGenerativeModel({
      model: this.modelName,
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            response: { type: SchemaType.STRING, description: "The final message to return to the user" },
            learnings: {
              type: SchemaType.ARRAY,
              description: "New facts or preferences learned",
              items: {
                type: SchemaType.OBJECT,
                properties: {
                  fact: { type: SchemaType.STRING },
                  category: { type: SchemaType.STRING },
                },
                required: ["fact", "category"],
              }
            },
            proposeSkill: { type: SchemaType.BOOLEAN, description: "Whether to propose saving as a skill" },
          },
          required: ["response"],
        } as unknown as Schema,
      },
    });

    const prompt = `
User Request:
${userInput}

Execution Plan:
${JSON.stringify(plan, null, 2)}

Step Results:
${JSON.stringify(results, null, 2)}
`;

    try {
      const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        systemInstruction: SYNTHESIZE_SYSTEM_PROMPT,
      });

      const responseText = result.response.text();
      const parsedJson = JSON.parse(responseText);
      
      return SynthesisResultSchema.parse(parsedJson);
    } catch (error) {
      console.error("Synthesis error:", error);
      // Fallback response if the model fails to synthesize
      return {
        response: "I encountered an error while formulating my response, but the task steps have completed. Please check your dashboard or logs for details.",
      };
    }
  }
}
