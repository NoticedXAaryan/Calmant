"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { StepWelcome } from "./StepWelcome";
import { StepWorkMode } from "./StepWorkMode";
import { StepCommitments } from "./StepCommitments";
import { StepNotifications } from "./StepNotifications";
import { StepMemoryConsent } from "./StepMemoryConsent";
import { StepIntegrations } from "./StepIntegrations";
import { StepPlanPreview } from "./StepPlanPreview";

export type OnboardingState = {
  name: string;
  bio: string;
  goal: string;
  workMode: string;
  commitments: string[];
  notifications: {
    channels: string[];
    strictness: string;
    quietHours: string;
  };
  memoryConsent: string;
};

const defaultState: OnboardingState = {
  name: "",
  bio: "",
  goal: "study",
  workMode: "deep-focus",
  commitments: [],
  notifications: {
    channels: ["in-app"],
    strictness: "critical-only",
    quietHours: "22:00-08:00",
  },
  memoryConsent: "remember-all",
};

export function OnboardingShell() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [data, setData] = useState<OnboardingState>(defaultState);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem("calmant_onboarding_draft");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.step) setStep(parsed.step);
        if (parsed.data) setData(parsed.data);
      } catch (e) {
        // ignore parse error
      }
    }
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      window.localStorage.setItem("calmant_onboarding_draft", JSON.stringify({ step, data }));
    }
  }, [step, data, mounted]);

  const updateData = (updates: Partial<OnboardingState>) => {
    setData((prev) => ({ ...prev, ...updates }));
  };

  const nextStep = () => setStep((s) => Math.min(s + 1, 7));
  const prevStep = () => setStep((s) => Math.max(s - 1, 1));

  const completeOnboarding = async () => {
    // 1. Send data to APIs
    // 2. Set onboarded cookie
    document.cookie = `vibe2ship_onboarded=true; path=/; max-age=31536000; SameSite=Lax`;
    window.localStorage.removeItem("calmant_onboarding_draft");
    window.localStorage.setItem("calmant_primary_goal", data.goal);
    
    await fetch("/api/user/onboard", { method: "POST" }).catch(() => {});
    fetch("/api/notifications/welcome", { method: "POST" }).catch(console.error);

    router.push("/dashboard");
    router.refresh();
  };

  if (!mounted) return null;

  const totalSteps = 7;
  const stepLabels = [
    "Welcome",
    "Work Mode",
    "Commitments",
    "Alerts",
    "Memory",
    "Connect",
    "Preview",
  ];

  return (
    <div className="flex min-h-[calc(100vh-56px)] items-center justify-center bg-background px-4 py-8 md:min-h-screen">
      <div className="w-full max-w-2xl rounded-xl border border-border bg-card p-5 shadow-sm md:p-8">
        
        {/* Step Indicator */}
        <div className="mb-8 flex items-center justify-center gap-1 md:gap-2">
          {stepLabels.map((label, i) => (
            <div key={label} className="flex items-center gap-1 md:gap-2">
              <div className={`flex h-6 w-6 md:h-7 md:w-7 items-center justify-center rounded-full text-xs font-medium transition-colors ${
                i + 1 <= step ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}>
                {i + 1 < step ? <CheckCircle2 className="h-3 w-3 md:h-4 md:w-4" /> : i + 1}
              </div>
              <span className={`hidden text-[10px] md:text-xs sm:inline ${i + 1 <= step ? "text-foreground" : "text-muted-foreground"}`}>{label}</span>
              {i < totalSteps - 1 && <div className={`h-px w-2 md:w-6 ${i + 1 < step ? "bg-primary" : "bg-border"}`} />}
            </div>
          ))}
        </div>

        {/* Current Step Content */}
        {step === 1 && <StepWelcome onNext={nextStep} />}
        {step === 2 && <StepWorkMode data={data} updateData={updateData} onNext={nextStep} onBack={prevStep} />}
        {step === 3 && <StepCommitments data={data} updateData={updateData} onNext={nextStep} onBack={prevStep} />}
        {step === 4 && <StepNotifications data={data} updateData={updateData} onNext={nextStep} onBack={prevStep} />}
        {step === 5 && <StepMemoryConsent data={data} updateData={updateData} onNext={nextStep} onBack={prevStep} />}
        {step === 6 && <StepIntegrations onNext={nextStep} onBack={prevStep} />}
        {step === 7 && <StepPlanPreview data={data} onComplete={completeOnboarding} onBack={prevStep} />}
        
      </div>
    </div>
  );
}
