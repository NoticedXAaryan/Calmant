import * as React from "react";
import { cn } from "@/lib/utils";
import { CheckCircle2, Clock, XCircle, AlertCircle, RefreshCw } from "lucide-react";

export type StatusType = "success" | "pending" | "error" | "warning" | "running";

type StatusPillProps = {
  status: StatusType;
  label?: string;
  className?: string;
};

const statusConfig = {
  success: {
    icon: CheckCircle2,
    classes: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    defaultLabel: "Completed",
  },
  pending: {
    icon: Clock,
    classes: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20",
    defaultLabel: "Pending",
  },
  error: {
    icon: XCircle,
    classes: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/20",
    defaultLabel: "Failed",
  },
  warning: {
    icon: AlertCircle,
    classes: "bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/20",
    defaultLabel: "Warning",
  },
  running: {
    icon: RefreshCw,
    classes: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/20",
    defaultLabel: "Running",
  },
};

export function StatusPill({ status, label, className }: StatusPillProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors",
        config.classes,
        className
      )}
    >
      <Icon className={cn("h-3.5 w-3.5", status === "running" && "animate-spin")} />
      <span>{label || config.defaultLabel}</span>
    </div>
  );
}
