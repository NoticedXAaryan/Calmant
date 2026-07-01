import { Button } from "@/components/ui/button";
import { ArrowLeft, Rocket, CheckCircle2 } from "lucide-react";
import { OnboardingState } from "./OnboardingShell";

export function StepPlanPreview({
  data,
  onComplete,
  onBack,
}: {
  data: OnboardingState;
  onComplete: () => void;
  onBack: () => void;
}) {
  return (
    <div className="animate-in slide-in-from-right-4 fade-in duration-300">
      <div className="mb-6 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-500">
          <CheckCircle2 className="h-7 w-7" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight">You're all set!</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Calmant is ready. Here is a summary of your cockpit configuration.
        </p>
      </div>

      <div className="space-y-4 mb-8">
        <div className="bg-muted/30 p-4 rounded-lg border border-border space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Profile</span>
            <span className="font-medium">{data.name || "Anonymous"} • {data.goal}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Work Mode</span>
            <span className="font-medium capitalize">{data.workMode.replace("-", " ")}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Memory</span>
            <span className="font-medium capitalize">{data.memoryConsent.replace("-", " ")}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Commitments</span>
            <span className="font-medium">{data.commitments.length} captured</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 w-full">
        <Button variant="ghost" onClick={onBack} className="sm:w-32">
          <ArrowLeft className="h-4 w-4 mr-2" /> Back
        </Button>
        <Button size="lg" onClick={onComplete} className="flex-1">
          <Rocket className="h-4 w-4 mr-2" /> Enter Cockpit
        </Button>
      </div>
    </div>
  );
}
