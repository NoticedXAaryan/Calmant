import { Activity, CheckCircle2, ChevronRight, LayoutDashboard, MonitorPlay, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LiveSandboxViewer, SandboxStatus } from "@/components/LiveSandboxViewer";
import { Badge } from "@/components/ui/badge";

interface ToolAction {
  id: string;
  message: string;
  status: "pending" | "success" | "error";
  time: string;
}

interface ActionPanelProps {
  sandboxStatus: SandboxStatus;
  setSandboxStatus: (status: SandboxStatus) => void;
  toolActions: ToolAction[];
}

export function ActionPanel({ sandboxStatus, setSandboxStatus, toolActions }: ActionPanelProps) {
  return (
    <div className="flex h-full w-[380px] shrink-0 flex-col overflow-hidden border-l border-zinc-200 bg-zinc-50/80 shadow-2xl backdrop-blur-xl dark:border-zinc-800 dark:bg-zinc-950/80 lg:w-[480px]">
      <div className="flex flex-1 flex-col h-full p-5 lg:p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h3 className="flex items-center gap-2 text-lg font-semibold tracking-tight text-foreground">
              <Activity className="h-5 w-5 text-primary" />
              Action panel
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">Monitor what your assistant is doing.</p>
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-6 overflow-y-auto pr-2" style={{ scrollbarWidth: "none" }}>
          {/* Live Browser Section */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium uppercase tracking-[0.14em] text-muted-foreground">
                Live browser
              </div>
              {sandboxStatus === "live" && (
                <Badge variant="outline" className="border-emerald-500/40 text-emerald-600 dark:text-emerald-400">
                  <span className="mr-1.5 h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                  Active
                </Badge>
              )}
            </div>
            
            <div className="min-h-[260px] flex-shrink-0 overflow-hidden rounded-xl bg-black shadow-inner ring-1 ring-black/5 dark:ring-white/10">
              <LiveSandboxViewer onStatusChange={setSandboxStatus} />
            </div>
          </div>

          {/* Activity Stream Section */}
          <div className="flex flex-col gap-3">
            <div className="text-sm font-medium uppercase tracking-[0.14em] text-muted-foreground">
              Activity stream
            </div>
            <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
              {toolActions.length === 0 ? (
                <div className="text-sm text-muted-foreground text-center py-6">
                  No recent tool activity.
                </div>
              ) : (
                <div className="relative space-y-4 before:absolute before:inset-0 before:ml-2.5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
                  {toolActions.map((action, i) => (
                    <div key={action.id} className="relative flex items-center gap-3">
                      <div className="flex items-center justify-center w-5 h-5 rounded-full border border-background bg-card z-10 ring-2 ring-background">
                        {action.status === "success" && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />}
                        {action.status === "pending" && <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />}
                        {action.status === "error" && <span className="w-2 h-2 rounded-full bg-red-500" />}
                      </div>
                      <div className="flex flex-1 items-center justify-between rounded-md border border-border bg-background p-2 px-3 text-sm shadow-sm">
                        <span className="text-foreground">{action.message}</span>
                        <span className="text-xs text-muted-foreground ml-2">{action.time}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
