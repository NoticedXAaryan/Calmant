/**
 * Soul Reader — Parses and provides structured access to soul/*.md files.
 * 
 * The soul directory is the agent's transparent, file-based memory layer.
 * This service reads the markdown files, parses them into structured data,
 * and provides typed access for agent context building.
 */
import * as fs from 'fs';
import * as path from 'path';

// ── Types ────────────────────────────────────────────────

export interface SoulIdentity {
  name: string;
  role: string;
  created: string;
  mission: string;
  communicationStyle: string[];
  decisionBoundaries: string[];
  personalityTraits: string[];
  ownerContext: string;
}

export interface MemoryEntry {
  category: string;
  content: string;
  confidence: number;
  source: string;
  auto: boolean;
}

export interface MemoryStore {
  identity: MemoryEntry[];
  preferences: MemoryEntry[];
  projects: MemoryEntry[];
  skills: MemoryEntry[];
  relationships: MemoryEntry[];
  patterns: MemoryEntry[];
  corrections: MemoryEntry[];
}

export interface SkillDefinition {
  name: string;
  trigger: string;
  process: string;
  tools: string;
  qualityGate: string;
  learned: boolean;
  learnedFrom?: string;
  successRate?: string;
}

export interface GoalEntry {
  title: string;
  status: string;
  created?: string;
  target?: string;
  successCriteria?: string;
  currentPhase?: string;
  lastUpdate?: string;
}

export interface SoulSnapshot {
  identity: SoulIdentity;
  memory: MemoryStore;
  skills: SkillDefinition[];
  goals: GoalEntry[];
  raw: {
    soul: string;
    memory: string;
    skills: string;
    goals: string;
  };
}

// ── Soul Directory ────────────────────────────────────────

const SOUL_DIR = path.resolve(process.cwd(), '..', 'soul');

function soulPath(filename: string): string {
  return path.join(SOUL_DIR, filename);
}

function readSoulFile(filename: string): string {
  const filePath = soulPath(filename);
  if (!fs.existsSync(filePath)) {
    console.warn(`[SoulReader] File not found: ${filePath}`);
    return '';
  }
  return fs.readFileSync(filePath, 'utf-8');
}

// ── Parsing Helpers ───────────────────────────────────────

function parseListItems(section: string): string[] {
  return section
    .split('\n')
    .filter(line => line.trim().startsWith('- '))
    .map(line => line.replace(/^-\s+/, '').trim())
    .filter(Boolean);
}

function parseSectionContent(content: string, heading: string): string {
  const regex = new RegExp(`## ${heading}\\s*\\n([\\s\\S]*?)(?=\\n## |$)`, 'i');
  const match = content.match(regex);
  return match ? match[1].trim() : '';
}

function parseH3Sections(content: string): Map<string, string> {
  const sections = new Map<string, string>();
  const regex = /### (.+?)\n([\s\S]*?)(?=\n### |\n## |$)/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    sections.set(match[1].trim(), match[2].trim());
  }
  return sections;
}

function parseMemoryEntries(section: string): MemoryEntry[] {
  const lines = section.split('\n').filter(line => line.trim().startsWith('- '));
  return lines.map(line => {
    const content = line.replace(/^-\s+/, '').trim();
    const isAuto = content.startsWith('[auto]');
    const cleanContent = content.replace(/^\[auto\]\s*/, '');

    // Parse metadata: content | confidence: X | source: Y
    const parts = cleanContent.split('|').map(p => p.trim());
    const mainContent = parts[0] || cleanContent;

    let confidence = 0.8;
    let source = 'unknown';

    for (const part of parts.slice(1)) {
      if (part.startsWith('confidence:')) {
        confidence = parseFloat(part.replace('confidence:', '').trim()) || 0.8;
      }
      if (part.startsWith('source:')) {
        source = part.replace('source:', '').trim();
      }
    }

    return {
      category: '',  // Set by caller
      content: mainContent,
      confidence,
      source,
      auto: isAuto,
    };
  });
}

// ── Public API ────────────────────────────────────────────

export class SoulReader {

  /**
   * Read the full soul snapshot — all files parsed into structured data.
   */
  static readSnapshot(): SoulSnapshot {
    const soulRaw = readSoulFile('SOUL.md');
    const memoryRaw = readSoulFile('MEMORY.md');
    const skillsRaw = readSoulFile('SKILLS.md');
    const goalsRaw = readSoulFile('GOALS.md');

    return {
      identity: this.parseIdentity(soulRaw),
      memory: this.parseMemory(memoryRaw),
      skills: this.parseSkills(skillsRaw),
      goals: this.parseGoals(goalsRaw),
      raw: {
        soul: soulRaw,
        memory: memoryRaw,
        skills: skillsRaw,
        goals: goalsRaw,
      },
    };
  }

  /**
   * Read just the identity for lightweight context.
   */
  static readIdentity(): SoulIdentity {
    return this.parseIdentity(readSoulFile('SOUL.md'));
  }

  /**
   * Read memory entries for a specific category.
   */
  static readMemoryCategory(category: keyof MemoryStore): MemoryEntry[] {
    const memory = this.parseMemory(readSoulFile('MEMORY.md'));
    return memory[category] || [];
  }

  /**
   * Search memory for entries matching a query (simple substring match).
   * For RAG-based retrieval, use the rag-indexer service instead.
   */
  static searchMemory(query: string): MemoryEntry[] {
    const memory = this.parseMemory(readSoulFile('MEMORY.md'));
    const queryLower = query.toLowerCase();
    const results: MemoryEntry[] = [];

    for (const [category, entries] of Object.entries(memory)) {
      for (const entry of entries) {
        if (entry.content.toLowerCase().includes(queryLower)) {
          results.push({ ...entry, category });
        }
      }
    }

    return results.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Get available skills (both pre-made and learned).
   */
  static readSkills(): SkillDefinition[] {
    return this.parseSkills(readSoulFile('SKILLS.md'));
  }

  /**
   * Build a compact context package for an agent run.
   * Includes identity summary, relevant memory, active goals, and available skills.
   */
  static buildContextPackage(taskDescription?: string): string {
    const snapshot = this.readSnapshot();
    const lines: string[] = [];

    // Identity summary
    lines.push(`## Agent Identity`);
    lines.push(`Name: ${snapshot.identity.name} | Role: ${snapshot.identity.role}`);
    lines.push(`Mission: ${snapshot.identity.mission}`);
    lines.push('');

    // Decision boundaries
    lines.push(`## Decision Boundaries`);
    snapshot.identity.decisionBoundaries.forEach(b => lines.push(`- ${b}`));
    lines.push('');

    // Relevant memory (top entries by confidence)
    lines.push(`## Owner Context`);
    const allMemory = Object.entries(snapshot.memory)
      .flatMap(([cat, entries]: [string, any[]]) => entries.map((e: any) => ({ ...e, category: cat })))
      .filter(e => e.content && e.content.length > 0)
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 20);

    if (allMemory.length > 0) {
      for (const entry of allMemory) {
        lines.push(`- [${entry.category}] ${entry.content} (confidence: ${entry.confidence})`);
      }
    } else {
      lines.push('No owner context available yet. Ask during onboarding.');
    }
    lines.push('');

    // Active goals
    const activeGoals = snapshot.goals.filter(g => g.status === 'active');
    if (activeGoals.length > 0) {
      lines.push(`## Active Goals`);
      activeGoals.forEach(g => {
        lines.push(`- ${g.title} [${g.currentPhase || 'planning'}]${g.lastUpdate ? ' — ' + g.lastUpdate : ''}`);
      });
      lines.push('');
    }

    // Available skills
    lines.push(`## Available Skills`);
    snapshot.skills.forEach(s => {
      lines.push(`- ${s.name}: ${s.trigger}`);
    });

    return lines.join('\n');
  }

  /**
   * Check if the soul directory exists and has been initialized.
   */
  static isInitialized(): boolean {
    return fs.existsSync(soulPath('SOUL.md')) && 
           fs.readFileSync(soulPath('SOUL.md'), 'utf-8').includes('## Owner Context');
  }

  /**
   * Check if onboarding has been completed (owner context populated).
   */
  static isOnboarded(): boolean {
    const soul = readSoulFile('SOUL.md');
    const ownerContext = parseSectionContent(soul, 'Owner Context');
    // Onboarded if owner context has more than just comments
    const meaningfulLines = ownerContext.split('\n').filter(
      l => l.trim() && !l.trim().startsWith('<!--')
    );
    return meaningfulLines.length > 0;
  }

  // ── Private Parsers ─────────────────────────────────────

  private static parseIdentity(content: string): SoulIdentity {
    const identity = parseSectionContent(content, 'Identity');
    const nameMatch = identity.match(/Name:\s*(.+)/);
    const roleMatch = identity.match(/Role:\s*(.+)/);
    const createdMatch = identity.match(/Created:\s*(.+)/);

    return {
      name: nameMatch?.[1]?.trim() || 'Calmant',
      role: roleMatch?.[1]?.trim() || 'Personal AI Chief of Staff',
      created: createdMatch?.[1]?.trim() || new Date().toISOString().split('T')[0],
      mission: parseSectionContent(content, 'Mission'),
      communicationStyle: parseListItems(parseSectionContent(content, 'Communication Style')),
      decisionBoundaries: parseListItems(parseSectionContent(content, 'Decision Boundaries')),
      personalityTraits: parseListItems(parseSectionContent(content, 'Personality Traits')),
      ownerContext: parseSectionContent(content, 'Owner Context'),
    };
  }

  private static parseMemory(content: string): MemoryStore {
    const categories: (keyof MemoryStore)[] = [
      'identity', 'preferences', 'projects', 'skills',
      'relationships', 'patterns', 'corrections',
    ];

    const store: MemoryStore = {
      identity: [],
      preferences: [],
      projects: [],
      skills: [],
      relationships: [],
      patterns: [],
      corrections: [],
    };

    for (const cat of categories) {
      const sectionName = cat.charAt(0).toUpperCase() + cat.slice(1);
      // Map category names to their heading names in MEMORY.md
      const headingMap: Record<string, string> = {
        identity: 'Identity',
        preferences: 'Preferences',
        projects: 'Projects',
        skills: 'Skills & Expertise',
        relationships: 'Relationships',
        patterns: 'Patterns & Observations',
        corrections: 'Corrections',
      };
      const heading = headingMap[cat] || sectionName;
      const section = parseSectionContent(content, heading);
      const entries = parseMemoryEntries(section);
      store[cat] = entries.map(e => ({ ...e, category: cat }));
    }

    return store;
  }

  private static parseSkills(content: string): SkillDefinition[] {
    const skills: SkillDefinition[] = [];
    const h3s = parseH3Sections(content);

    for (const [name, body] of h3s) {
      const triggerMatch = body.match(/\*\*Trigger\*\*:\s*(.+)/);
      const processMatch = body.match(/\*\*Process\*\*:\s*(.+)/);
      const toolsMatch = body.match(/\*\*Tools\*\*:\s*(.+)/);
      const qgMatch = body.match(/\*\*Quality Gate\*\*:\s*(.+)/);
      const learnedMatch = body.match(/\*\*Learned from\*\*:\s*(.+)/);
      const srMatch = body.match(/\*\*Success rate\*\*:\s*(.+)/);

      skills.push({
        name,
        trigger: triggerMatch?.[1]?.trim() || '',
        process: processMatch?.[1]?.trim() || '',
        tools: toolsMatch?.[1]?.trim() || '',
        qualityGate: qgMatch?.[1]?.trim() || '',
        learned: !!learnedMatch,
        learnedFrom: learnedMatch?.[1]?.trim(),
        successRate: srMatch?.[1]?.trim(),
      });
    }

    return skills;
  }

  private static parseGoals(content: string): GoalEntry[] {
    const goals: GoalEntry[] = [];
    const sections = ['Active Goals', 'Completed Goals', 'Abandoned Goals'];

    for (const section of sections) {
      const sectionContent = parseSectionContent(content, section);
      const h3s = parseH3Sections(`## Wrapper\n${sectionContent}`);

      for (const [title, body] of h3s) {
        const statusMatch = body.match(/\*\*Status\*\*:\s*(.+)/);
        const createdMatch = body.match(/\*\*Created\*\*:\s*(.+)/);
        const targetMatch = body.match(/\*\*Target\*\*:\s*(.+)/);
        const scMatch = body.match(/\*\*Success Criteria\*\*:\s*(.+)/);
        const phaseMatch = body.match(/\*\*Current Phase\*\*:\s*(.+)/);
        const updateMatch = body.match(/\*\*Last Update\*\*:\s*(.+)/);

        goals.push({
          title,
          status: statusMatch?.[1]?.trim() || (section === 'Active Goals' ? 'active' : section === 'Completed Goals' ? 'completed' : 'abandoned'),
          created: createdMatch?.[1]?.trim(),
          target: targetMatch?.[1]?.trim(),
          successCriteria: scMatch?.[1]?.trim(),
          currentPhase: phaseMatch?.[1]?.trim(),
          lastUpdate: updateMatch?.[1]?.trim(),
        });
      }
    }

    return goals;
  }
}
