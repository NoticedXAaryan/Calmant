import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ExecutionPlan, formatClock, RISK_DOT, PlanTask } from "@/app/dashboard/types";

function EntropyDot({ level }: { level: PlanTask["riskLevel"] }) {
  return <span className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${RISK_DOT[level]}`} />;
}

interface RescuePlanTimelineProps {
  plan: ExecutionPlan;
}

export function RescuePlanTimeline({ plan }: RescuePlanTimelineProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Rescue plan</h2>
          <p className="mt-1 text-sm text-muted-foreground">{plan.totalFocusMins} min scheduled from now</p>
        </div>
        <Link href="/dashboard/schedule">
          <Button variant="outline" size="sm">
            Schedule
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </Link>
      </div>
      <div className="space-y-2">
        {plan.blocks.length === 0 ? (
          <div className="rounded-md border border-dashed border-border p-6 text-sm text-muted-foreground">
            No blocks yet.
          </div>
        ) : (
          plan.blocks.map((block) => {
            const task = plan.tasks.find((item) => item.id === block.taskId);
            return (
              <div key={block.id} className="grid grid-cols-[86px_minmax(0,1fr)] gap-3 rounded-md border border-border bg-background p-3">
                <div className="text-xs font-medium tabular-nums text-muted-foreground">
                  {formatClock(block.startTime)}
                  <br />
                  {formatClock(block.endTime)}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    {task && <EntropyDot level={task.riskLevel} />}
                    <div className="truncate text-sm font-medium">{block.title}</div>
                  </div>
                  {task && <div className="mt-1 text-xs text-muted-foreground">{task.title}</div>}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
