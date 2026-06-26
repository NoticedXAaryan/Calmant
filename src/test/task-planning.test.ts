import { describe, it, expect } from 'vitest';
import { parseTaskCommandFallback, analyzeTaskCommand } from '@/lib/task-planning';

describe('Task NLP Parsing', () => {
  it('should parse simple tomorrow command', () => {
    const now = new Date('2026-06-26T12:00:00Z');
    const parsed = parseTaskCommandFallback('remind me to buy groceries tomorrow at 5pm', now);
    
    expect(parsed.title).toBe('buy groceries');
    expect(parsed.estimatedMins).toBe(45); // default
    
    const expectedDeadline = new Date(now);
    expectedDeadline.setDate(expectedDeadline.getDate() + 1);
    expectedDeadline.setHours(17, 0, 0, 0); // 5pm local time
    
    expect(parsed.deadline.getHours()).toBe(17);
    expect(parsed.deadline.getMinutes()).toBe(0);
  });

  it('should extract estimates like 2 hours', () => {
    const now = new Date('2026-06-26T12:00:00Z');
    const parsed = parseTaskCommandFallback('finish report in 2 hours', now);
    expect(parsed.estimatedMins).toBe(120);
  });

  it('should detect ambiguous times and ask for clarification', () => {
    const now = new Date('2026-06-26T12:00:00Z');
    const parsed = parseTaskCommandFallback('meeting at 8:00', now);
    const analysis = analyzeTaskCommand('meeting at 8:00', parsed, now);
    
    expect(analysis.needsClarification).toBe(true);
    expect(analysis.questions[0]).toContain('AM or PM');
    expect(analysis.confidence).toBeLessThan(0.7);
  });

  it('should detect vague titles', () => {
    const now = new Date('2026-06-26T12:00:00Z');
    const parsed = parseTaskCommandFallback('it', now);
    const analysis = analyzeTaskCommand('it', parsed, now);
    
    expect(analysis.needsClarification).toBe(true);
    expect(analysis.questions.some(q => q.includes('call this task'))).toBe(true);
  });
});
