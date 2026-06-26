"use client";

import { useEffect, useState } from "react";
import { ServerCog } from "lucide-react";
import { cn } from "@/lib/utils";

interface WorkerHealth {
  status: 'ok' | 'error' | 'loading';
  lastPing?: Date;
}

export function WorkerStatus() {
  const [health, setHealth] = useState<WorkerHealth>({ status: 'loading' });

  useEffect(() => {
    let mounted = true;

    async function checkHealth() {
      try {
        const res = await fetch('/api/health/worker');
        if (!mounted) return;
        
        if (res.ok) {
          const data = await res.json();
          if (data.status === 'ok') {
            setHealth({ status: 'ok', lastPing: new Date() });
          } else {
            setHealth({ status: 'error', lastPing: new Date() });
          }
        } else {
          setHealth({ status: 'error', lastPing: new Date() });
        }
      } catch (err) {
        if (!mounted) return;
        setHealth({ status: 'error', lastPing: new Date() });
      }
    }

    // Check immediately, then every 30s
    checkHealth();
    const interval = setInterval(checkHealth, 30000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  const getStatusColor = () => {
    if (health.status === 'ok') return 'bg-emerald-500';
    if (health.status === 'error') return 'bg-red-500 animate-pulse';
    return 'bg-yellow-500'; // loading or unknown
  };

  const getStatusText = () => {
    if (health.status === 'ok') return 'Backend synced';
    if (health.status === 'error') return 'Worker disconnected';
    return 'Checking status...';
  };

  return (
    <div className="flex items-center gap-2 px-2 py-1 text-xs text-muted-foreground" title={getStatusText()}>
      <div className="relative flex h-2.5 w-2.5 items-center justify-center">
        <div className={cn("absolute inline-flex h-full w-full rounded-full opacity-75", health.status === 'ok' ? '' : 'animate-ping', getStatusColor())} />
        <div className={cn("relative inline-flex h-2 w-2 rounded-full", getStatusColor())} />
      </div>
      <span className="truncate flex items-center gap-1">
        <ServerCog size={12} className="opacity-50" />
        {getStatusText()}
      </span>
    </div>
  );
}
