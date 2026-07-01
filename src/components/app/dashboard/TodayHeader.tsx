import Link from "next/link";
import { Bot, Loader2, RefreshCw, TimerReset } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TodayHeaderProps {
  busy: string | null;
  onRefresh: () => void;
}

export function TodayHeader({ busy, onRefresh }: TodayHeaderProps) {
  return (
    <header className="flex flex-col gap-4 border-b border-border pb-5 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
          <TimerReset className="h-3.5 w-3.5" />
          Execution cockpit
        </div>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
          Today
        </h1>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" onClick={onRefresh} disabled={busy === "refresh"} title="Refresh plan">
          {busy === "refresh" ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Refresh
        </Button>
        <Link href="/dashboard/assistant">
          <Button variant="outline">
            <Bot className="h-4 w-4" />
            Assistant
          </Button>
        </Link>
      </div>
    </header>
  );
}
