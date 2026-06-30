"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, ArrowLeft, Briefcase, CheckCircle2, GraduationCap, HeartPulse, Zap, Loader2, MessageCircle, User, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

const goals = [
  { id: "study", icon: GraduationCap, label: "Study", helper: "Exams, assignments, revision" },
  { id: "work", icon: Briefcase, label: "Work", helper: "Meetings, deadlines, clients" },
  { id: "health", icon: HeartPulse, label: "Health", helper: "Habits, routines, appointments" },
  { id: "life", icon: Zap, label: "Life admin", helper: "Bills, errands, commitments" },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [selectedGoal, setSelectedGoal] = useState("study");
  const [userName, setUserName] = useState("");
  const [userBio, setUserBio] = useState("");
  const [loading, setLoading] = useState(false);
  const [telegramCode, setTelegramCode] = useState<string | null>(null);
  const [generatingCode, setGeneratingCode] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [connected, setConnected] = useState(false);
  const finishOnboardingRef = useRef<() => Promise<void>>(async () => {});

  const generateTelegramCode = useCallback(async () => {
    setGeneratingCode(true);
    try {
      const res = await fetch("/api/integrations/telegram/connect-code", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setTelegramCode(data.data.code);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setGeneratingCode(false);
    }
  }, []);

  useEffect(() => {
    if (step === 3 && !telegramCode) {
      generateTelegramCode();
    }
  }, [step, telegramCode, generateTelegramCode]);

  async function saveUserProfile() {
    try {
      // Save name and goal to the knowledge graph via agent chat
      const facts = [
        { fact: `User's primary goal area is: ${selectedGoal}`, category: "preference" },
      ];
      if (userName.trim()) {
        facts.push({ fact: `User's name is ${userName.trim()}`, category: "relationship" });
      }
      if (userBio.trim()) {
        facts.push({ fact: `About the user: ${userBio.trim()}`, category: "preference" });
      }

      // Store directly via API
      for (const f of facts) {
        await fetch("/api/agent/memory", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(f),
        }).catch(() => {});
      }
    } catch {
      // Non-critical — continue even if memory storage fails
    }
  }

  async function finishOnboarding() {
    setLoading(true);
    
    // Save profile data to knowledge graph
    await saveUserProfile();

    // Set onboarded cookie and localStorage
    document.cookie = `vibe2ship_onboarded=true; path=/; max-age=31536000; SameSite=Lax`;
    window.localStorage.setItem("calmant_primary_goal", selectedGoal);
    
    // Mark onboarded in the database
    await fetch("/api/user/onboard", { method: "POST" }).catch(() => {});

    // Trigger welcome email
    fetch("/api/notifications/welcome", { method: "POST" }).catch(console.error);
    
    router.push("/dashboard");
    router.refresh();
  }

  useEffect(() => {
    finishOnboardingRef.current = finishOnboarding;
  });

  useEffect(() => {
    if (step !== 3 || connected) return;

    const interval = setInterval(async () => {
      setCheckingStatus(true);
      try {
        const res = await fetch("/api/integrations/status");
        const data = await res.json();
        if (data.success && data.data.telegram.configured && data.data.telegram.userLinked) {
          setConnected(true);
          clearInterval(interval);
          setTimeout(() => {
            finishOnboardingRef.current();
          }, 2000);
        }
      } catch (e) {
        // ignore
      } finally {
        setCheckingStatus(false);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [step, connected]);

  // --- Step Indicator ---
  const totalSteps = 3;
  const stepLabels = ["About You", "Your Focus", "Connect"];

  return (
    <div className="flex min-h-[calc(100vh-56px)] items-center justify-center bg-background px-4 py-8 md:min-h-screen">
      <div className="w-full max-w-2xl rounded-xl border border-border bg-card p-5 shadow-sm md:p-8">
        
        {/* Step Indicator */}
        <div className="mb-8 flex items-center justify-center gap-2">
          {stepLabels.map((label, i) => (
            <div key={label} className="flex items-center gap-2">
              <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium transition-colors ${
                i + 1 <= step ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}>
                {i + 1 < step ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
              </div>
              <span className={`hidden text-xs sm:inline ${i + 1 <= step ? "text-foreground" : "text-muted-foreground"}`}>{label}</span>
              {i < totalSteps - 1 && <div className={`h-px w-8 ${i + 1 < step ? "bg-primary" : "bg-border"}`} />}
            </div>
          ))}
        </div>

        {/* Step 1: About You */}
        {step === 1 && (
          <>
            <div className="mb-8 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <User className="h-5 w-5" />
              </div>
              <h1 className="text-2xl font-semibold tracking-tight">Welcome to Calmant</h1>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Tell me a bit about yourself so I can be more helpful. This helps me personalize everything.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor="onboard-name" className="block text-sm font-medium text-foreground mb-1.5">
                  What should I call you?
                </label>
                <input
                  id="onboard-name"
                  type="text"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="Your name"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div>
                <label htmlFor="onboard-bio" className="block text-sm font-medium text-foreground mb-1.5">
                  Tell me about yourself <span className="text-muted-foreground">(optional)</span>
                </label>
                <textarea
                  id="onboard-bio"
                  value={userBio}
                  onChange={(e) => setUserBio(e.target.value)}
                  placeholder="E.g., I'm a college student, I work as a freelance designer, I'm building a startup..."
                  rows={3}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                />
                <p className="mt-1 text-xs text-muted-foreground">This helps me understand your context and give better recommendations.</p>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <Button onClick={() => setStep(2)}>
                Next
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </>
        )}

        {/* Step 2: Choose Focus Area */}
        {step === 2 && (
          <>
            <div className="mb-8 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <Sparkles className="h-5 w-5" />
              </div>
              <h1 className="text-2xl font-semibold tracking-tight">What's your main focus?</h1>
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

            <div className="mt-6 flex justify-between">
              <Button variant="ghost" onClick={() => setStep(1)}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <Button onClick={() => setStep(3)}>
                Next
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </>
        )}

        {/* Step 3: Connect Telegram */}
        {step === 3 && (
          <>
            <div className="mb-8 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[#229ED9] text-white">
                <MessageCircle className="h-5 w-5" />
              </div>
              <h1 className="text-2xl font-semibold tracking-tight">Connect Telegram</h1>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                This is how I'll reach you — morning briefings, reminders, and quick tasks, all on your phone.
              </p>
            </div>

            <div className="rounded-lg border border-border bg-background p-6">
              {connected ? (
                <div className="flex flex-col items-center justify-center py-6 text-center">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-500">
                    <CheckCircle2 className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-medium text-emerald-500">Connected!</h3>
                  <p className="mt-2 text-sm text-muted-foreground">Setting up your AI company...</p>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <ol className="w-full max-w-sm space-y-4 text-sm">
                    <li className="flex items-start gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">1</span>
                      <div>
                        Open <a href="https://t.me/Calmant_bot" target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:underline">@Calmant_bot</a> in Telegram
                      </div>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">2</span>
                      <div className="w-full">
                        Send this exact message:
                        {generatingCode ? (
                          <div className="mt-2 flex h-10 w-full items-center justify-center rounded border bg-muted/50">
                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                          </div>
                        ) : (
                          <div className="mt-2 rounded border bg-muted px-3 py-2 text-center font-mono text-lg font-semibold tracking-wider text-primary">
                            /connect {telegramCode}
                          </div>
                        )}
                      </div>
                    </li>
                  </ol>
                  
                  <div className="mt-8 flex items-center gap-2 text-xs text-muted-foreground">
                    {checkingStatus ? <Loader2 className="h-3 w-3 animate-spin" /> : <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />}
                    Waiting for connection...
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-between">
              <Button variant="ghost" onClick={() => setStep(2)} disabled={loading || connected}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <Button onClick={finishOnboarding} disabled={loading || connected}>
                {loading ? "Setting up..." : "Skip — Enter dashboard"}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </>
        )}

      </div>
    </div>
  );
}
