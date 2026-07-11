/**
 * Soul Writer — Proposes and commits changes to soul/*.md files.
 * 
 * The writer follows a propose-then-commit pattern:
 * 1. Agent proposes a change (memory addition, skill learning, goal update)
 * 2. Low-risk changes auto-commit (task events, tool results, patterns)
 * 3. High-risk changes queue for owner review (identity facts, credentials, preferences)
 * 4. Owner can also directly edit files — changes are picked up on next read.
 */
import * as fs from 'fs';
import * as path from 'path';

// ── Types ────────────────────────────────────────────────

export type MemoryCategory =
  | 'identity'
  | 'preferences'
  | 'projects'
  | 'skills'
  | 'relationships'
  | 'patterns'
  | 'corrections';

export type ChangeRisk = 'low' | 'medium' | 'high';

export interface MemoryProposal {
  category: MemoryCategory;
  content: string;
  confidence: number;
  source: string;
  risk: ChangeRisk;
}

export interface GoalUpdate {
  title: string;
  status?: string;
  currentPhase?: string;
  lastUpdate?: string;
  successCriteria?: string;
  target?: string;
}

export interface SkillProposal {
  name: string;
  trigger: string;
  process: string;
  tools: string;
  qualityGate: string;
  learnedFrom: string;
}

export interface SoulUpdate {
  section: 'Owner Context' | 'Personality Traits' | 'Communication Style';
  content: string;
}

export interface WriteResult {
  success: boolean;
  autoCommitted: boolean;
  reason?: string;
}

// ── Soul Directory ────────────────────────────────────────

const SOUL_DIR = path.resolve(process.cwd(), '..', 'soul');

function soulPath(filename: string): string {
  return path.join(SOUL_DIR, filename);
}

function readSoulFile(filename: string): string {
  const filePath = soulPath(filename);
  if (!fs.existsSync(filePath)) return '';
  return fs.readFileSync(filePath, 'utf-8');
}

function writeSoulFile(filename: string, content: string): void {
  const filePath = soulPath(filename);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, 'utf-8');
}

// ── Risk Classification ──────────────────────────────────

const AUTO_COMMIT_CATEGORIES: MemoryCategory[] = ['patterns', 'projects'];
const REVIEW_REQUIRED_CATEGORIES: MemoryCategory[] = ['identity', 'relationships'];

function classifyRisk(proposal: MemoryProposal): ChangeRisk {
  if (REVIEW_REQUIRED_CATEGORIES.includes(proposal.category)) return 'high';
  if (AUTO_COMMIT_CATEGORIES.includes(proposal.category)) return 'low';
  if (proposal.confidence < 0.5) return 'high';
  if (proposal.confidence < 0.7) return 'medium';
  return proposal.risk || 'low';
}

// ── Section Heading Map ──────────────────────────────────

const CATEGORY_HEADINGS: Record<MemoryCategory, string> = {
  identity: 'Identity',
  preferences: 'Preferences',
  projects: 'Projects',
  skills: 'Skills & Expertise',
  relationships: 'Relationships',
  patterns: 'Patterns & Observations',
  corrections: 'Corrections',
};

// ── Public API ────────────────────────────────────────────

export class SoulWriter {

  /**
   * Propose adding a memory entry.
   * Low-risk entries auto-commit; high-risk entries return as pending review.
   */
  static proposeMemory(proposal: MemoryProposal): WriteResult {
    const risk = classifyRisk(proposal);
    const prefix = risk === 'low' ? '[auto]' : '[pending]';
    const entry = `- ${prefix} ${proposal.content} | confidence: ${proposal.confidence} | source: ${proposal.source}`;

    if (risk === 'high') {
      // Queue for review — add to a pending section
      this.appendToSection('MEMORY.md', CATEGORY_HEADINGS[proposal.category], entry);
      return { success: true, autoCommitted: false, reason: 'Queued for owner review (high-risk category)' };
    }

    this.appendToSection('MEMORY.md', CATEGORY_HEADINGS[proposal.category], entry);
    return { success: true, autoCommitted: true };
  }

  /**
   * Add or update a goal in GOALS.md.
   */
  static writeGoal(goal: GoalUpdate): WriteResult {
    const content = readSoulFile('GOALS.md');
    const goalBlock = this.formatGoalBlock(goal);

    // Check if goal already exists
    const existingRegex = new RegExp(`### ${this.escapeRegex(goal.title)}[\\s\\S]*?(?=\\n### |\\n## |$)`);
    if (content.match(existingRegex)) {
      // Update existing goal
      const updated = content.replace(existingRegex, goalBlock);
      writeSoulFile('GOALS.md', updated);
    } else {
      // Add new goal under Active Goals
      this.appendToSection('GOALS.md', 'Active Goals', goalBlock);
    }

    return { success: true, autoCommitted: true };
  }

  /**
   * Propose a new learned skill.
   */
  static proposeSkill(skill: SkillProposal): WriteResult {
    const block = [
      `### ${skill.name}`,
      `- **Learned from**: ${skill.learnedFrom}`,
      `- **Trigger**: ${skill.trigger}`,
      `- **Process**: ${skill.process}`,
      `- **Tools**: ${skill.tools}`,
      `- **Quality Gate**: ${skill.qualityGate}`,
      `- **Success rate**: 1/1`,
    ].join('\n');

    this.appendToSection('SKILLS.md', 'Learned Skills', block);
    return { success: true, autoCommitted: true };
  }

  /**
   * Update the owner context in SOUL.md (from onboarding).
   */
  static updateSoulSection(update: SoulUpdate): WriteResult {
    const content = readSoulFile('SOUL.md');
    const sectionRegex = new RegExp(
      `(## ${this.escapeRegex(update.section)}\\s*\\n)([\\s\\S]*?)(?=\\n## |$)`
    );

    const match = content.match(sectionRegex);
    if (match) {
      const updated = content.replace(
        sectionRegex,
        `$1${update.content}\n`
      );
      writeSoulFile('SOUL.md', updated);
    } else {
      // Section doesn't exist, append it
      writeSoulFile('SOUL.md', content + `\n## ${update.section}\n${update.content}\n`);
    }

    return { success: true, autoCommitted: true };
  }

  /**
   * Record a memory correction (owner override).
   */
  static correctMemory(originalContent: string, correction: string, source: string = 'owner_correction'): WriteResult {
    // Add to corrections
    const correctionEntry = `- Corrected: "${originalContent}" → "${correction}" | source: ${source} | date: ${new Date().toISOString().split('T')[0]}`;
    this.appendToSection('MEMORY.md', 'Corrections', correctionEntry);

    // Try to find and mark the original entry as superseded
    const content = readSoulFile('MEMORY.md');
    if (content.includes(originalContent)) {
      const updated = content.replace(
        originalContent,
        `~~${originalContent}~~ (superseded)`
      );
      writeSoulFile('MEMORY.md', updated);
    }

    return { success: true, autoCommitted: true };
  }

  /**
   * Move a goal to a different status section.
   */
  static moveGoal(title: string, newStatus: 'completed' | 'abandoned', reason?: string): WriteResult {
    const content = readSoulFile('GOALS.md');

    // Find and remove from current section
    const goalRegex = new RegExp(`### ${this.escapeRegex(title)}[\\s\\S]*?(?=\\n### |\\n## |$)`);
    const match = content.match(goalRegex);
    if (!match) {
      return { success: false, autoCommitted: false, reason: `Goal "${title}" not found` };
    }

    let goalBlock = match[0].trim();
    // Update status
    goalBlock = goalBlock.replace(/\*\*Status\*\*:\s*.+/, `**Status**: ${newStatus}`);
    if (reason) {
      goalBlock += `\n- **Reason**: ${reason}`;
    }

    // Remove from old location and add to new section
    const cleaned = content.replace(goalRegex, '').replace(/\n{3,}/g, '\n\n');
    writeSoulFile('GOALS.md', cleaned);

    const targetSection = newStatus === 'completed' ? 'Completed Goals' : 'Abandoned Goals';
    this.appendToSection('GOALS.md', targetSection, goalBlock);

    return { success: true, autoCommitted: true };
  }

  // ── Private Helpers ─────────────────────────────────────

  private static appendToSection(filename: string, heading: string, entry: string): void {
    let content = readSoulFile(filename);
    const sectionRegex = new RegExp(`(## ${this.escapeRegex(heading)}\\s*\\n)([\\s\\S]*?)(?=\\n## |$)`);

    const match = content.match(sectionRegex);
    if (match) {
      const sectionContent = match[2];
      // Find the last non-empty, non-comment line in the section
      const lines = sectionContent.split('\n');
      const lastContentIndex = lines.reduce((acc, line, i) => {
        if (line.trim() && !line.trim().startsWith('<!--')) return i;
        return acc;
      }, -1);

      // Insert after last content line (or after comments if section is empty)
      const insertIndex = lastContentIndex >= 0 ? lastContentIndex + 1 : lines.length;
      lines.splice(insertIndex, 0, entry);
      const newSection = lines.join('\n');
      content = content.replace(sectionRegex, `$1${newSection}`);
    } else {
      // Section not found — append at end
      content += `\n## ${heading}\n${entry}\n`;
    }

    writeSoulFile(filename, content);
  }

  private static formatGoalBlock(goal: GoalUpdate): string {
    const lines = [`### ${goal.title}`];
    lines.push(`- **Status**: ${goal.status || 'active'}`);
    if (goal.currentPhase) lines.push(`- **Current Phase**: ${goal.currentPhase}`);
    if (goal.target) lines.push(`- **Target**: ${goal.target}`);
    if (goal.successCriteria) lines.push(`- **Success Criteria**: ${goal.successCriteria}`);
    if (goal.lastUpdate) lines.push(`- **Last Update**: ${goal.lastUpdate}`);
    lines.push(`- **Created**: ${new Date().toISOString().split('T')[0]}`);
    return lines.join('\n');
  }

  private static escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
