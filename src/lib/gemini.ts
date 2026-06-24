// Gemini Client with Rate Limiter
// Source: Architecture.md → External APIs, 04-context-and-skills → Skill 1
// Referenced by: T-008, T-010, T-011, T-012, T-013
//
// RULE: ALL Gemini calls go through callGemini(). Never import GoogleGenerativeAI elsewhere.
// Constraint C-2: 15 RPM free tier → rate limit at 14 RPM

import { GoogleGenerativeAI, type GenerativeModel, type GenerationConfig } from '@google/generative-ai';

// --- Rate Limiter ---

class SimpleRateLimiter {
  private timestamps: number[] = [];
  private readonly maxPerMinute = 14; // Stay under 15 RPM limit (C-2)

  async acquire(): Promise<void> {
    const now = Date.now();
    // Remove timestamps older than 60 seconds
    this.timestamps = this.timestamps.filter(t => now - t < 60000);
    
    if (this.timestamps.length >= this.maxPerMinute) {
      const oldestInWindow = this.timestamps[0];
      const waitTime = 60000 - (now - oldestInWindow) + 100; // +100ms buffer
      if (waitTime > 0) {
        await new Promise(r => setTimeout(r, waitTime));
      }
    }
    
    this.timestamps.push(Date.now());
  }
}

const rateLimiter = new SimpleRateLimiter();

// --- Singleton Model ---

let _genAI: GoogleGenerativeAI | null = null;
let _model: GenerativeModel | null = null;

function getModel(): GenerativeModel {
  if (!_model) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error(
        'GEMINI_API_KEY is not set. Get one at https://aistudio.google.com/apikey'
      );
    }
    _genAI = new GoogleGenerativeAI(apiKey);
    _model = _genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  }
  return _model;
}

// --- Public API ---

export interface GeminiCallOptions {
  systemInstruction?: string;
  temperature?: number;
}

/**
 * Centralized Gemini API call with rate limiting and retry.
 * 
 * Usage:
 *   const text = await callGemini("Decompose this task...");
 *   const json = await callGeminiJSON<DecomposeResult>(prompt, schema);
 */
export async function callGemini(
  prompt: string,
  options?: GeminiCallOptions
): Promise<string> {
  const model = getModel();
  await rateLimiter.acquire();

  try {
    const generationConfig: GenerationConfig = {};
    if (options?.temperature !== undefined) {
      generationConfig.temperature = options.temperature;
    }

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      ...(options?.systemInstruction && {
        systemInstruction: { role: 'system', parts: [{ text: options.systemInstruction }] },
      }),
      generationConfig,
    });

    return result.response.text();
  } catch (error: unknown) {
    const err = error as { status?: number; message?: string };
    if (err.status === 429) {
      // Rate limited by API — wait 5s and retry once
      console.warn('[Gemini] Rate limited (429), retrying in 5s...');
      await new Promise(r => setTimeout(r, 5000));
      return callGemini(prompt, options);
    }
    console.error('[Gemini] API error:', err.message || error);
    throw error;
  }
}

/**
 * Call Gemini and parse JSON response.
 * Uses response_mime_type for guaranteed JSON output.
 */
export async function callGeminiJSON<T>(
  prompt: string,
  options?: GeminiCallOptions
): Promise<T> {
  const model = getModel();
  await rateLimiter.acquire();

  try {
    const generationConfig: GenerationConfig = {
      responseMimeType: 'application/json',
    };
    if (options?.temperature !== undefined) {
      generationConfig.temperature = options.temperature;
    }

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      ...(options?.systemInstruction && {
        systemInstruction: { role: 'system', parts: [{ text: options.systemInstruction }] },
      }),
      generationConfig,
    });

    const text = result.response.text();
    return JSON.parse(text) as T;
  } catch (error: unknown) {
    const err = error as { status?: number; message?: string };
    if (err.status === 429) {
      console.warn('[Gemini] Rate limited (429), retrying in 5s...');
      await new Promise(r => setTimeout(r, 5000));
      return callGeminiJSON<T>(prompt, options);
    }
    console.error('[Gemini] API error:', err.message || error);
    throw error;
  }
}

/**
 * Check if the Gemini API key is configured.
 * Used by UI to show setup instructions if missing.
 */
export function isGeminiConfigured(): boolean {
  return !!process.env.GEMINI_API_KEY;
}
