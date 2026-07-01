"use client";

import { ActivityEvent } from "@/app/api/activity/events/route";
import { format } from "date-fns";
import {
  Brain,
  Zap,
  Bell,
  Server,
  Wrench,
  CheckCircle2,
  XCircle,
  Loader2,
  Clock,
  ArrowUpRight
} from "lucide-react";

interface ActivityEventRowProps {
  event: ActivityEvent;
  onClick: (event: ActivityEvent) => void;
}

export function ActivityEventRow({ event, onClick }: ActivityEventRowProps) {
  const getIcon = () => {
    switch (event.type) {
      case "ai": return <Brain className="h-5 w-5 text-purple-500" />;
      case "automation": return <Zap className="h-5 w-5 text-amber-500" />;
      case "notification": return <Bell className="h-5 w-5 text-blue-500" />;
      case "tool": return <Wrench className="h-5 w-5 text-teal-500" />;
      case "system": return <Server className="h-5 w-5 text-gray-500" />;
      default: return <Clock className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getStatusIcon = () => {
    switch (event.status) {
      case "completed":
      case "delivered":
      case "sent":
        return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-destructive" />;
      case "running":
        return <Loader2 className="h-4 w-4 text-primary animate-spin" />;
      case "queued":
        return <Clock className="h-4 w-4 text-muted-foreground" />;
      default:
        return null;
    }
  };

  return (
    <div 
      className="flex items-start gap-4 p-4 border border-border bg-card rounded-lg hover:border-primary/50 hover:bg-accent/30 transition-colors cursor-pointer group"
      onClick={() => onClick(event)}
    >
      <div className="p-2 bg-muted rounded-md shrink-0">
        {getIcon()}
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-1">
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium text-foreground truncate">{event.title}</span>
            <span className="text-muted-foreground text-xs px-2 py-0.5 bg-muted rounded-full uppercase tracking-wider">
              {event.actor}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground shrink-0">
            {getStatusIcon()}
            <time dateTime={event.occurredAt}>
              {format(new Date(event.occurredAt), "MMM d, h:mm a")}
            </time>
          </div>
        </div>
        <p className="text-sm text-muted-foreground line-clamp-2">
          {event.summary}
        </p>
      </div>
      
      <div className="shrink-0 self-center opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="p-2 bg-muted/50 rounded-full text-muted-foreground">
          <ArrowUpRight className="h-4 w-4" />
        </div>
      </div>
    </div>
  );
}
