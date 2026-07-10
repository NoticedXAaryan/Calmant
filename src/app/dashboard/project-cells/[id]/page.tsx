"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2, ArrowLeft, CheckCircle2, Circle, Clock, AlertTriangle, FileText, Activity } from "lucide-react";
import Link from "next/link";

export default function ProjectCellPage() {
  const params = useParams();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const res = await fetch(`/api/project-cells/${params.id}`);
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, [loadData]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--color-calmant-electric-blue)]" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col h-screen items-center justify-center space-y-4">
        <p className="text-muted-foreground">Project Cell not found.</p>
        <button onClick={() => router.push("/dashboard")} className="text-[var(--color-calmant-electric-blue)] hover:underline">
          Return to Dashboard
        </button>
      </div>
    );
  }

  const { tasks, approvals, artifacts, events, qaResults, memoryCandidates } = data;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-12 animate-in fade-in duration-500">
      <header className="space-y-4">
        <Link href="/dashboard" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Command Center
        </Link>
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight text-foreground">{data.title}</h1>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium uppercase tracking-wider
              ${data.status === 'active' ? 'bg-[var(--color-calmant-electric-blue)]/10 text-[var(--color-calmant-electric-blue)]' 
              : data.status === 'paused' ? 'bg-[var(--color-calmant-amber)]/10 text-[var(--color-calmant-amber)]'
              : 'bg-muted text-muted-foreground'}`}>
              {data.status}
            </span>
          </div>
          <p className="text-lg text-muted-foreground mt-2">{data.objective}</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          
          <section className="space-y-4">
            <h2 className="text-xl font-semibold tracking-tight">Task Graph</h2>
            <div className="rounded-xl border border-border/40 bg-card/60 backdrop-blur-xl shadow-sm divide-y divide-border/40">
              {tasks?.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">No tasks planned yet.</div>
              ) : (
                tasks?.map((task: any) => (
                  <div key={task.id} className="p-4 flex items-start gap-4 hover:bg-white/5 transition-colors">
                    <div className="mt-1">
                      {task.status === "completed" ? <CheckCircle2 className="w-5 h-5 text-[var(--color-calmant-electric-blue)]" />
                       : task.status === "blocked" ? <AlertTriangle className="w-5 h-5 text-[var(--color-calmant-coral)]" />
                       : task.status === "running" ? <Loader2 className="w-5 h-5 animate-spin text-[var(--color-calmant-amber)]" />
                       : <Circle className="w-5 h-5 text-muted-foreground" />}
                    </div>
                    <div className="flex-1">
                      <p className={`font-medium ${task.status === "completed" ? "text-muted-foreground line-through" : "text-foreground"}`}>
                        {task.title}
                      </p>
                      {task.description && <p className="text-sm text-muted-foreground mt-1">{task.description}</p>}
                    </div>
                    <div className="text-xs font-mono text-muted-foreground uppercase">{task.status}</div>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold tracking-tight">Artifacts & Documents</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {artifacts?.length === 0 ? (
                <div className="col-span-full p-8 text-center border rounded-xl bg-card/40 text-muted-foreground">No artifacts produced.</div>
              ) : (
                artifacts?.map((art: any) => (
                  <div key={art.id} className="rounded-xl border border-border/40 bg-card/60 p-4 hover:border-foreground/20 transition-colors cursor-pointer group flex items-start gap-3">
                    <FileText className="w-8 h-8 text-muted-foreground group-hover:text-[var(--color-calmant-electric-blue)] transition-colors" />
                    <div>
                      <p className="font-medium text-sm text-foreground/90">{art.title}</p>
                      <p className="text-xs text-muted-foreground capitalize mt-0.5">{art.type}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

        </div>

        <div className="space-y-8">
          
          <section className="space-y-4">
            <h2 className="text-xl font-semibold tracking-tight">Approvals Needed</h2>
            <div className="space-y-3">
              {approvals?.length === 0 ? (
                <div className="p-4 border rounded-xl bg-card/40 text-center text-sm text-muted-foreground">All clear.</div>
              ) : (
                approvals?.map((app: any) => (
                  <div key={app.id} className="p-4 rounded-xl border border-[var(--color-calmant-amber)]/30 bg-[var(--color-calmant-amber)]/5 shadow-sm">
                    <p className="font-medium text-sm text-[var(--color-calmant-amber)]">{app.title}</p>
                    <button onClick={() => router.push("/dashboard/approvals")} className="mt-3 text-xs font-medium text-foreground hover:underline">
                      Review →
                    </button>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="space-y-4">
            <h2 className="text-xl font-semibold tracking-tight">Events log</h2>
            <div className="rounded-xl border border-border/40 bg-card/60 overflow-hidden relative max-h-[400px] flex flex-col">
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {events?.map((ev: any) => (
                  <div key={ev.id} className="flex gap-3 text-sm">
                    <Activity className={`w-4 h-4 shrink-0 mt-0.5 ${ev.level === 'warn' ? 'text-[var(--color-calmant-amber)]' : ev.level === 'error' ? 'text-[var(--color-calmant-coral)]' : 'text-muted-foreground'}`} />
                    <div>
                      <p className="text-foreground/80">{ev.message}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{new Date(ev.createdAt).toLocaleTimeString()}</p>
                    </div>
                  </div>
                ))}
                {events?.length === 0 && <div className="text-center text-muted-foreground">No events.</div>}
              </div>
            </div>
          </section>
          
        </div>
      </div>
    </div>
  );
}
