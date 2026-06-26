"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Briefcase, CheckCircle2, GraduationCap, HeartPulse, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

const goals = [
  { id: "study", icon: GraduationCap, label: "Study", helper: "Exams, assignments, revision" },
  { id: "work", icon: Briefcase, label: "Work", helper: "Meetings, deadlines, clients" },
  { id: "health", icon: HeartPulse, label: "Health", helper: "Habits, routines, appointments" },
  { id: "life", icon: Zap, label: "Life admin", helper: "Bills, errands, commitments" },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [selectedGoal, setSelectedGoal] = useState("study");
  const [loading, setLoading] = useState(false);

  function enterDashboard() {
    setLoading(true);
    document.cookie = `vibe2ship_onboarded=true; path=/; max-age=31536000; SameSite=Lax`;
    window.localStorage.setItem("calmant_primary_goal", selectedGoal);
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="flex min-h-[calc(100vh-56px)] items-center justify-center bg-background px-4 py-8 md:min-h-screen">
      <div className="w-full max-w-2xl rounded-xl border border-border bg-card p-5 shadow-sm md:p-8">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Zap className="h-5 w-5" />
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Set up Calmant</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Choose the area where missed deadlines hurt most. You can change this later.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {goals.map((goal) => {
            const Icon = goal.icon;
            const selected = selectedGoal === goal.id;
            return (
              <button
                key={goal.id}
                type="button"
                onClick={() => setSelectedGoal(goal.id)}
                className={`rounded-lg border p-4 text-left transition ${
                  selected ? "border-primary bg-primary/5" : "border-border bg-background hover:bg-muted/40"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <Icon className="h-5 w-5 text-muted-foreground" />
                  {selected && <CheckCircle2 className="h-4 w-4 text-primary" />}
                </div>
                <div className="mt-4 font-medium">{goal.label}</div>
                <div className="mt-1 text-sm text-muted-foreground">{goal.helper}</div>
              </button>
            );
          })}
        </div>

        <div className="mt-8 rounded-lg border border-border bg-background p-4 text-sm leading-6 text-muted-foreground">
          Next, add one real commitment on the Today screen. Calmant will parse it, ask for confirmation if needed, then build your first focus block.
        </div>

        <div className="mt-6 flex justify-end">
          <Button onClick={enterDashboard} disabled={loading}>
            {loading ? "Preparing..." : "Enter dashboard"}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
