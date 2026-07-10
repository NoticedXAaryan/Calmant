import { describe, it, expect } from 'vitest';
import { TaskClassifier } from '../../src/lib/harness/classifier';

const hasApiKey = !!process.env.OPENAI_API_KEY;

// These are true evaluations that call the LLM to verify the prompt and schema
// consistently produce the desired output categories.
describe.skipIf(!hasApiKey)('TaskClassifier Evals', () => {
  const classifier = new TaskClassifier('dummy-key', 'gpt-4o-mini');

  const testCases = [
    {
      prompt: "Find the latest news about SpaceX and summarize it",
      expectedType: "task",
      expectedComplexity: ["medium", "high"],
      expectedTools: ["search_google", "browse_web"],
    },
    {
      prompt: "What time is it?",
      expectedType: "chat",
      expectedComplexity: ["low"],
      expectedTools: [],
    },
    {
      prompt: "I want to land a job at Google by next year. Can you help me?",
      expectedType: "goal",
      expectedComplexity: ["high"],
      expectedTools: [],
    },
    {
      prompt: "Send an email to john@example.com telling him I'll be late.",
      expectedType: "task",
      expectedComplexity: ["low", "medium"],
      expectedTools: ["send_email", "gmail_send"], // Depending on available tools
    }
  ];

  for (const { prompt, expectedType, expectedComplexity, expectedTools } of testCases) {
    it(`should correctly classify: "${prompt}"`, async () => {
      const result = await classifier.classify(prompt);
      
      expect(result.type).toBe(expectedType);
      expect(expectedComplexity).toContain(result.complexity);
      
      // We don't demand exact tool matches since registry can change, 
      // but we expect at least some tools if it's a complex task
      if (expectedTools.length > 0) {
        expect(result.requiredTools.length).toBeGreaterThanOrEqual(1);
      }
    });
  }
});
