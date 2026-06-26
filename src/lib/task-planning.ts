import type { Subtask, Task } from "@prisma/client";
import { calculateEntropy, getEntropyLevel } from "./entropy";

export type TaskWithSubtasks = Task & { subtasks: Subtask[] };

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
  subtasks: Array<{
    id: string;
    title: string;
    status: string;
  }>;
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
  type: "focus";
  status: "scheduled";
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

export interface ParsedTaskCommand {
  title: string;
  deadline: Date;
  estimatedMins: number;
  priority: number;
}

export interface TaskCommandAnalysis {
  confidence: number;
  needsClarification: boolean;
  questions: string[];
  interpretation: string;
  reminderOffsetMins?: number;
}

export interface DecomposedSubtask {
  title: string;
  estimatedMins: number;
  rationale: string;
}

const ACTIVE_STATUSES = new Set(["PENDING", "IN_PROGRESS", "pending", "in_progress"]);
const DONE_STATUSES = new Set(["DONE", "done"]);

function startOfToday(now: Date) {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfToday(now: Date) {
  const d = new Date(now);
  d.setHours(23, 59, 0, 0);
  return d;
}

function formatClock(date: Date) {
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function formatDueLabel(deadline: Date, now: Date) {
  const today = startOfToday(now);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const deadlineDay = startOfToday(deadline);

  if (deadlineDay.getTime() === today.getTime()) return `Today, ${formatClock(deadline)}`;
  if (deadlineDay.getTime() === tomorrow.getTime()) return `Tomorrow, ${formatClock(deadline)}`;

  return deadline.toLocaleDateString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatTimeLeft(deadline: Date, now: Date) {
  const diffMins = Math.round((deadline.getTime() - now.getTime()) / 60000);
  const abs = Math.abs(diffMins);

  if (diffMins < 0) {
    if (abs < 60) return `${abs}m overdue`;
    if (abs < 1440) return `${Math.round(abs / 60)}h overdue`;
    return `${Math.round(abs / 1440)}d overdue`;
  }

  if (diffMins < 60) return `${diffMins}m left`;
  if (diffMins < 1440) return `${Math.round(diffMins / 60)}h left`;
  return `${Math.round(diffMins / 1440)}d left`;
}

function getNextAction(task: TaskWithSubtasks) {
  const firstOpenSubtask = task.subtasks.find((subtask) => !DONE_STATUSES.has(subtask.status));
  if (firstOpenSubtask) return firstOpenSubtask.title;

  const title = task.title.trim();
  const lowered = title.toLowerCase();

  if (lowered.includes("exam") || lowered.includes("study")) {
    return `Open the material for ${title} and make the first 10 recall notes`;
  }
  if (lowered.includes("assignment") || lowered.includes("submit")) {
    return `Open the submission file for ${title} and create the required outline`;
  }
  if (lowered.includes("bill") || lowered.includes("payment") || lowered.includes("pay")) {
    return `Open the payment page for ${title} and verify the amount`;
  }
  if (lowered.includes("interview") || lowered.includes("meeting")) {
    return `Prepare the first talking point for ${title}`;
  }

  return `Create the first visible output for ${title}`;
}

function getRiskReasons(task: TaskWithSubtasks, score: number, now: Date) {
  const reasons: string[] = [];
  const remainingMins = Math.round((task.deadline.getTime() - now.getTime()) / 60000);
  const estimatedMins = task.estimatedMins ?? 60;

  if (remainingMins < 0) reasons.push("overdue");
  else if (remainingMins <= estimatedMins) reasons.push("not enough slack");
  else if (remainingMins <= estimatedMins * 2) reasons.push("tight window");

  if (task.snoozeCount > 0) reasons.push(`${task.snoozeCount} snooze${task.snoozeCount === 1 ? "" : "s"}`);
  if (task.subtasks.length === 0 && estimatedMins >= 45) reasons.push("not broken down");
  if (score >= 0.85 && reasons.length === 0) reasons.push("high failure risk");

  return reasons.slice(0, 3);
}

function getProgress(task: TaskWithSubtasks) {
  if (DONE_STATUSES.has(task.status)) return 1;
  if (task.subtasks.length === 0) return task.status === "IN_PROGRESS" ? 0.15 : 0;

  const completed = task.subtasks.filter((subtask) => DONE_STATUSES.has(subtask.status)).length;
  return completed / task.subtasks.length;
}

function getFocusMins(score: number, estimatedMins: number) {
  if (score >= 0.85) return Math.min(25, Math.max(10, Math.ceil(estimatedMins / 4)));
  if (score >= 0.65) return Math.min(40, Math.max(20, Math.ceil(estimatedMins / 3)));
  return Math.min(50, Math.max(25, Math.ceil(estimatedMins / 2)));
}

export function toPlanTask(task: TaskWithSubtasks, now = new Date()): PlanTask {
  const dynamicScore = calculateEntropy(task);
  const entropyScore = Math.max(task.entropyScore ?? 0, dynamicScore);
  const estimatedMins = task.estimatedMins ?? 60;

  return {
    id: task.id,
    title: task.title,
    description: task.description,
    deadline: task.deadline.toISOString(),
    estimatedMins,
    priority: task.priority,
    entropyScore,
    status: task.status,
    snoozeCount: task.snoozeCount,
    subtasks: task.subtasks.map((subtask) => ({
      id: subtask.id,
      title: subtask.title,
      status: subtask.status,
    })),
    riskLevel: getEntropyLevel(entropyScore),
    riskReasons: getRiskReasons(task, entropyScore, now),
    timeLeftLabel: formatTimeLeft(task.deadline, now),
    dueLabel: formatDueLabel(task.deadline, now),
    nextAction: getNextAction(task),
    focusMins: getFocusMins(entropyScore, estimatedMins),
    progress: getProgress(task),
  };
}

export function buildExecutionPlan(tasks: TaskWithSubtasks[], now = new Date()): ExecutionPlan {
  const planTasks = tasks
    .filter((task) => ACTIVE_STATUSES.has(task.status))
    .map((task) => toPlanTask(task, now))
    .sort((a, b) => {
      if (a.status === "IN_PROGRESS" && b.status !== "IN_PROGRESS") return -1;
      if (b.status === "IN_PROGRESS" && a.status !== "IN_PROGRESS") return 1;
      if (b.entropyScore !== a.entropyScore) return b.entropyScore - a.entropyScore;
      return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
    });

  const stats = {
    critical: planTasks.filter((task) => task.riskLevel === "critical").length,
    hot: planTasks.filter((task) => task.riskLevel === "hot").length,
    warm: planTasks.filter((task) => task.riskLevel === "warm").length,
    cool: planTasks.filter((task) => task.riskLevel === "cool").length,
    done: tasks.filter((task) => DONE_STATUSES.has(task.status)).length,
    overdue: planTasks.filter((task) => new Date(task.deadline).getTime() < now.getTime()).length,
    inProgress: planTasks.filter((task) => task.status === "IN_PROGRESS").length,
  };

  let cursor = new Date(now);
  cursor.setMinutes(Math.ceil(cursor.getMinutes() / 15) * 15, 0, 0);

  const blocks = planTasks.slice(0, 6).map((task) => {
    const start = new Date(cursor);
    const duration = Math.min(Math.max(task.focusMins, 15), 60);
    const end = new Date(start.getTime() + duration * 60000);
    cursor = new Date(end.getTime() + 10 * 60000);

    return {
      id: `block-${task.id}`,
      taskId: task.id,
      title: task.nextAction,
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      type: "focus" as const,
      status: "scheduled" as const,
      entropyScore: task.entropyScore,
    };
  });

  const recommendations: string[] = [];
  const topTask = planTasks[0] ?? null;

  if (topTask) {
    recommendations.push(`Start ${topTask.focusMins} minutes on "${topTask.title}"`);
    if (topTask.subtasks.length === 0 && topTask.estimatedMins >= 45) {
      recommendations.push(`Break "${topTask.title}" into smaller actions`);
    }
  }
  if (stats.overdue > 0) recommendations.push("Run a reset on overdue work before adding more commitments");
  if (stats.critical > 1) recommendations.push("Protect the next hour for focus work only");

  return {
    generatedAt: now.toISOString(),
    recommendedTask: topTask,
    tasks: planTasks,
    blocks,
    stats,
    recommendations,
    totalFocusMins: blocks.reduce((total, block) => {
      return total + Math.round((new Date(block.endTime).getTime() - new Date(block.startTime).getTime()) / 60000);
    }, 0),
  };
}

export function fallbackDecomposeTask(task: Pick<Task, "title" | "description" | "estimatedMins">): DecomposedSubtask[] {
  const title = task.title.trim();
  const estimatedMins = task.estimatedMins ?? 60;
  const lowered = title.toLowerCase();

  const minutes = (count: number, index: number) => {
    const base = Math.max(10, Math.round(estimatedMins / count / 5) * 5);
    return index === count - 1 ? Math.max(10, estimatedMins - base * (count - 1)) : base;
  };

  let steps: string[];

  if (lowered.includes("exam") || lowered.includes("study")) {
    steps = [
      `List the exact topics required for ${title}`,
      `Review the highest-weight topic and write recall notes`,
      `Solve or rehearse one representative question set`,
      `Do a final weak-spot pass and mark what is ready`,
    ];
  } else if (lowered.includes("assignment") || lowered.includes("submit")) {
    steps = [
      `Open the submission requirements for ${title}`,
      `Create the rough structure and fill the easiest section`,
      `Complete the remaining core work`,
      `Review, format, and submit ${title}`,
    ];
  } else if (lowered.includes("meeting") || lowered.includes("interview")) {
    steps = [
      `Confirm the time, link, and purpose for ${title}`,
      `Write the three points you need to cover`,
      `Prepare one question and one follow-up action`,
    ];
  } else if (lowered.includes("bill") || lowered.includes("payment") || lowered.includes("pay")) {
    steps = [
      `Open the account or payment page for ${title}`,
      `Verify the amount, due date, and payment method`,
      `Complete payment and save the confirmation`,
    ];
  } else {
    steps = [
      `Define the required finished output for ${title}`,
      `Gather only the materials needed to start`,
      `Complete the first rough pass`,
      `Review the result and close the loop`,
    ];
  }

  return steps.map((step, index) => ({
    title: step,
    estimatedMins: minutes(steps.length, index),
    rationale: index === 0 ? "Reduces task initiation friction." : "Keeps the next action concrete.",
  }));
}

function parseTime(command: string, deadline: Date) {
  const lower = command.toLowerCase();
  const amPm = lower.match(/\b(?:at|by|before|around)?\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/);
  const twentyFour = lower.match(/\b(?:at|by|before|around)?\s*([01]?\d|2[0-3]):([0-5]\d)\b/);

  if (amPm) {
    let hour = Number(amPm[1]);
    const minute = amPm[2] ? Number(amPm[2]) : 0;
    if (amPm[3] === "pm" && hour < 12) hour += 12;
    if (amPm[3] === "am" && hour === 12) hour = 0;
    deadline.setHours(hour, minute, 0, 0);
    return;
  }

  if (twentyFour) {
    let hour = Number(twentyFour[1]);
    const looksLikeAfternoonEvent =
      !/\b(am|pm)\b/.test(lower) &&
      hour >= 1 &&
      hour <= 7 &&
      /\b(exam|meeting|interview|appointment|class|lecture)\b/.test(lower);
    if (looksLikeAfternoonEvent) hour += 12;
    deadline.setHours(hour, Number(twentyFour[2]), 0, 0);
    return;
  }

  if (lower.includes("morning")) deadline.setHours(9, 0, 0, 0);
  else if (lower.includes("afternoon")) deadline.setHours(14, 0, 0, 0);
  else if (lower.includes("evening")) deadline.setHours(18, 0, 0, 0);
  else if (lower.includes("tonight") || lower.includes("eod") || lower.includes("end of day")) deadline.setHours(23, 59, 0, 0);
}

function parseDeadline(command: string, now: Date) {
  const lower = command.toLowerCase();
  let deadline = endOfToday(now);

  if (lower.includes("tomorrow")) {
    deadline = endOfToday(now);
    deadline.setDate(deadline.getDate() + 1);
  } else if (lower.includes("next week")) {
    deadline = endOfToday(now);
    deadline.setDate(deadline.getDate() + 7);
  } else {
    const weekdays = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    const weekdayIndex = weekdays.findIndex((day) => lower.includes(day));
    if (weekdayIndex >= 0) {
      const current = now.getDay();
      const diff = (weekdayIndex - current + 7) % 7 || 7;
      deadline = endOfToday(now);
      deadline.setDate(deadline.getDate() + diff);
    }
  }

  parseTime(command, deadline);
  return deadline;
}

function parseEstimate(command: string) {
  const lower = command.toLowerCase();
  if (lower.includes("study") || lower.includes("exam")) return 90;
  if (lower.includes("meeting") || lower.includes("call")) return 30;

  const mins = lower.match(/\b(\d+)\s*(minutes|minute|mins|min|m)\b/);
  if (mins) return Math.max(5, Number(mins[1]));

  const hours = lower.match(/\b(\d+(?:\.\d+)?)\s*(hours|hour|hrs|hr|h)\b/);
  if (hours) return Math.max(10, Math.round(Number(hours[1]) * 60));

  if (lower.includes("quick")) return 15;
  if (lower.includes("deep work")) return 90;
  return 45;
}

function cleanTitle(command: string) {
  let title = command
    .replace(/\b(i need to|need to|please|remind me to|task:|todo:|add|create)\b/gi, " ")
    .replace(/\b(today|tomorrow|tonight|next week|morning|afternoon|evening|eod|end of day)\b/gi, " ")
    .replace(/\b(?:at|by|before|around)?\s*\d{1,2}(?::\d{2})?\s*(?:am|pm)\b/gi, " ")
    .replace(/\b(?:at|by|before|around)?\s*(?:[01]?\d|2[0-3]):[0-5]\d\b/gi, " ")
    .replace(/\b\d+(?:\.\d+)?\s*(?:minutes|minute|mins|min|m|hours|hour|hrs|hr|h)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  title = title.replace(/^(to|by|at)\s+/i, "").trim();
  return title || command.trim();
}

export function parseTaskCommandFallback(command: string, now = new Date()): ParsedTaskCommand {
  const deadline = parseDeadline(command, now);
  const estimatedMins = parseEstimate(command);
  const remainingHours = (deadline.getTime() - now.getTime()) / 3600000;
  const priority =
    /urgent|critical|important|asap|deadline/i.test(command) ? 0.85 :
    remainingHours <= 8 ? 0.75 :
    remainingHours <= 24 ? 0.65 :
    0.5;

  return {
    title: cleanTitle(command),
    deadline,
    estimatedMins,
    priority,
  };
}

export function analyzeTaskCommand(command: string, parsed: ParsedTaskCommand, now = new Date()): TaskCommandAnalysis {
  const lower = command.toLowerCase();
  const questions: string[] = [];
  let confidence = 0.82;
  let reminderOffsetMins: number | undefined;

  const bareTime = lower.match(/\b(?:at|by|before|around|for)?\s*(\d{1,2}):(\d{2})\b/);
  const hasMeridiem = /\b(am|pm)\b/.test(lower);
  if (bareTime && !hasMeridiem && Number(bareTime[1]) <= 12) {
    questions.push(`Is ${bareTime[1]}:${bareTime[2]} AM or PM?`);
    confidence -= 0.25;
  }

  const relativeReminder = lower.match(/\b(remind|alert|notify)\b.*?\bin\s+(\d+)\s*(minutes|minute|mins|min|hours|hour|hrs|hr)\b/);
  if (relativeReminder) {
    const amount = Number(relativeReminder[2]);
    const unit = relativeReminder[3];
    reminderOffsetMins = unit.startsWith("hour") || unit === "hr" || unit === "hrs" ? amount * 60 : amount;
    questions.push(`Should I remind you in ${relativeReminder[2]} ${relativeReminder[3]}, or is that the work duration?`);
    confidence -= 0.2;
  }

  if (/\b(exam|interview|meeting|appointment)\b/.test(lower) && !/\b(study|prepare|revise|review|practice)\b/.test(lower)) {
    questions.push("Is this an event to attend, or preparation work before the event?");
    confidence -= 0.14;
  }

  if (parsed.deadline.getTime() <= now.getTime()) {
    questions.push("The parsed time is already in the past. What deadline should I use?");
    confidence -= 0.3;
  }

  if (parsed.title.length < 4 || /^(it|this|that)$/i.test(parsed.title)) {
    questions.push("What should I call this task?");
    confidence -= 0.25;
  }

  const needsClarification = confidence < 0.72 || questions.length > 0;
  const interpretation = `Task "${parsed.title}" due ${parsed.deadline.toLocaleString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })}, estimated ${parsed.estimatedMins} min.`;

  return {
    confidence: Math.max(0.15, Math.min(0.98, confidence)),
    needsClarification,
    questions,
    interpretation,
    reminderOffsetMins,
  };
}
