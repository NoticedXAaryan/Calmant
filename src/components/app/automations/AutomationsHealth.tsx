"use client";

import { Activity, AlertCircle, CheckCircle2, Clock, Server, PlayCircle, Loader2 } from "lucide-react";

interface JobCount {
  id: string;
  name: string;
  status: string;
  count: number;
}

interface AutomationsHealthProps {
  jobs: JobCount[];
}

export function AutomationsHealth({ jobs }: AutomationsHealthProps) {
  // Aggregate job statistics
  const queuedCount = jobs.filter(j => j.status === 'queued').reduce((acc, curr) => acc + curr.count, 0);
  const processingCount = jobs.filter(j => j.status === 'processing').reduce((acc, curr) => acc + curr.count, 0);
  const completedCount = jobs.filter(j => j.status === 'completed').reduce((acc, curr) => acc + curr.count, 0);
  const failedCount = jobs.filter(j => j.status === 'failed').reduce((acc, curr) => acc + curr.count, 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-5 border border-border bg-card rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-medium text-sm text-foreground">Queued</h3>
          </div>
          <div className="text-3xl font-bold">{queuedCount}</div>
        </div>
        
        <div className="p-5 border border-border bg-card rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Loader2 className="h-4 w-4 text-primary animate-spin" />
            <h3 className="font-medium text-sm text-foreground">Processing</h3>
          </div>
          <div className="text-3xl font-bold">{processingCount}</div>
        </div>
        
        <div className="p-5 border border-border bg-card rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            <h3 className="font-medium text-sm text-foreground">Completed</h3>
          </div>
          <div className="text-3xl font-bold">{completedCount}</div>
        </div>
        
        <div className="p-5 border border-border bg-card rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="h-4 w-4 text-destructive" />
            <h3 className="font-medium text-sm text-foreground">Failed</h3>
          </div>
          <div className="text-3xl font-bold text-destructive">{failedCount}</div>
        </div>
      </div>

      <div className="border border-border bg-card rounded-lg overflow-hidden">
        <div className="px-5 py-4 border-b border-border bg-muted/20 flex items-center gap-2">
          <Server className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-medium">System Health & Integrations</h3>
        </div>
        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <h4 className="text-sm font-medium mb-4 text-muted-foreground uppercase tracking-wider">Worker Status</h4>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                  </div>
                  <span className="text-sm font-medium">Main Worker Node</span>
                </div>
                <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">Active</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-3 w-3 rounded-full bg-emerald-500"></div>
                  <span className="text-sm font-medium">Cron Scheduler</span>
                </div>
                <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">Active</span>
              </div>
            </div>
          </div>
          
          <div>
            <h4 className="text-sm font-medium mb-4 text-muted-foreground uppercase tracking-wider">Integration Health</h4>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-3 w-3 rounded-full bg-emerald-500"></div>
                  <span className="text-sm font-medium">Telegram Bot</span>
                </div>
                <span className="text-xs text-emerald-500">Connected</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-3 w-3 rounded-full bg-emerald-500"></div>
                  <span className="text-sm font-medium">Email SMTP</span>
                </div>
                <span className="text-xs text-emerald-500">Connected</span>
              </div>
              <div className="flex items-center justify-between opacity-50">
                <div className="flex items-center gap-3">
                  <div className="h-3 w-3 rounded-full bg-muted-foreground"></div>
                  <span className="text-sm font-medium">WhatsApp</span>
                </div>
                <span className="text-xs text-muted-foreground">Not Configured</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {jobs.length > 0 && (
        <div className="border border-border bg-card rounded-lg overflow-hidden">
          <div className="px-5 py-4 border-b border-border bg-muted/20 flex items-center gap-2">
            <Activity className="h-4 w-4 text-muted-foreground" />
            <h3 className="font-medium">Raw Queue Statistics</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-muted/10 border-b border-border">
                <tr>
                  <th className="px-5 py-3 font-medium">Job Name</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Count</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {jobs.map((job) => (
                  <tr key={job.id} className="hover:bg-muted/10">
                    <td className="px-5 py-3 font-medium">{job.name}</td>
                    <td className="px-5 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        job.status === 'completed' ? 'bg-emerald-500/10 text-emerald-500' :
                        job.status === 'failed' ? 'bg-destructive/10 text-destructive' :
                        job.status === 'processing' ? 'bg-primary/10 text-primary' :
                        'bg-muted text-muted-foreground'
                      }`}>
                        {job.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 tabular-nums">{job.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
