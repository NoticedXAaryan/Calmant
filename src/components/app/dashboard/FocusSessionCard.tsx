import { Button } from "@/components/ui/button";
import { FocusState, formatTimer } from "@/app/dashboard/types";

interface FocusSessionCardProps {
  activeFocus: FocusState | null;
  focusRemaining: number;
  onStop: () => void;
}

export function FocusSessionCard({ activeFocus, focusRemaining, onStop }: FocusSessionCardProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="mb-3 text-sm font-medium">Focus session</div>
      {activeFocus ? (
        <div className="space-y-3">
          <div className="text-3xl font-semibold tabular-nums">{formatTimer(focusRemaining)}</div>
          <div>
            <div className="text-sm font-medium">{activeFocus.title}</div>
            <div className="mt-1 text-sm text-muted-foreground">{activeFocus.nextAction}</div>
          </div>
          <Button variant="outline" className="w-full" onClick={onStop}>
            Stop timer
          </Button>
        </div>
      ) : (
        <div className="text-sm text-muted-foreground">
          Start a task to create a timed execution window.
        </div>
      )}
    </div>
  );
}
