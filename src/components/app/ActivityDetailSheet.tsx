"use client";

import { ActivityEvent } from "@/app/api/activity/events/route";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetClose,
} from "@/components/ui/sheet";
import { format } from "date-fns";
import { CheckCircle2, XCircle, Loader2, Clock, Terminal, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ActivityDetailSheetProps {
  event: ActivityEvent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ActivityDetailSheet({ event, open, onOpenChange }: ActivityDetailSheetProps) {
  if (!event) return null;

  const getStatusColor = () => {
    switch (event.status) {
      case "completed":
      case "delivered":
      case "sent": return "text-emerald-500 bg-emerald-500/10 border-emerald-500/20";
      case "failed": return "text-destructive bg-destructive/10 border-destructive/20";
      case "running": return "text-primary bg-primary/10 border-primary/20";
      case "queued": return "text-muted-foreground bg-muted border-border";
      default: return "text-muted-foreground bg-muted border-border";
    }
  };

  const getStatusIcon = () => {
    switch (event.status) {
      case "completed":
      case "delivered":
      case "sent": return <CheckCircle2 className="h-4 w-4" />;
      case "failed": return <XCircle className="h-4 w-4" />;
      case "running": return <Loader2 className="h-4 w-4 animate-spin" />;
      case "queued": return <Clock className="h-4 w-4" />;
      default: return null;
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto p-0">
        <SheetHeader className="p-6 border-b border-border bg-muted/20">
          <div className="flex items-center justify-between mb-2">
            <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor()}`}>
              {getStatusIcon()}
              {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
            </span>
            <time className="text-xs text-muted-foreground">
              {format(new Date(event.occurredAt), "MMM d, yyyy h:mm:ss a")}
            </time>
          </div>
          <SheetTitle className="text-xl">{event.title}</SheetTitle>
          <SheetDescription className="text-sm">
            {event.summary}
          </SheetDescription>
        </SheetHeader>

        <div className="p-6 space-y-6">
          <div className="space-y-3">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Terminal className="h-4 w-4 text-muted-foreground" /> 
              Raw Metadata
            </h4>
            <div className="relative group">
              <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto border border-border font-mono text-muted-foreground whitespace-pre-wrap">
                {JSON.stringify(event.metadata || {}, null, 2)}
              </pre>
              <Button
                variant="outline"
                size="icon"
                className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity bg-background"
                onClick={() => navigator.clipboard.writeText(JSON.stringify(event.metadata || {}, null, 2))}
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Event ID</p>
              <p className="text-sm font-mono truncate" title={event.id}>{event.id}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Actor</p>
              <p className="text-sm uppercase tracking-wider">{event.actor}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Event Type</p>
              <p className="text-sm capitalize">{event.type}</p>
            </div>
          </div>

          {event.status === "failed" && (
            <div className="bg-destructive/10 border border-destructive/20 p-4 rounded-lg mt-4">
              <p className="text-sm font-medium text-destructive mb-1">Failure Reason</p>
              <p className="text-xs text-destructive/80">
                {(event.metadata?.error as string) || "Unknown error occurred during execution."}
              </p>
            </div>
          )}

          <div className="flex gap-3 pt-6">
            <SheetClose render={<Button variant="outline" className="w-full">Close</Button>} />
            {(event.status === "failed" || event.type === "automation") && (
              <Button variant="default" className="w-full">Retry Action</Button>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
