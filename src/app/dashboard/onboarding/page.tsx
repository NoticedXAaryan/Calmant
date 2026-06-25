"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, CheckCircle2, Target, Zap, Briefcase, HeartPulse, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const goals = [
  { id: "career", icon: Briefcase, label: "Career & Work" },
  { id: "health", icon: HeartPulse, label: "Health & Fitness" },
  { id: "study", icon: GraduationCap, label: "Learning & Study" },
  { id: "productivity", icon: Zap, label: "General Productivity" },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [selectedGoal, setSelectedGoal] = useState<string | null>(null);
  const [focusArea, setFocusArea] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleComplete() {
    setLoading(true);
    // In a real app, save this to the DB. For now, we set a cookie to mark onboarding complete.
    document.cookie = "vibe2ship_onboarded=true; path=/; max-age=31536000"; // 1 year
    
    // Create an initial intent task if they provided one
    if (focusArea) {
      try {
        await fetch("/api/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: `My Focus: ${focusArea}`,
            description: `Primary goal category: ${selectedGoal}`,
            status: "pending",
          }),
        });
      } catch (e) {
        console.error("Failed to save initial intent");
      }
    }

    router.push("/");
    router.refresh();
  }

  return (
    <div className="flex min-h-[80vh] items-center justify-center p-4">
      <Card className="w-full max-w-lg border-muted/50 bg-card/50 backdrop-blur-xl shadow-2xl relative overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-20 -right-20 h-64 w-64 rounded-full bg-primary/5 blur-3xl" />

        <CardHeader className="relative z-10 text-center pb-2">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg">
            <Zap size={24} />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">Welcome to Life Saver</CardTitle>
          <CardDescription className="text-base">Let's set up your AI companion</CardDescription>
        </CardHeader>

        <CardContent className="relative z-10 mt-6 min-h-[220px]">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex flex-col gap-4"
              >
                <div className="text-center text-sm text-muted-foreground mb-2">
                  What is your primary focus right now?
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {goals.map((goal) => {
                    const isSelected = selectedGoal === goal.id;
                    const Icon = goal.icon;
                    return (
                      <button
                        key={goal.id}
                        onClick={() => setSelectedGoal(goal.id)}
                        className={`flex flex-col items-center gap-3 rounded-xl border p-4 transition-all ${
                          isSelected
                            ? "border-primary bg-primary/10 text-primary shadow-sm"
                            : "border-border bg-card text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                        }`}
                      >
                        <Icon size={24} />
                        <span className="text-sm font-medium">{goal.label}</span>
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex flex-col gap-6"
              >
                <div className="text-center text-sm text-muted-foreground">
                  Give the AI an idea of what you want to achieve.
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-foreground ml-1">My ultimate goal is...</label>
                  <Input
                    placeholder="e.g. Launch my startup by next month"
                    value={focusArea}
                    onChange={(e) => setFocusArea(e.target.value)}
                    className="h-12 text-base px-4"
                    autoFocus
                  />
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center gap-4 py-8 text-center"
              >
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-500">
                  <CheckCircle2 size={32} />
                </div>
                <div>
                  <h3 className="text-xl font-bold">You're all set!</h3>
                  <p className="mt-2 text-sm text-muted-foreground max-w-[280px]">
                    The AI is now ready to help you plan your days and track your progress.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </CardContent>

        <CardFooter className="relative z-10 flex justify-between border-t border-border/50 bg-muted/20 px-6 py-4">
          <div className="flex gap-1.5">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === step ? "w-6 bg-primary" : "w-1.5 bg-primary/20"
                }`}
              />
            ))}
          </div>

          {step < 3 ? (
            <Button
              onClick={() => setStep(step + 1)}
              disabled={step === 1 && !selectedGoal}
              className="gap-2"
            >
              Next Step <ArrowRight size={16} />
            </Button>
          ) : (
            <Button
              onClick={handleComplete}
              disabled={loading}
              className="gap-2"
            >
              {loading ? "Preparing..." : "Enter Dashboard"} <Target size={16} />
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}
