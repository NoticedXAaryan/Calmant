// Unified LLM Client — Gemini Primary + Hermes (Ollama) Fallback
// Tries Gemini first, falls back to Hermes on 429/network error.
// Usage: import { chat, chatJSON } from '@/lib/llm';

import { callGemini, callGeminiJSON, isGeminiConfigured, type GeminiCallOptions } from './gemini';

export interface LLMResponse {
  text: string;
  model: 'gemini' | 'hermes';
}

export interface LLMOptions extends GeminiCallOptions {
  preferLocal?: boolean;  // Force Hermes (privacy mode / offline)
}

const HERMES_URL = process.env.HERMES_URL || 'http://localhost:11434';

/**
 * Check if Hermes (Ollama) is reachable.
 * Cached for 60s to avoid spamming health checks.
 */
let hermesAvailable: boolean | null = null;
let hermesCheckedAt = 0;

async function isHermesAvailable(): Promise<boolean> {
  const now = Date.now();
  if (hermesAvailable !== null && now - hermesCheckedAt < 60000) {
    return hermesAvailable;
  }

  try {
    const res = await fetch(`${HERMES_URL}/api/tags`, {
      signal: AbortSignal.timeout(2000),
    });
    hermesAvailable = res.ok;
  } catch {
    hermesAvailable = false;
  }
  hermesCheckedAt = now;
  return hermesAvailable;
}

/**
 * Call Hermes via Ollama's API (OpenAI-compatible).
 */
async function hermesChat(prompt: string, systemInstruction?: string): Promise<string> {
  const messages: Array<{ role: string; content: string }> = [];
  
  if (systemInstruction) {
    messages.push({ role: 'system', content: systemInstruction });
  }
  messages.push({ role: 'user', content: prompt });

  const res = await fetch(`${HERMES_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: process.env.HERMES_MODEL || 'hermes3',
      messages,
      stream: false,
    }),
  });

  if (!res.ok) {
    throw new Error(`Hermes error: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  return data.message?.content || data.response || '';
}

/**
 * Unified LLM call — tries Gemini first, falls back to Hermes.
 */
export async function chat(
  prompt: string,
  options: LLMOptions = {}
): Promise<LLMResponse> {
  // Use Hermes if explicitly requested (privacy mode / offline)
  if (options.preferLocal || process.env.FORCE_LOCAL_LLM === 'true') {
    const available = await isHermesAvailable();
    if (available) {
      const text = await hermesChat(prompt, options.systemInstruction);
      return { text, model: 'hermes' };
    }
    // If Hermes unavailable and we forced local, still try Gemini as last resort
  }

  // Try Gemini first
  if (isGeminiConfigured()) {
    try {
      const text = await callGemini(prompt, options);
      return { text, model: 'gemini' };
    } catch (err: unknown) {
      const error = err as { status?: number; code?: string };
      if (error.status === 429 || error.code === 'ECONNREFUSED') {
        console.warn('[LLM] Gemini unavailable, falling back to Hermes');
        // Fall through to Hermes
      } else {
        throw err;
      }
    }
  }

  // Try Hermes as fallback
  const available = await isHermesAvailable();
  if (available) {
    const text = await hermesChat(prompt, options.systemInstruction);
    return { text, model: 'hermes' };
  }

  throw new Error(
    'No LLM available. Configure GEMINI_API_KEY or start Ollama with Hermes.'
  );
}

/**
 * Unified LLM call with JSON output.
 * Tries Gemini's native JSON mode first, falls back to parsing Hermes text.
 */
export async function chatJSON<T>(
  prompt: string,
  options: LLMOptions = {}
): Promise<{ data: T; model: 'gemini' | 'hermes' }> {
  // Try Gemini first (has native JSON mode)
  if (!options.preferLocal && isGeminiConfigured()) {
    try {
      const data = await callGeminiJSON<T>(prompt, options);
      return { data, model: 'gemini' };
    } catch (err: unknown) {
      const error = err as { status?: number; code?: string };
      if (error.status === 429 || error.code === 'ECONNREFUSED') {
        console.warn('[LLM] Gemini unavailable for JSON, falling back to Hermes');
      } else {
        throw err;
      }
    }
  }

  // Hermes fallback — extract JSON from text response
  const jsonPrompt = `${prompt}\n\nIMPORTANT: Return ONLY valid JSON. No markdown, no code fences, no explanation.`;
  const text = await hermesChat(jsonPrompt, options.systemInstruction);

  // Try to extract JSON from the response
  const jsonMatch = text.match(/\{[\s\S]*\}/) || text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    throw new Error(`Hermes returned non-JSON response: ${text.slice(0, 200)}`);
  }

  return { data: JSON.parse(jsonMatch[0]) as T, model: 'hermes' };
}

/**
 * Get the status of available LLM providers.
 */
export async function getLLMStatus(): Promise<{
  gemini: { available: boolean; configured: boolean };
  hermes: { available: boolean; url: string };
}> {
  return {
    gemini: {
      available: isGeminiConfigured(),
      configured: isGeminiConfigured(),
    },
    hermes: {
      available: await isHermesAvailable(),
      url: HERMES_URL,
    },
  };
}
