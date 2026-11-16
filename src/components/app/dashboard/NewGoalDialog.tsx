"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Target, Loader2, ChevronRight, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface NewGoalDialogProps {
  onGoalCreated?: () => void;
}

export function NewGoalDialog({ onGoalCreated }: NewGoalDialogProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [successCriteria, setSuccessCriteria] = useState("");
  const [startExecution, setStartExecution] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<"input" | "confirm">("input");

  const criteria = successCriteria
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const handleCreate = async () => {
    if (!title.trim()) return;
    setIsCreating(true);
    setError(null);

    const objective = description.trim() || title.trim();

    try {
      const goalRes = await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          objective,
          successCriteria: criteria.length ? criteria : undefined,
        }),
      });

      const payload = await goalRes.json().catch(() => null);
      if (!goalRes.ok || !payload?.success || !payload.data?.goal) {
        throw new Error(payload?.error || "Failed to create goal");
      }

      const goal = payload.data.goal as { id: string; title: string; description?: string | null };
      const projectCell = payload.data.projectCell as { id: string } | undefined;

      if (startExecution) {
        const execRes = await fetch("/api/execution/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            goalId: goal.id,
            projectCellId: projectCell?.id,
            title: goal.title,
            objective: goal.description || objective,
            successCriteria: criteria,
          }),
        });
        if (!execRes.ok) {
          const execPayload = await execRes.json().catch(() => null);
          onGoalCreated?.();
          throw new Error(execPayload?.error || "Goal saved, but the execution loop did not start.");
        }
      }

      setTitle("");
      setDescription("");
      setSuccessCriteria("");
      setStep("input");
      setError(null);
      setOpen(false);
      onGoalCreated?.();
    } catch (err) {
      console.error("[NewGoalDialog] Error:", err);
      setError(err instanceof Error ? err.message : "Failed to create goal");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); setStep("input"); setError(null); }}>
      <DialogTrigger
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border border-dashed border-primary/30 text-primary rounded-md hover:bg-primary/5 transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Goal
        </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Create a New Goal
          </DialogTitle>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {step === "input" && (
            <motion.div
              key="input"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4 pt-2"
            >
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="goal-title">
                  What do you want to achieve?
                </label>
                <Input
                  id="goal-title"
                  placeholder="e.g., Build a portfolio website"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="goal-desc">
                  More context (optional)
                </label>
                <Textarea
                  id="goal-desc"
                  placeholder="What does success look like? Any constraints or preferences?"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="min-h-[80px] resize-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="goal-criteria">
                  Success criteria (one per line, optional)
                </label>
                <Textarea
                  id="goal-criteria"
                  placeholder={"Site is live on a custom domain\nHas 3+ projects showcased\nMobile responsive"}
                  value={successCriteria}
                  onChange={(e) => setSuccessCriteria(e.target.value)}
                  className="min-h-[80px] resize-none text-sm font-mono"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={startExecution}
                    onChange={(e) => setStartExecution(e.target.checked)}
                    className="rounded border-border"
                  />
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Sparkles className="h-3.5 w-3.5" />
                    Start working on it immediately
                  </span>
                </label>

                <Button
                  onClick={() => setStep("confirm")}
                  disabled={!title.trim()}
                  className="gap-1"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          )}

          {step === "confirm" && (
            <motion.div
              key="confirm"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4 pt-2"
            >
              <div className="rounded-lg border border-border/50 bg-muted/30 p-4 space-y-3">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">Goal</p>
                  <p className="font-medium mt-0.5">{title}</p>
                </div>
                {description && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Context</p>
                    <p className="text-sm mt-0.5">{description}</p>
                  </div>
                )}
                {criteria.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider">Success Criteria</p>
                    <ul className="text-sm mt-0.5 space-y-0.5">
                      {criteria.map((c, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <span className="text-primary mt-0.5">•</span>
                          {c}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {startExecution && (
                  <p className="text-xs text-primary flex items-center gap-1">
                    <Sparkles className="h-3 w-3" />
                    Will start the execution loop immediately
                  </p>
                )}
              </div>

              {error && (
                <p className="text-sm text-destructive" role="alert">{error}</p>
              )}

              <div className="flex items-center justify-between">
                <Button variant="ghost" size="sm" onClick={() => setStep("input")}>
                  Back
                </Button>
                <Button onClick={handleCreate} disabled={isCreating} className="gap-1.5">
                  {isCreating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Target className="h-4 w-4" />
                      Create Goal
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
