import { FormEvent } from "react";
import { CheckCircle2, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import VoiceInput from "@/components/VoiceInput";
import { CaptureAnalysis, CaptureDraft } from "@/app/dashboard/types";

function toDatetimeLocal(value: string) {
  const date = new Date(value);
  const offsetMs = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function fromDatetimeLocal(value: string) {
  return new Date(value).toISOString();
}

interface QuickCaptureProps {
  capture: string;
  draft: CaptureDraft | null;
  analysis: CaptureAnalysis | null;
  busy: string | null;
  onChangeCapture: (val: string) => void;
  onSetDraft: (val: CaptureDraft | null) => void;
  onSetAnalysis: (val: CaptureAnalysis | null) => void;
  onSubmitCapture: (e: FormEvent) => void;
  onConfirmDraft: () => void;
}

export function QuickCapture({
  capture,
  draft,
  analysis,
  busy,
  onChangeCapture,
  onSetDraft,
  onSetAnalysis,
  onSubmitCapture,
  onConfirmDraft,
}: QuickCaptureProps) {
  return (
    <>
      <form onSubmit={onSubmitCapture} className="rounded-lg border border-border bg-card p-4">
        <div className="flex items-center justify-between gap-3">
          <label htmlFor="task-capture" className="text-sm font-medium">
            Capture
          </label>
          <VoiceInput
            disabled={busy === "capture" || busy === "confirm-draft"}
            onInterimTranscript={(text) => onChangeCapture(text)}
            onTranscript={(text) => onChangeCapture(text)}
          />
        </div>
        <textarea
          id="task-capture"
          value={capture}
          onChange={(event) => onChangeCapture(event.target.value)}
          placeholder="Submit DBMS assignment tomorrow by 9pm, 2 hours"
          rows={4}
          className="mt-3 min-h-24 w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/20"
        />
        <Button type="submit" className="mt-3 w-full" disabled={busy === "capture" || !capture.trim()}>
          {busy === "capture" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Understand task
        </Button>
      </form>

      {draft && (
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-medium">Confirm capture</div>
              {analysis && (
                <div className="mt-1 text-xs text-muted-foreground">
                  {Math.round(analysis.confidence * 100)}% confidence
                </div>
              )}
            </div>
            {analysis?.needsClarification && (
              <Badge variant="outline" className="border-amber-500/40 text-amber-600 dark:text-amber-400">
                Needs check
              </Badge>
            )}
          </div>

          {analysis && (
            <div className="mb-3 rounded-md border border-border bg-background p-3 text-sm text-muted-foreground">
              {analysis.interpretation}
              {analysis.questions.length > 0 && (
                <div className="mt-2 space-y-1 text-amber-600 dark:text-amber-400">
                  {analysis.questions.map((question) => (
                    <div key={question}>{question}</div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="space-y-3">
            <label className="block text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
              Title
              <input
                value={draft.title}
                onChange={(event) => onSetDraft({ ...draft, title: event.target.value })}
                className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm normal-case tracking-normal text-foreground outline-none focus:border-ring"
              />
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="block text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                Deadline
                <input
                  type="datetime-local"
                  value={toDatetimeLocal(draft.deadline)}
                  onChange={(event) => onSetDraft({ ...draft, deadline: fromDatetimeLocal(event.target.value) })}
                  className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm normal-case tracking-normal text-foreground outline-none focus:border-ring"
                />
              </label>
              <label className="block text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
                Minutes
                <input
                  type="number"
                  min={5}
                  value={draft.estimatedMins}
                  onChange={(event) => onSetDraft({ ...draft, estimatedMins: Number(event.target.value) })}
                  className="mt-1 h-9 w-full rounded-md border border-input bg-background px-3 text-sm normal-case tracking-normal text-foreground outline-none focus:border-ring"
                />
              </label>
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            <Button onClick={onConfirmDraft} disabled={busy === "confirm-draft" || !draft.title.trim()}>
              {busy === "confirm-draft" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Confirm
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                onSetDraft(null);
                onSetAnalysis(null);
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
