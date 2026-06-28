"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import {
  Activity,
  Brain,
  Briefcase,
  CheckCircle2,
  Clock,
  Globe,
  Loader2,
  Mail,
  MessageCircle,
  PenTool,
  Search,
  Shield,
  XCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import TaskTimeline from "@/components/TaskTimeline";

/* ─── Types ──────────────────────────────────────────────────────────── */

interface AgentRun {
  id: string;
  prompt: string;
  response: string | null;
  status: string;
  createdAt: string;
}

interface DeptRun {
  id: string;
  department: string;
  objective: string;
  status: string;
  output: any;
  startedAt: string;
  completedAt: string | null;
}

/* ─── Department icons ──────────────────────────────────────────────── */

const deptMeta: Record<string, { icon: React.ComponentType<any>; label: string; color: string }> = {
  capture: { icon: Briefcase, label: "Capture", color: "text-blue-500" },
  deadline: { icon: Clock, label: "Deadline", color: "text-amber-500" },
  comms: { icon: MessageCircle, label: "Comms", color: "text-green-500" },
  recovery: { icon: Shield, label: "Recovery", color: "text-red-500" },
  intel: { icon: Search, label: "Intel", color: "text-purple-500" },
  creator: { icon: PenTool, label: "Creator", color: "text-pink-500" },
  browser: { icon: Globe, label: "Browser", color: "text-cyan-500" },
};

/* ─── Tabs ──────────────────────────────────────────────────────────── */

type Tab = "timeline" | "activity";

export default function ActivityPage() {
  const [tab, setTab] = useState<Tab>("timeline");
  const [runs, setRuns] = useState<AgentRun[]>([]);
  const [deptRuns, setDeptRuns] = useState<DeptRun[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (tab === "activity") {
      fetchActivity();
    }
  }, [tab]);

  const fetchActivity = async () => {
    setLoading(true);
    try {
      const [runsRes, deptRes] = await Promise.all([
        fetch("/api/agent/runs").then((r) => r.json()),
        fetch("/api/agent/department-runs").then((r) => r.json()),
      ]);
      if (runsRes.success) setRuns(runsRes.data || []);
      if (deptRes.success) setDeptRuns(deptRes.data || []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-5 md:px-8 md:py-8">
        {/* Header */}
        <header className="flex flex-col gap-4 border-b border-border pb-5 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
              <Activity className="h-3.5 w-3.5" />
              Timeline & Activity
            </div>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
              What&apos;s happening
            </h1>
          </div>

          {/* Tabs */}
          <div className="flex rounded-lg border border-border bg-muted/30 p-0.5">
            <button
              onClick={() => setTab("timeline")}
              className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
                tab === "timeline" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Tasks
            </button>
            <button
              onClick={() => setTab("activity")}
              className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
                tab === "activity" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              AI Activity
            </button>
          </div>
        </header>

        {/* Tab content */}
        {tab === "timeline" && <TaskTimeline />}

        {tab === "activity" && (
          <>
            {loading ? (
              <div className="flex min-h-[300px] items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-6">
                {/* Agent conversations */}
                <div>
                  <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                    Conversations ({runs.length})
                  </h3>
                  {runs.length === 0 ? (
                    <div className="rounded-lg border border-border bg-card p-8 text-center text-sm text-muted-foreground">
                      <Brain className="mx-auto h-6 w-6 mb-2 text-muted-foreground/40" />
                      No conversations yet.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {runs.slice(0, 20).map((run) => (
                        <motion.div
                          key={run.id}
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="rounded-lg border border-border bg-card p-3 sm:p-4"
                        >
                          <div className="flex items-start gap-3">
                            <div className="shrink-0 mt-0.5">
                              {run.status === "completed" ? (
                                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                              ) : run.status === "failed" ? (
                                <XCircle className="h-4 w-4 text-red-500" />
                              ) : (
                                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium truncate">{run.prompt}</p>
                              {run.response && (
                                <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{run.response}</p>
                              )}
                              <p className="mt-1 text-xs text-muted-foreground/60">
                                {format(new Date(run.createdAt), "MMM d, h:mm a")}
                              </p>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Department runs */}
                <div>
                  <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                    Department Activity ({deptRuns.length})
                  </h3>
                  {deptRuns.length === 0 ? (
                    <div className="rounded-lg border border-border bg-card p-8 text-center text-sm text-muted-foreground">
                      <Activity className="mx-auto h-6 w-6 mb-2 text-muted-foreground/40" />
                      No department activity yet.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {deptRuns.slice(0, 30).map((run) => {
                        const meta = deptMeta[run.department] || { icon: Activity, label: run.department, color: "text-muted-foreground" };
                        const Icon = meta.icon;
                        return (
                          <motion.div
                            key={run.id}
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="rounded-lg border border-border bg-card p-3 sm:p-4"
                          >
                            <div className="flex items-start gap-3">
                              <Icon className={`h-4 w-4 shrink-0 mt-0.5 ${meta.color}`} />
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <span className={`text-xs font-semibold ${meta.color}`}>{meta.label}</span>
                                  <span className={`text-xs px-1.5 py-0.5 rounded ${
                                    run.status === "completed" ? "bg-emerald-500/10 text-emerald-500" :
                                    run.status === "failed" ? "bg-red-500/10 text-red-500" :
                                    "bg-muted text-muted-foreground"
                                  }`}>
                                    {run.status}
                                  </span>
                                </div>
                                <p className="mt-1 text-sm truncate">{run.objective}</p>
                                <p className="mt-1 text-xs text-muted-foreground/60">
                                  {format(new Date(run.startedAt), "MMM d, h:mm:ss a")}
                                  {run.completedAt && ` — ${Math.round((new Date(run.completedAt).getTime() - new Date(run.startedAt).getTime()) / 1000)}s`}
                                </p>
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
