"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlarmClock,
  ArrowRight,
  Bot,
  CalendarDays,
  CheckCircle2,
  Clock,
  Loader2,
  Play,
  Plus,
  RefreshCw,
  TimerReset,
  Wand2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import VoiceInput from "@/components/VoiceInput";

interface PlanTask {
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

interface PlanBlock {
  id: string;
  taskId: string;
  title: string;
  startTime: string;
  endTime: string;
  entropyScore: number;
}

interface ExecutionPlan {
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

interface FocusState {
  taskId: string;
  title: string;
  nextAction: string;
  endsAt: number;
  totalMins: number;
}

interface CaptureDraft {
  title: string;
  deadline: string;
  estimatedMins: number;
  priority: number;
  description: string;
}

interface CaptureAnalysis {
  confidence: number;
  needsClarification: boolean;
  questions: string[];
  interpretation: string;
  reminderOffsetMins?: number;
}

const RISK_DOT: Record<PlanTask["riskLevel"], string> = {
  cool: "bg-emerald-500",
  warm: "bg-amber-500",
  hot: "bg-orange-500",
  critical: "bg-red-500",
};

const RISK_TEXT: Record<PlanTask["riskLevel"], string> = {
  cool: "text-emerald-600 dark:text-emerald-400",
  warm: "text-amber-600 dark:text-amber-400",
  hot: "text-orange-600 dark:text-orange-400",
  critical: "text-red-600 dark:text-red-400",
};

function formatClock(value: string) {
  return new Date(value).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function formatTimer(ms: number) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const mins = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(mins).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function statusLabel(status: string) {
  return status.toLowerCase().replace("_", " ");
}

function EntropyDot({ level }: { level: PlanTask["riskLevel"] }) {
  return <span className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${RISK_DOT[level]}`} />;
}

function toDatetimeLocal(value: string) {
  const date = new Date(value);
  const offsetMs = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function fromDatetimeLocal(value: string) {
  return new Date(value).toISOString();
}

function LoadingSurface() {
  return (
    <div className="flex min-h-[420px] items-center justify-center">
      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [plan, setPlan] = useState<ExecutionPlan | null>(null);
  const [capture, setCapture] = useState("");
  const [draft, setDraft] = useState<CaptureDraft | null>(null);
  const [analysis, setAnalysis] = useState<CaptureAnalysis | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [activeFocus, setActiveFocus] = useState<FocusState | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = window.setTimeout(() => {
      if (!document.cookie.includes("vibe2ship_onboarded=true")) {
        router.push("/dashboard/onboarding");
      } else {
        setReady(true);
      }
    }, 0);
    return () => window.clearTimeout(id);
  }, [router]);

  const loadPlan = useCallback(async () => {
    setError(null);
    const res = await fetch("/api/plan", { cache: "no-store" });
    const data = await res.json();

    if (!res.ok || !data.success) {
      throw new Error(data.error || "Unable to build plan");
    }

    setPlan(data.data);
  }, []);

  useEffect(() => {
    if (!ready) return;
    const id = window.setTimeout(() => {
      loadPlan().catch((err) => setError(err.message));
    }, 0);
    return () => window.clearTimeout(id);
  }, [ready, loadPlan]);

  useEffect(() => {
    if (!activeFocus) return;
    const interval = window.setInterval(() => setTick(Date.now()), 1000);
    return () => window.clearInterval(interval);
  }, [activeFocus]);

  const focusRemaining = activeFocus ? Math.max(0, activeFocus.endsAt - tick) : 0;
  const currentTask = plan?.recommendedTask ?? null;

  const captureTask = async (event: FormEvent) => {
    event.preventDefault();
    const command = capture.trim();
    if (!command) return;

    setBusy("capture");
    setError(null);
    setNotice(null);
    try {
      const res = await fetch("/api/tasks/nlp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Could not capture task");
      }

      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Could not understand task");
      setDraft(data.data.draft);
      setAnalysis(data.data.analysis);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not capture task");
    } finally {
      setBusy(null);
    }
  };

  const confirmDraft = async () => {
    if (!draft) return;

    setBusy("confirm-draft");
    setError(null);
    setNotice(null);
    try {
      const res = await fetch("/api/tasks/nlp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmed: true, draft }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Could not create task");

      const notification = data.data?.notification;
      if (notification?.sent) {
        setNotice("Task confirmed and email notification sent.");
      } else if (notification?.reason) {
        setNotice(`Task confirmed. ${notification.reason}`);
      }
      setCapture("");
      setDraft(null);
      setAnalysis(null);
      await loadPlan();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create task");
    } finally {
      setBusy(null);
    }
  };

  const patchTask = async (taskId: string, payload: Record<string, unknown>) => {
    const res = await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Task update failed");
    }
  };

  const startTask = async (task: PlanTask) => {
    setBusy(`start-${task.id}`);
    setError(null);
    setNotice(null);
    try {
      await patchTask(task.id, { status: "IN_PROGRESS" });
      const now = Date.now();
      setTick(now);
      setActiveFocus({
        taskId: task.id,
        title: task.title,
        nextAction: task.nextAction,
        endsAt: now + task.focusMins * 60000,
        totalMins: task.focusMins,
      });
      await loadPlan();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start task");
    } finally {
      setBusy(null);
    }
  };

  const completeTask = async (task: PlanTask) => {
    setBusy(`complete-${task.id}`);
    setError(null);
    setNotice(null);
    try {
      await patchTask(task.id, { status: "DONE" });
      if (activeFocus?.taskId === task.id) setActiveFocus(null);
      await loadPlan();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not complete task");
    } finally {
      setBusy(null);
    }
  };

  const snoozeTask = async (task: PlanTask) => {
    setBusy(`snooze-${task.id}`);
    setError(null);
    setNotice(null);
    try {
      const base = Math.max(Date.now(), new Date(task.deadline).getTime());
      await patchTask(task.id, {
        deadline: new Date(base + 30 * 60000).toISOString(),
        snoozeCount: task.snoozeCount + 1,
      });
      await loadPlan();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not snooze task");
    } finally {
      setBusy(null);
    }
  };

  const decomposeTask = async (task: PlanTask) => {
    setBusy(`decompose-${task.id}`);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(`/api/tasks/${task.id}/decompose`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Could not break down task");
      }
      await loadPlan();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not break down task");
    } finally {
      setBusy(null);
    }
  };

  const refresh = async () => {
    setBusy("refresh");
    setError(null);
    setNotice(null);
    try {
      await loadPlan();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not refresh plan");
    } finally {
      setBusy(null);
    }
  };

  const stats = useMemo(() => {
    if (!plan) return [];
    return [
      { label: "Critical", value: plan.stats.critical, className: "text-red-600 dark:text-red-400" },
      { label: "Hot", value: plan.stats.hot, className: "text-orange-600 dark:text-orange-400" },
      { label: "Warm", value: plan.stats.warm, className: "text-amber-600 dark:text-amber-400" },
      { label: "Done", value: plan.stats.done, className: "text-muted-foreground" },
    ];
  }, [plan]);

  if (!ready || !plan) {
    return <LoadingSurface />;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-5 md:px-8 md:py-8">
        <header className="flex flex-col gap-4 border-b border-border pb-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
              <TimerReset className="h-3.5 w-3.5" />
              Execution cockpit
            </div>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
              Today
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={refresh} disabled={busy === "refresh"} title="Refresh plan">
              {busy === "refresh" ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Refresh
            </Button>
            <Link href="/dashboard/assistant">
              <Button variant="outline">
                <Bot className="h-4 w-4" />
                Assistant
              </Button>
            </Link>
          </div>
        </header>

        {error && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}
        {notice && (
          <div className="rounded-md border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
            {notice}
          </div>
        )}

        <section className="grid gap-4 lg:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.75fr)]">
          <div className="rounded-lg border border-border bg-card p-4 md:p-5">
            {currentTask ? (
              <div className="flex h-full flex-col gap-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="mb-2 flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <EntropyDot level={currentTask.riskLevel} />
                      <span className={RISK_TEXT[currentTask.riskLevel]}>
                        {currentTask.riskLevel}
                      </span>
                      <span>{currentTask.timeLeftLabel}</span>
                    </div>
                    <h2 className="text-xl font-semibold tracking-tight md:text-2xl">
                      {currentTask.title}
                    </h2>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                      <span className="inline-flex items-center gap-1.5">
                        <CalendarDays className="h-4 w-4" />
                        {currentTask.dueLabel}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <Clock className="h-4 w-4" />
                        {currentTask.estimatedMins} min estimate
                      </span>
                    </div>
                  </div>
                  <Badge variant="outline" className="capitalize">
                    {statusLabel(currentTask.status)}
                  </Badge>
                </div>

                <div className="rounded-md border border-border bg-background p-4">
                  <div className="mb-2 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                    Next action
                  </div>
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <p className="max-w-2xl text-base font-medium leading-relaxed">
                      {currentTask.nextAction}
                    </p>
                    <div className="text-sm text-muted-foreground">
                      {currentTask.focusMins} min focus
                    </div>
                  </div>
                </div>

                {currentTask.riskReasons.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {currentTask.riskReasons.map((reason) => (
                      <Badge key={reason} variant="secondary" className="capitalize">
                        {reason}
                      </Badge>
                    ))}
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  <Button onClick={() => startTask(currentTask)} disabled={busy === `start-${currentTask.id}`}>
                    {busy === `start-${currentTask.id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                    Start focus
                  </Button>
                  <Button variant="outline" onClick={() => decomposeTask(currentTask)} disabled={busy === `decompose-${currentTask.id}`}>
                    {busy === `decompose-${currentTask.id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                    Break down
                  </Button>
                  <Button variant="outline" onClick={() => snoozeTask(currentTask)} disabled={busy === `snooze-${currentTask.id}`}>
                    <AlarmClock className="h-4 w-4" />
                    Snooze 30m
                  </Button>
                  <Button variant="outline" onClick={() => completeTask(currentTask)} disabled={busy === `complete-${currentTask.id}`}>
                    {busy === `complete-${currentTask.id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                    Complete
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex min-h-[260px] flex-col items-center justify-center text-center">
                <CheckCircle2 className="mb-3 h-8 w-8 text-muted-foreground" />
                <h2 className="text-xl font-semibold tracking-tight">No active commitments</h2>
                <p className="mt-2 max-w-md text-sm text-muted-foreground">
                  Capture a deadline when one appears and the planner will build the next action.
                </p>
              </div>
            )}
          </div>

          <aside className="flex flex-col gap-4">
            <form onSubmit={captureTask} className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-center justify-between gap-3">
                <label htmlFor="task-capture" className="text-sm font-medium">
                  Capture
                </label>
                <VoiceInput
                  disabled={busy === "capture" || busy === "confirm-draft"}
                  onInterimTranscript={(text) => setCapture(text)}
                  onTranscript={(text) => setCapture(text)}
                />
              </div>
              <textarea
                id="task-capture"
                value={capture}
                onChange={(event) => setCapture(event.target.value)}
                placeholder="Submit DBMS assignment tomorrow by 9pm, 2 hours"
                rows={4}
                className="mt-3 min-h-24 w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
              />
              <Button type="submit" className="mt-3 w-full" disabled={busy === "capture" || !capture.trim()}>
                {busy === "capture" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Understand task
              </Button>
            </form>

            {draft && (
              <div className="rounded-lg border border-border bg-card p-4">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium">Confirm capture</div>
                    {analysis && (
                      <div className="mt-1 text-xs text-muted-foreground">
                        {Math.round(analysis.confidence * 100)}% confidence
                      </div>
                    )}
                  </div>
                  {analysis?.needsClarification && (
                    <Badge variant="outline" className="border-amber-500/40 text-amber-600 dark:text-amber-400">
                      Needs check
                    </Badge>
                  )}
                </div>

                {analysis && (
                  <div className="mb-3 rounded-md border border-border bg-background p-3 text-sm text-muted-foreground">
                    {analysis.interpretation}
                    {analysis.questions.length > 0 && (
                      <div className="mt-2 space-y-1 text-amber-600 dark:text-amber-400">
                        {analysis.questions.map((question) => (
                          <div key={question}>{question}</div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="space-y-3">
                  <label className="block text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                    Title
                    <input
                      value={draft.title}
                      onChange={(event) => setDraft({ ...draft, title: event.target.value })}
                      className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm normal-case tracking-normal text-foreground outline-none focus:border-ring"
                    />
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <label className="block text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                      Deadline
                      <input
                        type="datetime-local"
                        value={toDatetimeLocal(draft.deadline)}
                        onChange={(event) => setDraft({ ...draft, deadline: fromDatetimeLocal(event.target.value) })}
                        className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm normal-case tracking-normal text-foreground outline-none focus:border-ring"
                      />
                    </label>
                    <label className="block text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                      Minutes
                      <input
                        type="number"
                        min={5}
                        value={draft.estimatedMins}
                        onChange={(event) => setDraft({ ...draft, estimatedMins: Number(event.target.value) })}
                        className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm normal-case tracking-normal text-foreground outline-none focus:border-ring"
                      />
                    </label>
                  </div>
                </div>

                <div className="mt-4 flex gap-2">
                  <Button onClick={confirmDraft} disabled={busy === "confirm-draft" || !draft.title.trim()}>
                    {busy === "confirm-draft" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                    Confirm
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setDraft(null);
                      setAnalysis(null);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            <div className="rounded-lg border border-border bg-card p-4">
              <div className="mb-3 text-sm font-medium">Signal</div>
              <div className="grid grid-cols-2 gap-2">
                {stats.map((item) => (
                  <div key={item.label} className="rounded-md border border-border bg-background p-3">
                    <div className={`text-2xl font-semibold ${item.className}`}>{item.value}</div>
                    <div className="mt-1 text-xs uppercase tracking-[0.12em] text-muted-foreground">{item.label}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-border bg-card p-4">
              <div className="mb-3 text-sm font-medium">Focus session</div>
              {activeFocus ? (
                <div className="space-y-3">
                  <div className="text-3xl font-semibold tabular-nums">{formatTimer(focusRemaining)}</div>
                  <div>
                    <div className="text-sm font-medium">{activeFocus.title}</div>
                    <div className="mt-1 text-sm text-muted-foreground">{activeFocus.nextAction}</div>
                  </div>
                  <Button variant="outline" className="w-full" onClick={() => setActiveFocus(null)}>
                    Stop timer
                  </Button>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">
                  Start a task to create a timed execution window.
                </div>
              )}
            </div>
          </aside>
        </section>

        <section className="grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold">Rescue plan</h2>
                <p className="mt-1 text-sm text-muted-foreground">{plan.totalFocusMins} min scheduled from now</p>
              </div>
              <Link href="/dashboard/schedule">
                <Button variant="outline" size="sm">
                  Schedule
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
            <div className="space-y-2">
              {plan.blocks.length === 0 ? (
                <div className="rounded-md border border-dashed border-border p-6 text-sm text-muted-foreground">
                  No blocks yet.
                </div>
              ) : (
                plan.blocks.map((block) => {
                  const task = plan.tasks.find((item) => item.id === block.taskId);
                  return (
                    <div key={block.id} className="grid grid-cols-[86px_minmax(0,1fr)] gap-3 rounded-md border border-border bg-background p-3">
                      <div className="text-xs font-medium tabular-nums text-muted-foreground">
                        {formatClock(block.startTime)}
                        <br />
                        {formatClock(block.endTime)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          {task && <EntropyDot level={task.riskLevel} />}
                          <div className="truncate text-sm font-medium">{block.title}</div>
                        </div>
                        {task && <div className="mt-1 text-xs text-muted-foreground">{task.title}</div>}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border p-4">
              <div>
                <h2 className="text-base font-semibold">Task queue</h2>
                <p className="mt-1 text-sm text-muted-foreground">{plan.tasks.length} active tasks ordered by execution risk</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="border-b border-border text-xs uppercase tracking-[0.12em] text-muted-foreground">
                  <tr>
                    <th className="w-10 px-4 py-3" />
                    <th className="px-4 py-3">Task</th>
                    <th className="px-4 py-3">Due</th>
                    <th className="px-4 py-3">Score</th>
                    <th className="px-4 py-3">Next action</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {plan.tasks.map((task) => (
                    <tr key={task.id} className="border-b border-border last:border-0 hover:bg-muted/40">
                      <td className="px-4 py-3">
                        <EntropyDot level={task.riskLevel} />
                      </td>
                      <td className="max-w-[220px] px-4 py-3">
                        <div className="truncate font-medium">{task.title}</div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {statusLabel(task.status)} - {Math.round(task.progress * 100)}%
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{task.dueLabel}</td>
                      <td className="whitespace-nowrap px-4 py-3 font-mono">{task.entropyScore.toFixed(2)}</td>
                      <td className="max-w-[260px] px-4 py-3 text-muted-foreground">
                        <div className="truncate">{task.nextAction}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1.5">
                          <Button size="icon-sm" variant="ghost" title="Start focus" onClick={() => startTask(task)}>
                            <Play className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="icon-sm" variant="ghost" title="Break down" onClick={() => decomposeTask(task)}>
                            <Wand2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="icon-sm" variant="ghost" title="Snooze 30 minutes" onClick={() => snoozeTask(task)}>
                            <AlarmClock className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="icon-sm" variant="ghost" title="Complete" onClick={() => completeTask(task)}>
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {plan.tasks.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-10 text-center text-sm text-muted-foreground">
                        No active tasks.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
