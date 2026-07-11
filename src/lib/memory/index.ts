/**
 * Memory module — public API
 */
export { SoulReader } from './soul-reader';
export type { SoulIdentity, MemoryEntry, MemoryStore, SkillDefinition, GoalEntry, SoulSnapshot } from './soul-reader';
export { SoulWriter } from './soul-writer';
export type { MemoryCategory, MemoryProposal, GoalUpdate, SkillProposal, SoulUpdate } from './soul-writer';
export { MemoryManager } from './memory-manager';
export type { ContextPackage, MemoryAddRequest, MemorySearchResult } from './memory-manager';
