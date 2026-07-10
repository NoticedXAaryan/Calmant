import { Activity, CheckCircle2, AlertCircle, XCircle, Clock } from "lucide-react";
import { LiveSandboxViewer, SandboxStatus } from "@/components/LiveSandboxViewer";
import { Badge } from "@/components/ui/badge";
import { getStatusConfig, StatusState } from "@/lib/design/status";

export interface ToolAction {
  id: string;
  message: string;
  status: StatusState;
  time: string;
}

interface ActionPanelProps {
  sandboxStatus: SandboxStatus;
  setSandboxStatus: (status: SandboxStatus) => void;
  toolActions: ToolAction[];
}

export function ActionPanel({ sandboxStatus, setSandboxStatus, toolActions }: ActionPanelProps) {
  return (
    <div className="flex h-full w-[380px] shrink-0 flex-col overflow-hidden border-l border-border bg-[var(--color-calmant-surface)]/80 shadow-2xl backdrop-blur-xl lg:w-[480px]">
      <div className="flex flex-1 flex-col h-full p-5 lg:p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h3 className="flex items-center gap-2 text-lg font-semibold tracking-tight text-foreground">
              <Activity className="h-5 w-5 text-[var(--color-calmant-electric-blue)]" />
              Action Panel
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">Monitor live agent execution steps.</p>
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-6 overflow-y-auto pr-2 hide-scrollbar">
          {/* Live Browser Section */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--color-calmant-cyan)]">
                Live Browser
              </div>
              {sandboxStatus === "live" && (
                <Badge variant="outline" className="border-[var(--color-calmant-citrus-green)]/40 text-[var(--color-calmant-citrus-green)]">
                  <span className="mr-1.5 h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--color-calmant-citrus-green)]" />
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
            <div className="text-sm font-semibold uppercase tracking-[0.14em] text-[var(--color-calmant-violet)]">
              Activity Stream
            </div>
            <div className="calmant-panel p-4">
              {toolActions.length === 0 ? (
                <div className="text-sm text-muted-foreground text-center py-6">
                  Waiting for agent activity...
                </div>
              ) : (
                <div className="relative space-y-4 before:absolute before:inset-0 before:ml-2.5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
                  {toolActions.map((action) => {
                    const config = getStatusConfig(action.status);
                    const StatusIcon = config.icon;
                    return (
                      <div key={action.id} className="relative flex items-center gap-3 group">
                        <div className={`flex items-center justify-center w-6 h-6 rounded-full border bg-[var(--color-calmant-surface)] z-10 ring-4 ring-[var(--color-calmant-surface)] ${config.colorClass} border-current shadow-sm`}>
                          <StatusIcon className={`w-3.5 h-3.5 ${action.status === 'pending' ? 'animate-pulse' : ''}`} />
                        </div>
                        <div className="flex flex-1 items-center justify-between rounded-md border border-border bg-[var(--color-calmant-surface-raised)]/50 p-2.5 px-3 text-sm shadow-sm calmant-interactive group-hover:border-[var(--color-calmant-electric-blue)]/30 transition-colors">
                          <span className="text-foreground">{action.message}</span>
                          <span className="text-xs text-muted-foreground ml-2 whitespace-nowrap">{action.time}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
