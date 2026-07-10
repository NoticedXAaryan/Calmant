import { expect, describe, it } from 'vitest';
import { registry } from '../lib/tools/registry';
import { CLASSIFY_SYSTEM_PROMPT } from '../lib/harness/prompts/classify';
import { PLAN_SYSTEM_PROMPT } from '../lib/harness/prompts/plan';

describe('Planner Prompts', () => {
  it('should only use registered tools in CLASSIFY_SYSTEM_PROMPT', () => {
    const lines = CLASSIFY_SYSTEM_PROMPT.split('\n');
    const toolsLines = lines.filter(l => l.startsWith('Tools: '));
    expect(toolsLines.length).toBeGreaterThan(0);
    
    for (const toolsLine of toolsLines) {
      const tools = toolsLine.replace('Tools: ', '').split(',').map(t => t.trim());
      for (const tool of tools) {
        expect(registry.get(tool)).toBeDefined();
      }
    }
  });

  it('should only use registered tools in PLAN_SYSTEM_PROMPT', () => {
    const matches = PLAN_SYSTEM_PROMPT.match(/"tool":\s*"([^"]+)"/g);
    expect(matches).toBeDefined();
    
    if (matches) {
      for (const m of matches) {
        const toolName = m.replace(/"tool":\s*"/, '').replace('"', '');
        expect(registry.get(toolName)).toBeDefined();
      }
    }
  });
});
