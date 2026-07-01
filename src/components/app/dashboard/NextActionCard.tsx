import { AlarmClock, CalendarDays, CheckCircle2, Clock, Loader2, Play, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PlanTask, RISK_DOT, RISK_TEXT, statusLabel } from "@/app/dashboard/types";

function EntropyDot({ level }: { level: PlanTask["riskLevel"] }) {
  return <span className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${RISK_DOT[level]}`} />;
}

interface NextActionCardProps {
  task: PlanTask | null;
  busy: string | null;
  onStart: (task: PlanTask) => void;
  onDecompose: (task: PlanTask) => void;
  onSnooze: (task: PlanTask) => void;
  onComplete: (task: PlanTask) => void;
}

export function NextActionCard({
  task,
  busy,
  onStart,
  onDecompose,
  onSnooze,
  onComplete,
}: NextActionCardProps) {
  if (!task) {
    return (
      <div className="flex min-h-[260px] flex-col items-center justify-center text-center">
        <CheckCircle2 className="mb-3 h-8 w-8 text-muted-foreground" />
        <h2 className="text-xl font-semibold tracking-tight">No active commitments</h2>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          Capture a deadline when one appears and the planner will build the next action.
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <EntropyDot level={task.riskLevel} />
            <span className={RISK_TEXT[task.riskLevel]}>{task.riskLevel}</span>
            <span>{task.timeLeftLabel}</span>
          </div>
          <h2 className="text-xl font-semibold tracking-tight md:text-2xl">{task.title}</h2>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="h-4 w-4" />
              {task.dueLabel}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock className="h-4 w-4" />
              {task.estimatedMins} min estimate
            </span>
          </div>
        </div>
        <Badge variant="outline" className="capitalize">
          {statusLabel(task.status)}
        </Badge>
      </div>

      <div className="rounded-md border border-border bg-background p-4">
        <div className="mb-2 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
          Next action
        </div>
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <p className="max-w-2xl text-base font-medium leading-relaxed">{task.nextAction}</p>
          <div className="text-sm text-muted-foreground">{task.focusMins} min focus</div>
        </div>
      </div>

      {task.riskReasons.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {task.riskReasons.map((reason) => (
            <Badge key={reason} variant="secondary" className="capitalize">
              {reason}
            </Badge>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Button onClick={() => onStart(task)} disabled={busy === `start-${task.id}`}>
          {busy === `start-${task.id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
          Start focus
        </Button>
        <Button variant="outline" onClick={() => onDecompose(task)} disabled={busy === `decompose-${task.id}`}>
          {busy === `decompose-${task.id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
          Break down
        </Button>
        <Button variant="outline" onClick={() => onSnooze(task)} disabled={busy === `snooze-${task.id}`}>
          <AlarmClock className="h-4 w-4" />
          Snooze 30m
        </Button>
        <Button variant="outline" onClick={() => onComplete(task)} disabled={busy === `complete-${task.id}`}>
          {busy === `complete-${task.id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
          Complete
        </Button>
      </div>
    </div>
  );
}
