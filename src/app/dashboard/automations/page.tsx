"use client";

import { useEffect, useState } from "react";
import { Loader2, Activity, PlayCircle, CheckCircle2, XCircle, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface Job {
  id: string;
  name: string;
  status: string;
  runAt: string;
  attempts: number;
  lastError: string | null;
}

interface Policy {
  id: string;
  channel: string;
  enabled: boolean;
  minEntropy: number | null;
}

interface AutomationsData {
  jobs: Job[];
  policies: Policy[];
}

export default function AutomationsPage() {
  const [data, setData] = useState<AutomationsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function fetchAutomations() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/automations");
      if (!res.ok) throw new Error("Failed to fetch");
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setData(json.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error loading automations");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAutomations();
  }, []);

  function getStatusIcon(status: string) {
    switch (status) {
      case "completed":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "processing":
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  }

  return (
    <div className="mx-auto max-w-5xl p-6">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Activity className="h-6 w-6 text-primary" />
            Automations & Background Jobs
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Monitor the background worker queues and your active alert policies.
          </p>
        </div>
        <Button variant="outline" onClick={fetchAutomations} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4 mr-2" />}
          Refresh
        </Button>
      </div>

      {error && (
        <div className="mb-6 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading && !data ? (
        <div className="flex justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : data ? (
        <div className="grid gap-8 lg:grid-cols-2">
          {/* Active Policies */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold border-b pb-2">Active Alert Policies</h2>
            {data.policies.length === 0 ? (
              <div className="text-sm text-muted-foreground italic p-4 border border-dashed rounded-lg text-center">
                No active policies configured.
              </div>
            ) : (
              <div className="grid gap-3">
                {data.policies.map((policy) => (
                  <div key={policy.id} className="flex items-center justify-between p-4 border rounded-lg bg-card shadow-sm">
                    <div>
                      <div className="font-medium capitalize">{policy.channel}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Min Entropy: {policy.minEntropy ?? "None"}
                      </div>
                    </div>
                    <Badge variant={policy.enabled ? "default" : "secondary"}>
                      {policy.enabled ? "Active" : "Disabled"}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Background Jobs Queue */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold border-b pb-2">Recent Worker Jobs</h2>
            {data.jobs.length === 0 ? (
              <div className="text-sm text-muted-foreground italic p-4 border border-dashed rounded-lg text-center">
                No jobs in the queue.
              </div>
            ) : (
              <div className="grid gap-3">
                {data.jobs.map((job) => (
                  <div key={job.id} className="flex items-start gap-4 p-4 border rounded-lg bg-card shadow-sm">
                    <div className="mt-0.5">{getStatusIcon(job.status)}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div className="font-medium truncate">{job.name}</div>
                        <Badge variant="outline" className="capitalize text-xs">
                          {job.status}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1 flex justify-between">
                        <span>Run At: {new Date(job.runAt).toLocaleString()}</span>
                        <span>Attempts: {job.attempts}</span>
                      </div>
                      {job.lastError && (
                        <div className="text-xs text-red-500 mt-2 p-2 bg-red-500/10 rounded truncate">
                          {job.lastError}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
