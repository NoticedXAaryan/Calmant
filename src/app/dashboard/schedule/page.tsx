"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Clock, Loader2, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";

interface ScheduleBlock {
  id: string;
  taskId: string;
  title: string;
  startTime: string;
  endTime: string;
  entropyScore: number;
  type: "focus";
  status: "scheduled";
}

function formatDuration(block: ScheduleBlock) {
  const mins = Math.round((new Date(block.endTime).getTime() - new Date(block.startTime).getTime()) / 60000);
  return `${mins} min`;
}

function riskClass(score: number) {
  if (score >= 0.85) return "bg-red-500";
  if (score >= 0.65) return "bg-orange-500";
  if (score >= 0.4) return "bg-amber-500";
  return "bg-emerald-500";
}

export default function SchedulePage() {
  const [blocks, setBlocks] = useState<ScheduleBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBlocks = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/schedule", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Failed to fetch schedule");
      setBlocks(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch schedule");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const id = window.setTimeout(() => {
      void fetchBlocks();
    }, 0);
    return () => window.clearTimeout(id);
  }, []);

  const totalMins = useMemo(() => {
    return blocks.reduce((total, block) => {
      return total + Math.round((new Date(block.endTime).getTime() - new Date(block.startTime).getTime()) / 60000);
    }, 0);
  }, [blocks]);

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-5 md:px-8 md:py-8">
        <header className="flex flex-col gap-4 border-b border-border pb-5 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
              <CalendarDays className="h-3.5 w-3.5" />
              Schedule
            </div>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
              Focus blocks
            </h1>
          </div>
          <Button variant="outline" onClick={fetchBlocks} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Refresh
          </Button>
        </header>

        {error && (
          <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="text-2xl font-semibold">{blocks.length}</div>
            <div className="mt-1 text-xs uppercase tracking-[0.12em] text-muted-foreground">Blocks</div>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="text-2xl font-semibold">{totalMins}</div>
            <div className="mt-1 text-xs uppercase tracking-[0.12em] text-muted-foreground">Minutes</div>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="text-2xl font-semibold">
              {blocks.filter((block) => block.entropyScore >= 0.85).length}
            </div>
            <div className="mt-1 text-xs uppercase tracking-[0.12em] text-muted-foreground">Critical first</div>
          </div>
        </section>

        <section className="rounded-lg border border-border bg-card">
          <div className="border-b border-border p-4">
            <h2 className="text-base font-semibold">Generated plan</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Built from active tasks, deadlines, estimates, snoozes, and missing subtasks.
            </p>
          </div>

          {loading ? (
            <div className="flex min-h-[260px] items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : blocks.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">
              No focus blocks available.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {blocks.map((block, index) => (
                <div key={block.id} className="grid gap-4 p-4 md:grid-cols-[120px_minmax(0,1fr)_120px] md:items-center">
                  <div className="text-sm text-muted-foreground">
                    <div className="font-medium text-foreground">{format(new Date(block.startTime), "h:mm a")}</div>
                    <div>{format(new Date(block.endTime), "h:mm a")}</div>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${riskClass(block.entropyScore)}`} />
                      <div className="truncate font-medium">{block.title}</div>
                    </div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      {format(new Date(block.startTime), "EEE, MMM d")} - block {index + 1}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground md:justify-end">
                    <Clock className="h-4 w-4" />
                    {formatDuration(block)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
