"use client";

import { useEffect, useState, useMemo } from "react";
import { format, isToday, isTomorrow, isPast, differenceInMinutes } from "date-fns";
import {
  CheckCircle2,
  Circle,
  Clock,
  AlertTriangle,
  Loader2,
  RefreshCw,
  ChevronRight,
  Zap,
  Timer,
  Calendar,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";

/* ─── Types ──────────────────────────────────────────────────────────── */

interface TimelineTask {
  id: string;
  title: string;
  description: string | null;
  deadline: string;
  estimatedMins: number | null;
  entropyScore: number;
  status: string;
  snoozeCount: number;
  completedAt: string | null;
}

/* ─── Helpers ──────────────────────────────────────────────────────────── */

function riskColor(score: number) {
  if (score >= 0.85) return { bg: "bg-red-500", text: "text-red-500", ring: "ring-red-500/20", label: "Critical" };
  if (score >= 0.65) return { bg: "bg-orange-500", text: "text-orange-500", ring: "ring-orange-500/20", label: "High" };
  if (score >= 0.4) return { bg: "bg-amber-500", text: "text-amber-500", ring: "ring-amber-500/20", label: "Medium" };
  return { bg: "bg-emerald-500", text: "text-emerald-500", ring: "ring-emerald-500/20", label: "Low" };
}

function timeLabel(deadline: string): string {
  const d = new Date(deadline);
  const now = new Date();
  const mins = differenceInMinutes(d, now);

  if (mins < 0) {
    const overdue = Math.abs(mins);
    if (overdue < 60) return `${overdue}m overdue`;
    if (overdue < 1440) return `${Math.round(overdue / 60)}h overdue`;
    return `${Math.round(overdue / 1440)}d overdue`;
  }
  if (mins < 60) return `${mins}m left`;
  if (mins < 1440) return `${Math.round(mins / 60)}h left`;
  return `${Math.round(mins / 1440)}d left`;
}

function dayLabel(deadline: string): string {
  const d = new Date(deadline);
  if (isToday(d)) return "Today";
  if (isTomorrow(d)) return "Tomorrow";
  if (isPast(d)) return "Overdue";
  return format(d, "EEE, MMM d");
}

/* ─── Component ──────────────────────────────────────────────────────── */

export default function TaskTimeline() {
  const [tasks, setTasks] = useState<TimelineTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/tasks");
      const data = await res.json();
      // Handle both { success, data: [...] } and direct array responses
      if (Array.isArray(data)) {
        setTasks(data);
      } else if (data.success && data.data) {
        setTasks(data.data);
      } else if (Array.isArray(data.data)) {
        setTasks(data.data);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  // Group by day
  const grouped = useMemo(() => {
    const groups: Record<string, TimelineTask[]> = {};
    
    // Sort: overdue first, then by deadline ascending
    const sorted = [...tasks].sort((a, b) => {
      // Completed tasks at the end
      if (a.status === "DONE" && b.status !== "DONE") return 1;
      if (a.status !== "DONE" && b.status === "DONE") return -1;
      // Then by entropy (urgency) descending
      if (a.status !== "DONE" && b.status !== "DONE") {
        return b.entropyScore - a.entropyScore;
      }
      return new Date(b.completedAt || b.deadline).getTime() - new Date(a.completedAt || a.deadline).getTime();
    });

    for (const task of sorted) {
      const key = task.status === "DONE" ? "Completed" : dayLabel(task.deadline);
      if (!groups[key]) groups[key] = [];
      groups[key].push(task);
    }

    // Order groups: Overdue → Today → Tomorrow → future → Completed
    const order = ["Overdue", "Today", "Tomorrow"];
    const ordered: [string, TimelineTask[]][] = [];
    
    for (const key of order) {
      if (groups[key]) ordered.push([key, groups[key]]);
    }
    for (const [key, val] of Object.entries(groups)) {
      if (!order.includes(key) && key !== "Completed") {
        ordered.push([key, val]);
      }
    }
    if (groups["Completed"]) {
      ordered.push(["Completed", groups["Completed"]]);
    }

    return ordered;
  }, [tasks]);

  const stats = useMemo(() => {
    const active = tasks.filter((t) => t.status !== "DONE");
    return {
      total: tasks.length,
      completed: tasks.filter((t) => t.status === "DONE").length,
      overdue: active.filter((t) => isPast(new Date(t.deadline))).length,
      critical: active.filter((t) => t.entropyScore >= 0.85).length,
    };
  }, [tasks]);

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats bar */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg border border-border bg-card p-3">
          <div className="text-2xl font-semibold">{stats.total}</div>
          <div className="text-xs text-muted-foreground uppercase tracking-wider">Total</div>
        </div>
        <div className="rounded-lg border border-border bg-card p-3">
          <div className="text-2xl font-semibold text-emerald-500">{stats.completed}</div>
          <div className="text-xs text-muted-foreground uppercase tracking-wider">Done</div>
        </div>
        <div className="rounded-lg border border-border bg-card p-3">
          <div className={`text-2xl font-semibold ${stats.overdue > 0 ? "text-red-500" : ""}`}>{stats.overdue}</div>
          <div className="text-xs text-muted-foreground uppercase tracking-wider">Overdue</div>
        </div>
        <div className="rounded-lg border border-border bg-card p-3">
          <div className={`text-2xl font-semibold ${stats.critical > 0 ? "text-orange-500" : ""}`}>{stats.critical}</div>
          <div className="text-xs text-muted-foreground uppercase tracking-wider">Critical</div>
        </div>
      </div>

      {/* Timeline */}
      {grouped.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-12 text-center">
          <Calendar className="mx-auto h-8 w-8 text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground">No tasks yet. Tell your AI assistant what you need to do.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map(([day, dayTasks]) => (
            <div key={day}>
              {/* Day header */}
              <div className="mb-3 flex items-center gap-2">
                <h3 className={`text-sm font-semibold uppercase tracking-wider ${
                  day === "Overdue" ? "text-red-500" : 
                  day === "Today" ? "text-primary" : 
                  day === "Completed" ? "text-emerald-500" :
                  "text-muted-foreground"
                }`}>
                  {day}
                </h3>
                <span className="text-xs text-muted-foreground">({dayTasks.length})</span>
                <div className="flex-1 border-b border-border/40" />
              </div>

              {/* Tasks in this day */}
              <div className="space-y-2">
                <AnimatePresence>
                  {dayTasks.map((task) => {
                    const risk = riskColor(task.entropyScore);
                    const isOverdue = isPast(new Date(task.deadline)) && task.status !== "DONE";
                    const isDone = task.status === "DONE";
                    const isExpanded = expandedId === task.id;

                    return (
                      <motion.div
                        key={task.id}
                        layout
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className={`rounded-lg border bg-card transition-colors ${
                          isOverdue ? "border-red-500/30" :
                          isDone ? "border-border/50 opacity-70" :
                          "border-border hover:border-border/80"
                        }`}
                      >
                        <button
                          className="flex w-full items-center gap-3 p-3 text-left sm:p-4"
                          onClick={() => setExpandedId(isExpanded ? null : task.id)}
                        >
                          {/* Status icon */}
                          <div className="shrink-0">
                            {isDone ? (
                              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                            ) : isOverdue ? (
                              <AlertTriangle className="h-5 w-5 text-red-500" />
                            ) : (
                              <div className={`h-3 w-3 rounded-full ${risk.bg} ring-4 ${risk.ring}`} />
                            )}
                          </div>

                          {/* Content */}
                          <div className="min-w-0 flex-1">
                            <div className={`font-medium truncate ${isDone ? "line-through text-muted-foreground" : ""}`}>
                              {task.title}
                            </div>
                            <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {isDone && task.completedAt
                                  ? `Done ${format(new Date(task.completedAt), "MMM d, h:mm a")}`
                                  : format(new Date(task.deadline), "h:mm a")}
                              </span>
                              {task.estimatedMins && (
                                <span className="flex items-center gap-1">
                                  <Timer className="h-3 w-3" />
                                  {task.estimatedMins}m
                                </span>
                              )}
                              {task.snoozeCount > 0 && (
                                <span className="text-amber-500">snoozed ×{task.snoozeCount}</span>
                              )}
                            </div>
                          </div>

                          {/* Right side */}
                          <div className="flex shrink-0 items-center gap-2">
                            {!isDone && (
                              <span className={`text-xs font-medium ${isOverdue ? "text-red-500" : risk.text}`}>
                                {timeLabel(task.deadline)}
                              </span>
                            )}
                            <ChevronRight className={`h-4 w-4 text-muted-foreground/40 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                          </div>
                        </button>

                        {/* Expanded details */}
                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="overflow-hidden"
                            >
                              <div className="border-t border-border/40 px-4 py-3 text-sm">
                                {task.description && (
                                  <p className="mb-2 text-muted-foreground">{task.description}</p>
                                )}
                                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                                  <span>Deadline: {format(new Date(task.deadline), "PPpp")}</span>
                                  <span>Urgency: {risk.label} ({Math.round(task.entropyScore * 100)}%)</span>
                                  <span>Status: {task.status}</span>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
