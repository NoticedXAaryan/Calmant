import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Briefcase, GraduationCap, HeartPulse, Zap } from "lucide-react";
import { OnboardingState } from "./OnboardingShell";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const goals = [
  { id: "study", icon: GraduationCap, label: "School / Assignments" },
  { id: "work", icon: Briefcase, label: "Freelance / Clients" },
  { id: "startup", icon: Zap, label: "Startup / Projects" },
  { id: "life", icon: HeartPulse, label: "Personal Life" },
];

const workModes = [
  { id: "deep-focus", label: "Deep focus blocks" },
  { id: "sprints", label: "Short sprints" },
  { id: "flexible", label: "Flexible reminders" },
  { id: "deadline-rescue", label: "Deadline rescue mode" },
];

export function StepWorkMode({
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
        <h2 className="text-2xl font-bold tracking-tight">Work Mode</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Tell me about yourself and how you like to work.
        </p>
      </div>

      <div className="space-y-6">
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1.5 block">What should I call you?</label>
            <Input
              value={data.name}
              onChange={(e) => updateData({ name: e.target.value })}
              placeholder="Your name"
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Tell me about yourself (optional)</label>
            <Textarea
              value={data.bio}
              onChange={(e) => updateData({ bio: e.target.value })}
              placeholder="E.g., I'm a college student, I work as a freelance designer..."
              rows={2}
            />
          </div>
        </div>

        <div className="space-y-3">
          <label className="text-sm font-medium block">What are you mainly managing?</label>
          <div className="grid grid-cols-2 gap-3">
            {goals.map((g) => (
              <button
                key={g.id}
                onClick={() => updateData({ goal: g.id })}
                className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all ${
                  data.goal === g.id
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-card hover:bg-accent/50 text-muted-foreground"
                }`}
              >
                <g.icon className="mb-2 h-6 w-6" />
                <span className="text-sm font-medium">{g.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <label className="text-sm font-medium block">How do you prefer to work?</label>
          <div className="grid grid-cols-2 gap-3">
            {workModes.map((m) => (
              <button
                key={m.id}
                onClick={() => updateData({ workMode: m.id })}
                className={`p-3 rounded-lg border text-sm font-medium transition-colors text-left ${
                  data.workMode === m.id
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-card hover:bg-accent/50 text-muted-foreground"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
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
