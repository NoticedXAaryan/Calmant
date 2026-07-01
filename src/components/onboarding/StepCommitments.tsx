import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Plus, Trash2 } from "lucide-react";
import { OnboardingState } from "./OnboardingShell";
import { Input } from "@/components/ui/input";

export function StepCommitments({
  data,
  updateData,
  onNext,
  onBack,
}: {
  data: OnboardingState;
  updateData: (d: Partial<OnboardingState>) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const [currentInput, setCurrentInput] = useState("");

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentInput.trim()) return;
    updateData({ commitments: [...data.commitments, currentInput.trim()] });
    setCurrentInput("");
  };

  const handleRemove = (idx: number) => {
    updateData({
      commitments: data.commitments.filter((_, i) => i !== idx),
    });
  };

  return (
    <div className="animate-in slide-in-from-right-4 fade-in duration-300">
      <div className="mb-6">
        <h2 className="text-2xl font-bold tracking-tight">First Commitments</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Drop a few immediate tasks on my plate to get started. 
        </p>
      </div>

      <div className="space-y-6">
        <form onSubmit={handleAdd} className="flex gap-2">
          <Input
            value={currentInput}
            onChange={(e) => setCurrentInput(e.target.value)}
            placeholder="e.g. Submit DBMS assignment Friday 9pm"
            className="flex-1"
          />
          <Button type="submit" variant="secondary">
            <Plus className="h-4 w-4" />
          </Button>
        </form>

        <div className="space-y-2">
          {data.commitments.length === 0 ? (
            <div className="p-4 rounded-lg border border-dashed border-border bg-muted/30 text-center text-sm text-muted-foreground">
              No commitments added yet. Add one above, or skip for later.
            </div>
          ) : (
            data.commitments.map((c, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-lg border border-border bg-card">
                <span className="text-sm truncate pr-4">{c}</span>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleRemove(i)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="mt-8 flex justify-between">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>
        <Button onClick={onNext}>
          Next <ArrowRight className="h-4 w-4 ml-2" />
        </Button>
      </div>
    </div>
  );
}
