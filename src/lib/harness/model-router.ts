import { TaskClassification } from "./types";

export type ModelTier = "fast" | "standard" | "deep";

export interface ModelConfig {
  tier: ModelTier;
  modelName: string;
}

export interface RouterOptions {
  userPreference?: "cost_optimized" | "quality_optimized" | "balanced";
  forceModel?: string;
}

export class ModelRouter {
  // Default configurations for tiers
  private configs: Record<ModelTier, string> = {
    fast: "gemini-2.5-flash",
    standard: "gemini-2.5-pro",
    deep: "gemini-2.5-pro", // Could map to Gemini Ultra / Claude Opus if available
  };

  constructor(customConfigs?: Partial<Record<ModelTier, string>>) {
    if (customConfigs) {
      this.configs = { ...this.configs, ...customConfigs };
    }
  }

  route(classification: TaskClassification, stage: "classify" | "plan" | "synthesize", options?: RouterOptions): ModelConfig {
    if (options?.forceModel) {
      return { tier: "standard", modelName: options.forceModel }; // Forced override
    }

    let tier: ModelTier = "standard";

    // Classification is always fast/cheap
    if (stage === "classify") {
      tier = "fast";
    } 
    // Planning requires more reasoning
    else if (stage === "plan") {
      if (classification.complexity === "high") tier = "deep";
      else if (classification.complexity === "medium") tier = "standard";
      else tier = "fast"; // Very simple plans can use flash
      
      // Adjust based on user preferences
      if (options?.userPreference === "cost_optimized" && tier === "deep") tier = "standard";
      if (options?.userPreference === "quality_optimized" && tier === "fast") tier = "standard";
    } 
    // Synthesis depends on complexity
    else if (stage === "synthesize") {
      if (classification.complexity === "high") tier = "standard";
      else tier = "fast";
    }

    return {
      tier,
      modelName: this.configs[tier]
    };
  }

  getModelForTier(tier: ModelTier): string {
    return this.configs[tier];
  }
}
