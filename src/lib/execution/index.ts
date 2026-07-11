/**
 * Execution module — public API
 */
export { ExecutionLoop } from './execution-loop';
export type { ExecutionState, ExecutionPhase, PhaseContext, ResearchItem, ArtifactRef, ValidationResult } from './execution-loop';
export { ExecutionOrchestrator } from './orchestrator';
export {
  IdeatePhaseRunner,
  ResearchPhaseRunner,
  PlanPhaseRunner,
  BuildPhaseRunner,
  ValidatePhaseRunner,
  DeliverPhaseRunner,
} from './phase-runners';
export type { PhaseResult } from './phase-runners';
