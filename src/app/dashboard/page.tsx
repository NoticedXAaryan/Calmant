"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ArrowRight } from "lucide-react";

import { CommandHeader } from "@/components/app/premium/CommandHeader";
import { PendingApprovalPanel } from "@/components/app/premium/PendingApprovalPanel";
import { ActiveMissionRail } from "@/components/app/premium/ActiveMissionRail";
import { QuickCapture } from "@/components/app/dashboard/QuickCapture";
import { SignalGrid } from "@/components/app/dashboard/SignalGrid";
import { RescuePlanTimeline } from "@/components/app/dashboard/RescuePlanTimeline";

import { ExecutionPlan, CaptureDraft, CaptureAnalysis } from "./types";
import { getStatusConfig } from "@/lib/design/status";

function LoadingSurface() {
  return (
    <div className="flex h-[calc(100vh-80px)] items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-[var(--color-calmant-electric-blue)]" />
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
  const [approvals, setApprovals] = useState<any[]>([]);

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

  const loadData = useCallback(async () => {
    try {
      const [planRes, appRes] = await Promise.all([
        fetch("/api/plan", { cache: "no-store" }),
        fetch("/api/approvals", { cache: "no-store" })
      ]);
      const planData = await planRes.json();
      const appData = await appRes.json();

      if (planData.success) setPlan(planData.data);
      if (appData.success) setApprovals(appData.data);
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    if (!ready) return;
    loadData();
    // Poll for updates every 10 seconds
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
  }, [ready, loadData]);

  const captureTask = async (event: FormEvent) => {
    event.preventDefault();
    const command = capture.trim();
    if (!command) return;

    setBusy("capture");
    try {
      const res = await fetch("/api/tasks/nlp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command }),
      });
      const data = await res.json();
      if (data.success) {
        setDraft(data.data.draft);
        setAnalysis(data.data.analysis);
      }
    } finally {
      setBusy(null);
    }
  };

  const confirmDraft = async () => {
    if (!draft) return;
    setBusy("confirm-draft");
    try {
      const res = await fetch("/api/tasks/nlp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmed: true, draft }),
      });
      if (res.ok) {
        setCapture("");
        setDraft(null);
        setAnalysis(null);
        await loadData();
      }
    } finally {
      setBusy(null);
    }
  };

  const handleApprovalReview = (id: string) => {
    // In a real app, this would open a modal to review. For now, navigate to approvals page.
    router.push("/dashboard/approvals");
  };

  const stats = useMemo(() => {
    if (!plan) return [];
    return [
      { label: "Critical", value: plan.stats.critical, className: "text-[var(--color-calmant-coral)]" },
      { label: "Hot", value: plan.stats.hot, className: "text-[var(--color-calmant-amber)]" },
      { label: "Warm", value: plan.stats.warm, className: "text-[var(--color-calmant-electric-blue)]" },
      { label: "Done", value: plan.stats.done, className: "text-muted-foreground" },
    ];
  }, [plan]);

  if (!ready || !plan) {
    return <LoadingSurface />;
  }

  const mappedApprovals = approvals.map(a => ({
    id: a.id,
    title: a.title,
    description: a.description,
    riskLevel: (a.payload?.riskLevel || 'MEDIUM') as 'LOW'|'MEDIUM'|'HIGH',
    timeAgo: 'Just now',
    onReview: handleApprovalReview
  }));

  const activeMissions = plan.tasks
    .filter(t => t.status === 'IN_PROGRESS')
    .map(t => ({
      id: t.id,
      title: t.title,
      progress: 50,
      statusText: 'Executing planned steps...'
    }));

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 md:px-8 md:py-8 space-y-8 w-full animate-in fade-in duration-500">
      <CommandHeader 
        title="Command Center"
        subtitle="Your operations overview and next critical actions."
        activeStatusBadge={
          <div className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${getStatusConfig(activeMissions.length > 0 ? 'active' : 'success').bgColorClass} ${getStatusConfig(activeMissions.length > 0 ? 'active' : 'success').colorClass}`}>
            <span className="relative flex h-2 w-2">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${activeMissions.length > 0 ? 'bg-[var(--color-calmant-electric-blue)]' : 'bg-[var(--color-calmant-citrus-green)]'}`}></span>
              <span className={`relative inline-flex rounded-full h-2 w-2 ${activeMissions.length > 0 ? 'bg-[var(--color-calmant-electric-blue)]' : 'bg-[var(--color-calmant-citrus-green)]'}`}></span>
            </span>
            {activeMissions.length > 0 ? `${activeMissions.length} Active` : 'Idle'}
          </div>
        }
        commandInput={
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
        }
      />

      {mappedApprovals.length > 0 && (
        <PendingApprovalPanel approvals={mappedApprovals} onReviewAll={() => router.push('/dashboard/approvals')} />
      )}

      {activeMissions.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold tracking-wide uppercase text-muted-foreground mb-4">Active Missions</h2>
          <ActiveMissionRail missions={activeMissions} />
        </section>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <section>
            <h2 className="text-sm font-semibold tracking-wide uppercase text-muted-foreground mb-4">Upcoming Schedule</h2>
            <div className="calmant-panel p-6 flex flex-col items-center justify-center text-center min-h-[200px] bg-muted/20">
              <p className="text-muted-foreground text-sm">Schedule synchronization is running in the background.</p>
              <button className="mt-4 text-xs font-medium text-[var(--color-calmant-electric-blue)] flex items-center hover:underline">
                View Calendar <ArrowRight className="h-3 w-3 ml-1" />
              </button>
            </div>
          </section>

          <section>
            <h2 className="text-sm font-semibold tracking-wide uppercase text-muted-foreground mb-4">Recent Artifacts</h2>
            <div className="calmant-panel p-6 flex flex-col items-center justify-center text-center min-h-[200px] bg-muted/20">
              <p className="text-muted-foreground text-sm">No recent artifacts generated.</p>
            </div>
          </section>
        </div>

        <aside className="space-y-8">
          <section>
            <h2 className="text-sm font-semibold tracking-wide uppercase text-muted-foreground mb-4">Telemetry</h2>
            <SignalGrid stats={stats} />
          </section>
          
          <section>
            <h2 className="text-sm font-semibold tracking-wide uppercase text-muted-foreground mb-4">Horizon</h2>
            <RescuePlanTimeline plan={plan} />
          </section>
        </aside>
      </div>
    </div>
  );
}
