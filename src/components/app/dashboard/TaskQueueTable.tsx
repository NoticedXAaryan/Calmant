import { AlarmClock, CheckCircle2, Play, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ExecutionPlan, PlanTask, RISK_DOT, statusLabel } from "@/app/dashboard/types";

function EntropyDot({ level }: { level: PlanTask["riskLevel"] }) {
  return <span className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${RISK_DOT[level]}`} />;
}

interface TaskQueueTableProps {
  plan: ExecutionPlan;
  busy: string | null;
  onStart: (task: PlanTask) => void;
  onDecompose: (task: PlanTask) => void;
  onSnooze: (task: PlanTask) => void;
  onComplete: (task: PlanTask) => void;
}

export function TaskQueueTable({
  plan,
  busy,
  onStart,
  onDecompose,
  onSnooze,
  onComplete,
}: TaskQueueTableProps) {
  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border p-4">
        <div>
          <h2 className="text-base font-semibold">Task queue</h2>
          <p className="mt-1 text-sm text-muted-foreground">{plan.tasks.length} active tasks ordered by execution risk</p>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="border-b border-border text-xs uppercase tracking-[0.12em] text-muted-foreground">
            <tr>
              <th className="w-10 px-4 py-3" />
              <th className="px-4 py-3">Task</th>
              <th className="px-4 py-3">Due</th>
              <th className="px-4 py-3">Score</th>
              <th className="px-4 py-3">Next action</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {plan.tasks.map((task) => (
              <tr key={task.id} className="border-b border-border last:border-0 hover:bg-muted/40">
                <td className="px-4 py-3">
                  <EntropyDot level={task.riskLevel} />
                </td>
                <td className="max-w-[220px] px-4 py-3">
                  <div className="truncate font-medium">{task.title}</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {statusLabel(task.status)} - {Math.round(task.progress * 100)}%
                  </div>
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">{task.dueLabel}</td>
                <td className="whitespace-nowrap px-4 py-3 font-mono">{task.entropyScore.toFixed(2)}</td>
                <td className="max-w-[260px] px-4 py-3 text-muted-foreground">
                  <div className="truncate">{task.nextAction}</div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-1.5">
                    <Button size="icon-sm" variant="ghost" title="Start focus" onClick={() => onStart(task)} disabled={busy === `start-${task.id}`}>
                      <Play className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon-sm" variant="ghost" title="Break down" onClick={() => onDecompose(task)} disabled={busy === `decompose-${task.id}`}>
                      <Wand2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon-sm" variant="ghost" title="Snooze 30 minutes" onClick={() => onSnooze(task)} disabled={busy === `snooze-${task.id}`}>
                      <AlarmClock className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon-sm" variant="ghost" title="Complete" onClick={() => onComplete(task)} disabled={busy === `complete-${task.id}`}>
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {plan.tasks.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm text-muted-foreground">
                  No active tasks.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
