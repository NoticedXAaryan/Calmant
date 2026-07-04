import { z } from "zod";

// Base schemas
export const ToolDefinitionSchema = z.object({
  name: z.string(),
  description: z.string(),
});

// Classifier schemas
export const TaskComplexitySchema = z.enum(["low", "medium", "high"]);
export const TaskTypeSchema = z.enum(["question", "task", "watch"]);

export const ClassificationResultSchema = z.object({
  type: TaskTypeSchema,
  complexity: TaskComplexitySchema,
  requiredTools: z.array(z.string()).describe("Names of tools required from the registry"),
  estimatedSteps: z.number().int().min(1).describe("Estimated number of steps to complete the task"),
  reasoning: z.string().describe("Brief explanation of the classification"),
});

export type TaskClassification = z.infer<typeof ClassificationResultSchema>;

// Planner schemas
export const PlanStepSchema = z.object({
  id: z.string().describe("Unique identifier for the step (e.g., 'step-1')"),
  description: z.string().describe("What this step accomplishes"),
  tool: z.string().describe("The name of the tool to execute"),
  argumentsTemplate: z.record(z.string(), z.any()).describe("The arguments to pass to the tool. Can use {{step-id.output_field}} to reference previous outputs."),
  fallbackStrategy: z.string().optional().describe("What to do if this step fails"),
});

export const PlanSchema = z.object({
  goal: z.string(),
  steps: z.array(PlanStepSchema),
});

export type PlanStep = z.infer<typeof PlanStepSchema>;
export type Plan = z.infer<typeof PlanSchema>;

// Executor / Synthesizer schemas
export interface StepResult {
  stepId: string;
  tool: string;
  status: "success" | "error";
  output?: any;
  error?: string;
}

export const SynthesisResultSchema = z.object({
  response: z.string().describe("The final message to return to the user"),
  learnings: z.array(z.object({
    fact: z.string(),
    category: z.string(),
  })).optional().describe("Any new facts or preferences learned about the user during this interaction"),
  proposeSkill: z.boolean().optional().describe("Whether this workflow was complex enough to propose saving as a skill"),
});

export type SynthesisResult = z.infer<typeof SynthesisResultSchema>;
