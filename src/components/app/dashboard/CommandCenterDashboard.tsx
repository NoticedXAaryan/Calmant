"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Play, Pause, Archive } from "lucide-react";

import { CommandHeader } from "@/components/app/premium/CommandHeader";
import { PendingApprovalPanel } from "@/components/app/premium/PendingApprovalPanel";
import { ActiveMissionRail } from "@/components/app/premium/ActiveMissionRail";
import { SignalGrid } from "@/components/app/dashboard/SignalGrid";
import { ExecutionStatusPanel } from "@/components/app/dashboard/ExecutionStatusPanel";
import { NewGoalDialog } from "@/components/app/dashboard/NewGoalDialog";
import { SandboxViewer } from "@/components/app/dashboard/SandboxViewer";

export function CommandCenterDashboard() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const res = await fetch("/api/command-center/today");
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, [loadData]);

  const updateGoal = async (id: string, action: string) => {
    await fetch(`/api/goals/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    loadData();
  };

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-80px)] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--color-calmant-electric-blue)]" />
      </div>
    );
  }

  if (!data) return null;

  const mappedApprovals = data.approvals.map((a: any) => ({
    id: a.id,
    title: a.title,
    description: a.description,
    riskLevel: a.payload?.riskLevel || 'MEDIUM',
    timeAgo: 'Just now',
    onReview: () => router.push("/dashboard/approvals"),
  }));

  const activeMissions = data.activeProjectCells.map((c: any) => ({
    id: c.id,
    title: c.title,
    progress: c.tasks.length ? Math.round((c.tasks.filter((t:any) => t.status === "completed").length / c.tasks.length) * 100) : 0,
    statusText: c.status
  }));

  const report = data.reportPreview;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 md:px-8 md:py-8 space-y-8 w-full animate-in fade-in duration-500">
      <CommandHeader 
        title="Command Center"
        subtitle="Your personal productivity headquarters."
        commandInput={<div />}
        activeStatusBadge={
          <div className="flex items-center gap-4 text-sm font-medium bg-background/50 backdrop-blur-md px-4 py-2 rounded-full border border-border">
            <span className="text-[var(--color-calmant-electric-blue)]">{data.activeGoals.length} Goals</span>
            <span className="text-[var(--color-calmant-coral)]">{data.blockers.length} Blockers</span>
            <span className="text-[var(--color-calmant-amber)]">{data.approvals.length} Approvals</span>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {mappedApprovals.length > 0 && (
            <PendingApprovalPanel approvals={mappedApprovals} />
          )}

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-medium tracking-tight text-foreground/90">Active Goals</h2>
              <NewGoalDialog onGoalCreated={loadData} />
            </div>
            {data.activeGoals.length === 0 ? (
              <div className="rounded-xl border border-border/40 bg-card/40 backdrop-blur-xl p-8 text-center shadow-sm">
                <p className="text-sm text-muted-foreground">No active goals found.</p>
              </div>
            ) : (
              data.activeGoals.map((goal: any) => (
                <div key={goal.id} className="rounded-xl border border-border/40 bg-card/60 backdrop-blur-xl p-6 shadow-sm flex items-center justify-between group transition-colors hover:bg-card/80">
                  <div>
                    <h3 className="font-medium text-foreground">{goal.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{goal.description}</p>
                  </div>
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => updateGoal(goal.id, 'pause')} className="p-2 hover:bg-white/10 rounded-md transition-colors" title="Pause">
                      <Pause className="w-4 h-4 text-muted-foreground" />
                    </button>
                    <button onClick={() => updateGoal(goal.id, 'archive')} className="p-2 hover:bg-white/10 rounded-md transition-colors" title="Archive">
                      <Archive className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-medium tracking-tight text-foreground/90">Active Project Cells</h2>
            {data.activeProjectCells.length > 0 ? (
              <div className="space-y-3">
                {data.activeProjectCells.map((cell: any) => (
                  <ExecutionStatusPanel
                    key={cell.id}
                    projectCellId={cell.id}
                    onResume={(id) => {
                      fetch('/api/execution/resume', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ projectCellId: id, resumeToPhase: 'research' }),
                      }).then(loadData);
                    }}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-border/40 bg-card/40 backdrop-blur-xl p-8 text-center shadow-sm">
                <p className="text-sm text-muted-foreground">No active project cells.</p>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-medium tracking-tight text-foreground/90">Blockers</h2>
            {data.blockers.length === 0 ? (
              <div className="rounded-xl border border-border/40 bg-card/40 backdrop-blur-xl p-8 text-center shadow-sm">
                <p className="text-sm text-muted-foreground">No blockers currently.</p>
              </div>
            ) : (
              data.blockers.map((blocker: any) => (
                <div key={blocker.id} className="rounded-xl border border-[var(--color-calmant-coral)]/30 bg-card/60 backdrop-blur-xl p-6 shadow-sm">
                  <h3 className="font-medium text-[var(--color-calmant-coral)]">{blocker.title}</h3>
                  {blocker.description && <p className="text-sm text-muted-foreground mt-1">{blocker.description}</p>}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="space-y-8">
          <SignalGrid stats={[
            { label: "Active Goals", value: data.activeGoals.length, className: "text-[var(--color-calmant-electric-blue)]" },
            { label: "Blockers", value: data.blockers.length, className: "text-[var(--color-calmant-coral)]" },
            { label: "Approvals", value: data.approvals.length, className: "text-[var(--color-calmant-amber)]" },
          ]} />
          
          <SandboxViewer />

          <div className="space-y-4">
            <h2 className="text-xl font-medium tracking-tight text-foreground/90">Latest Report</h2>
            {report ? (
              <div className="rounded-xl border border-border/40 bg-card/60 backdrop-blur-xl p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    {report.type} Report
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(report.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="text-sm text-foreground/80 whitespace-pre-wrap font-mono leading-relaxed bg-black/20 p-4 rounded-lg">
                  {report.content}
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-border/40 bg-card/40 backdrop-blur-xl p-8 text-center shadow-sm">
                <p className="text-sm text-muted-foreground">No reports generated today.</p>
                <button 
                  onClick={() => fetch('/api/reports', { method: 'POST', body: JSON.stringify({ type: 'morning' }) }).then(loadData)}
                  className="mt-4 px-4 py-2 bg-[var(--color-calmant-electric-blue)]/10 hover:bg-[var(--color-calmant-electric-blue)]/20 text-[var(--color-calmant-electric-blue)] rounded-full text-sm font-medium transition-colors"
                >
                  Generate Morning Report
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
