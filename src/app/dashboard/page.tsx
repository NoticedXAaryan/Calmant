"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import {
  ExecutionPlan,
  FocusState,
  CaptureDraft,
  CaptureAnalysis,
  PlanTask
} from "./types";

import { TodayHeader } from "@/components/app/dashboard/TodayHeader";
import { NextActionCard } from "@/components/app/dashboard/NextActionCard";
import { QuickCapture } from "@/components/app/dashboard/QuickCapture";
import { SignalGrid } from "@/components/app/dashboard/SignalGrid";
import { FocusSessionCard } from "@/components/app/dashboard/FocusSessionCard";
import { RescuePlanTimeline } from "@/components/app/dashboard/RescuePlanTimeline";
import { TaskQueueTable } from "@/components/app/dashboard/TaskQueueTable";

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
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-4 py-8 md:px-8">
        <header className="flex items-end justify-between border-b border-border/50 pb-6">
          <TodayHeader busy={busy} onRefresh={refresh} />
        </header>

        {error && (
          <div className="rounded-none border-l-2 border-destructive bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}
        {notice && (
          <div className="rounded-none border-l-2 border-primary bg-primary/5 px-4 py-3 text-sm text-foreground">
            {notice}
          </div>
        )}

        <section className="grid gap-8 lg:grid-cols-[1fr_320px]">
          <div className="flex flex-col gap-8">
            <div className="border border-border/50 bg-surface/50 p-6 relative">
              {/* Decorative corner accent */}
              <div className="absolute top-0 left-0 w-8 h-8 border-t border-l border-primary/40 -translate-x-px -translate-y-px pointer-events-none" />
              <NextActionCard
                task={currentTask}
                busy={busy}
                onStart={startTask}
                onDecompose={decomposeTask}
                onSnooze={snoozeTask}
                onComplete={completeTask}
              />
            </div>
            
            <div className="border-t border-border/50 pt-8">
              <TaskQueueTable 
                plan={plan}
                busy={busy}
                onStart={startTask}
                onDecompose={decomposeTask}
                onSnooze={snoozeTask}
                onComplete={completeTask}
              />
            </div>
          </div>

          <aside className="flex flex-col gap-8 lg:border-l lg:border-border/50 lg:pl-8">
            <div>
              <div className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground mb-4">Command</div>
              <QuickCapture
                capture={capture}
                draft={draft}
                analysis={analysis}
                busy={busy}
                onChangeCapture={setCapture}
                onSetDraft={setDraft}
                onSetAnalysis={setAnalysis}
                onSubmitCapture={captureTask}
                onConfirmDraft={confirmDraft}
              />
            </div>

            <div>
              <div className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground mb-4">Telemetry</div>
              <SignalGrid stats={stats} />
            </div>

            {activeFocus && (
              <div className="border border-accent/20 bg-accent/5 p-4">
                <FocusSessionCard 
                  activeFocus={activeFocus} 
                  focusRemaining={focusRemaining} 
                  onStop={() => setActiveFocus(null)} 
                />
              </div>
            )}
            
            <div>
              <div className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground mb-4">Horizon</div>
              <RescuePlanTimeline plan={plan} />
            </div>
          </aside>
        </section>
      </div>
    </div>
  );
}
