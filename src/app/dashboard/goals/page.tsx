"use client";

import { useCallback, useEffect, useState } from "react";
import { Archive, Flag, Loader2, Pause, Play } from "lucide-react";
import { PageHeader } from "@/components/app/PageHeader";
import { EmptyState } from "@/components/app/EmptyState";
import { NewGoalDialog } from "@/components/app/dashboard/NewGoalDialog";

interface GoalRow {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  projectCells?: { id: string; title: string; status: string }[];
}

export default function GoalsPage() {
  const [goals, setGoals] = useState<GoalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadGoals = useCallback(async () => {
    try {
      const res = await fetch("/api/goals");
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || "Failed to load goals");
      }
      setGoals(json.data || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load goals");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadGoals();
  }, [loadGoals]);

  const updateGoal = async (id: string, action: "pause" | "resume" | "archive") => {
    await fetch(`/api/goals/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    loadGoals();
  };

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6 md:px-8 md:py-8">
      <PageHeader
        eyebrow="Direction"
        title="Goals"
        description="Long-running objectives. Each goal opens a project cell the assistant can plan, research, and execute."
        actions={<NewGoalDialog onGoalCreated={loadGoals} />}
      />

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading goals...
        </div>
      ) : error ? (
        <p className="text-sm text-destructive" role="alert">{error}</p>
      ) : goals.length === 0 ? (
        <EmptyState
          title="No goals yet"
          description="Capture one outcome you want finished. Calmant will keep the next action in front of you."
          icon={Flag}
        />
      ) : (
        <div className="space-y-3">
          {goals.map((goal) => (
            <article key={goal.id} className="rounded-xl border border-border/50 bg-card/60 p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="font-medium text-foreground">{goal.title}</h2>
                    <span className="rounded-full border border-border/60 px-2 py-0.5 text-[11px] uppercase tracking-wide text-muted-foreground">
                      {goal.status}
                    </span>
                  </div>
                  {goal.description && (
                    <p className="mt-1 text-sm text-muted-foreground">{goal.description}</p>
                  )}
                  {!!goal.projectCells?.length && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      {goal.projectCells.length} project {goal.projectCells.length === 1 ? "cell" : "cells"}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {goal.status === "paused" ? (
                    <button
                      type="button"
                      onClick={() => updateGoal(goal.id, "resume")}
                      className="rounded-md p-2 hover:bg-muted"
                      title="Resume"
                    >
                      <Play className="h-4 w-4 text-muted-foreground" />
                    </button>
                  ) : goal.status !== "abandoned" && goal.status !== "completed" ? (
                    <button
                      type="button"
                      onClick={() => updateGoal(goal.id, "pause")}
                      className="rounded-md p-2 hover:bg-muted"
                      title="Pause"
                    >
                      <Pause className="h-4 w-4 text-muted-foreground" />
                    </button>
                  ) : null}
                  {goal.status !== "abandoned" && (
                    <button
                      type="button"
                      onClick={() => updateGoal(goal.id, "archive")}
                      className="rounded-md p-2 hover:bg-muted"
                      title="Archive"
                    >
                      <Archive className="h-4 w-4 text-muted-foreground" />
                    </button>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
