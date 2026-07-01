import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, BrainCircuit, ShieldAlert, ShieldCheck } from "lucide-react";
import { OnboardingState } from "./OnboardingShell";

export function StepMemoryConsent({
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
  return (
    <div className="animate-in slide-in-from-right-4 fade-in duration-300">
      <div className="mb-6">
        <h2 className="text-2xl font-bold tracking-tight">AI Memory</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Calmant can remember your preferences and patterns to serve you better over time.
        </p>
      </div>

      <div className="space-y-4">
        {[
          {
            id: "remember-all",
            icon: BrainCircuit,
            label: "Remember preferences & patterns",
            desc: "Calmant automatically learns from your interactions (Recommended).",
          },
          {
            id: "ask-first",
            icon: ShieldCheck,
            label: "Ask before saving",
            desc: "Calmant will ask for permission before adding to memory.",
          },
          {
            id: "no-memory",
            icon: ShieldAlert,
            label: "Do not save memory",
            desc: "Calmant will forget conversational context after each session.",
          },
        ].map((m) => (
          <button
            key={m.id}
            onClick={() => updateData({ memoryConsent: m.id })}
            className={`flex items-start gap-4 p-4 rounded-lg border text-left transition-colors w-full ${
              data.memoryConsent === m.id
                ? "border-primary bg-primary/10"
                : "border-border bg-card hover:bg-accent/50"
            }`}
          >
            <div className={`p-2 rounded-full mt-0.5 ${data.memoryConsent === m.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
              <m.icon className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <div className={`font-medium text-sm ${data.memoryConsent === m.id ? "text-primary" : "text-foreground"}`}>{m.label}</div>
              <div className="text-xs text-muted-foreground mt-1">{m.desc}</div>
            </div>
          </button>
        ))}
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
