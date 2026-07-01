"use client";

import { SectionCard } from "@/components/app/SectionCard";
import { CheckCircle2, Activity, Server, Clock } from "lucide-react";
import { WorkerStatus } from "@/components/WorkerStatus";

export function LogsDiagnosticsSettings() {
  return (
    <div className="space-y-6">
      <SectionCard title="System Health" description="Real-time status of backend services.">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-lg border border-border bg-card">
            <div className="flex items-center gap-2 mb-2">
              <Server className="h-4 w-4 text-muted-foreground" />
              <p className="font-medium text-sm">Background Worker</p>
            </div>
            <div className="mt-4">
              <WorkerStatus />
            </div>
          </div>
          
          <div className="p-4 rounded-lg border border-border bg-card">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="h-4 w-4 text-muted-foreground" />
              <p className="font-medium text-sm">Core API</p>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500"></span>
              <span className="text-sm font-medium">Operational</span>
            </div>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="App Information" description="Version and build details for troubleshooting.">
        <div className="space-y-3 bg-muted/30 p-4 rounded-lg border border-border text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Version</span>
            <span className="font-medium font-mono">v1.2.0-beta.4</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Environment</span>
            <span className="font-medium font-mono">Production</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Last Deployment</span>
            <span className="font-medium font-mono flex items-center gap-1">
              <Clock className="h-3 w-3" /> 2 hours ago
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Client ID</span>
            <span className="font-medium font-mono">usr_xyz789</span>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
