// Unified Model Router — OpenRouter Free (primary) + Gemini Flash (fallback)
// Every department calls getModel() — provider selection is transparent.
// Uses @ai-sdk/openai for OpenRouter (already installed).
// Falls back to our existing gemini.ts client for raw calls.

import { createOpenAI } from "@ai-sdk/openai";

// --- Provider factory ---

let _openRouterProvider: ReturnType<typeof createOpenAI> | null = null;

function getOpenRouterProvider() {
  if (_openRouterProvider) return _openRouterProvider;
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return null;
  _openRouterProvider = createOpenAI({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey,
  });
  return _openRouterProvider;
}

// --- Model selection ---

export type ModelPreference = "fast" | "smart" | "vision";

/**
 * Get the best available AI SDK model instance for Mastra agents.
 * All departments use this — provider selection is invisible to them.
 *
 * Usage:
 *   const model = getModel("fast");   // Capture, Comms — quick responses
 *   const model = getModel("smart");  // CEO, Intel — complex reasoning
 *   const model = getModel("vision"); // Browser Dept — screenshot analysis
 */
export function getModel(preference: ModelPreference = "fast"): any {
  const provider = getOpenRouterProvider();
  if (provider) {
    return provider("openrouter/free");
  }

  // If OpenRouter isn't configured, try using the Gemini model via OpenAI-compatible
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey) {
    const geminiAsOpenAI = createOpenAI({
      baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
      apiKey: geminiKey,
    });
    return geminiAsOpenAI("gemini-2.5-flash");
  }

  throw new Error(
    "No LLM provider available. Set OPENROUTER_API_KEY or GEMINI_API_KEY in .env"
  );
}

/**
 * Raw LLM call with automatic fallback.
 * Used by tools that need raw text/JSON from the LLM (e.g., decomposition, extraction).
 */
export async function llmChat(
  prompt: string,
  options: { systemPrompt?: string; jsonMode?: boolean } = {}
): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (apiKey) {
    const messages: Array<{ role: string; content: string }> = [];
    if (options.systemPrompt) {
      messages.push({ role: "system", content: options.systemPrompt });
    }
    messages.push({ role: "user", content: prompt });

    try {
      const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "openrouter/free",
          messages,
          ...(options.jsonMode && { response_format: { type: "json_object" } }),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        return data.choices?.[0]?.message?.content || "";
      }
      console.warn(`[ModelRouter] OpenRouter ${res.status}, falling back to Gemini`);
    } catch (err) {
      console.warn("[ModelRouter] OpenRouter unreachable, falling back to Gemini");
    }
  }

  // Fallback to Gemini
  const { callGemini } = await import("../lib/gemini");
  return callGemini(prompt, { systemInstruction: options.systemPrompt });
}

/**
 * LLM call with JSON output — attempts JSON mode, falls back to text parsing.
 */
export async function llmJSON<T>(
  prompt: string,
  options: { systemPrompt?: string } = {}
): Promise<T> {
  const jsonPrompt = `${prompt}\n\nIMPORTANT: Return ONLY valid JSON. No markdown, no code fences, no explanation.`;
  const text = await llmChat(jsonPrompt, { ...options, jsonMode: true });

  const jsonMatch = text.match(/\{[\s\S]*\}/) || text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    throw new Error(`LLM returned non-JSON: ${text.slice(0, 200)}`);
  }
  return JSON.parse(jsonMatch[0]) as T;
}

/**
 * Check which providers are available.
 */
export function getProviderStatus() {
  return {
    openrouter: {
      configured: !!process.env.OPENROUTER_API_KEY,
      model: "openrouter/free",
    },
    gemini: {
      configured: !!process.env.GEMINI_API_KEY,
      model: "gemini-2.5-flash",
    },
  };
}
