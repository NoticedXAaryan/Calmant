export interface PlanTask {
  id: string;
  title: string;
  description: string | null;
  deadline: string;
  estimatedMins: number;
  priority: number;
  entropyScore: number;
  status: string;
  snoozeCount: number;
  subtasks: Array<{ id: string; title: string; status: string }>;
  riskLevel: "cool" | "warm" | "hot" | "critical";
  riskReasons: string[];
  timeLeftLabel: string;
  dueLabel: string;
  nextAction: string;
  focusMins: number;
  progress: number;
}

export interface PlanBlock {
  id: string;
  taskId: string;
  title: string;
  startTime: string;
  endTime: string;
  entropyScore: number;
}

export interface ExecutionPlan {
  generatedAt: string;
  recommendedTask: PlanTask | null;
  tasks: PlanTask[];
  blocks: PlanBlock[];
  stats: {
    critical: number;
    hot: number;
    warm: number;
    cool: number;
    done: number;
    overdue: number;
    inProgress: number;
  };
  recommendations: string[];
  totalFocusMins: number;
}

export interface FocusState {
  taskId: string;
  title: string;
  nextAction: string;
  endsAt: number;
  totalMins: number;
}

export interface CaptureDraft {
  title: string;
  deadline: string;
  estimatedMins: number;
  priority: number;
  description: string;
}

export interface CaptureAnalysis {
  confidence: number;
  needsClarification: boolean;
  questions: string[];
  interpretation: string;
  reminderOffsetMins?: number;
}

export const RISK_DOT: Record<PlanTask["riskLevel"], string> = {
  cool: "bg-emerald-500",
  warm: "bg-amber-500",
  hot: "bg-orange-500",
  critical: "bg-red-500",
};

export const RISK_TEXT: Record<PlanTask["riskLevel"], string> = {
  cool: "text-emerald-600 dark:text-emerald-400",
  warm: "text-amber-600 dark:text-amber-400",
  hot: "text-orange-600 dark:text-orange-400",
  critical: "text-red-600 dark:text-red-400",
};

export function statusLabel(status: string) {
  return status.toLowerCase().replace("_", " ");
}

export function formatClock(value: string) {
  return new Date(value).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export function formatTimer(ms: number) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const mins = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(mins).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
