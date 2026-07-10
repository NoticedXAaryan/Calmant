"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Activity } from "lucide-react";
import AssistantChat from "@/components/AssistantChat";
import { useSession } from "@/lib/auth-client";
import { SandboxStatus } from "@/components/LiveSandboxViewer";
import { ActionPanel, ToolAction } from "@/components/app/assistant/ActionPanel";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { StatusState } from "@/lib/design/status";

export default function AssistantPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [ready, setReady] = useState(false);
  const [sandboxStatus, setSandboxStatus] = useState<SandboxStatus>('idle');
  const [toolActions, setToolActions] = useState<ToolAction[]>([]);

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

  const fetchEvents = useCallback(async () => {
    if (!ready) return;
    try {
      // Fetch the latest 10 events for the timeline
      const res = await fetch("/api/activity/events?limit=10", { cache: "no-store" });
      const data = await res.json();
      if (data.success && data.data) {
        const mappedActions: ToolAction[] = data.data.map((event: any) => {
          let status: StatusState = 'active';
          
          if (event.level === 'error') {
            status = 'error';
          } else if (event.type.includes('started') || event.type.includes('planned')) {
            status = 'pending';
          } else if (event.type.includes('completed') || event.type.includes('success')) {
            status = 'success';
          } else if (event.type.includes('approval_needed')) {
            status = 'warning';
          }

          const timeStr = new Date(event.occurredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

          return {
            id: event.id,
            message: event.summary || event.title,
            status,
            time: timeStr
          };
        });
        setToolActions(mappedActions);
      }
    } catch (e) {
      console.error("Failed to fetch events", e);
    }
  }, [ready]);

  useEffect(() => {
    fetchEvents();
    // Poll for new agent events every 3 seconds
    const interval = setInterval(fetchEvents, 3000);
    return () => clearInterval(interval);
  }, [fetchEvents]);

  const userName = session?.user?.name?.split(" ")[0] || undefined;

  if (!ready) {
    return (
      <div className="flex h-[calc(100vh-80px)] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--color-calmant-electric-blue)]" />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-56px)] flex-col md:h-[calc(100vh-64px)] lg:flex-row w-full overflow-hidden relative bg-background animate-in fade-in duration-500">
      {/* Main Chat Area */}
      <div className="flex-1 min-w-0 h-full relative z-0 transition-all duration-300 ease-in-out">
        <AssistantChat userName={userName} />
      </div>

      {/* Mobile Action Panel Trigger */}
      <div className="absolute right-4 top-4 z-40 lg:hidden">
        <Sheet>
          <SheetTrigger render={
            <Button
              variant="outline"
              size="icon"
              className="h-12 w-12 rounded-full shadow-lg border-[var(--color-calmant-electric-blue)]/50 bg-[var(--color-calmant-surface)]/80 backdrop-blur-md hover:bg-accent group relative overflow-hidden"
            />
          }>
              <Activity className="h-5 w-5 text-[var(--color-calmant-electric-blue)]" />
              {sandboxStatus === 'live' && (
                <span className="absolute top-0 right-0 h-3 w-3 rounded-full bg-[var(--color-calmant-citrus-green)] border-2 border-background animate-pulse" />
              )}
          </SheetTrigger>
          <SheetContent side="right" className="w-[380px] sm:w-[480px] p-0 border-l border-border">
            <ActionPanel 
              sandboxStatus={sandboxStatus} 
              setSandboxStatus={setSandboxStatus} 
              toolActions={toolActions}
            />
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop Persistent Action Panel */}
      <div className="hidden lg:block h-full shadow-[-10px_0_30px_-15px_rgba(0,0,0,0.1)]">
        <ActionPanel 
          sandboxStatus={sandboxStatus} 
          setSandboxStatus={setSandboxStatus} 
          toolActions={toolActions}
        />
      </div>
    </div>
  );
}
