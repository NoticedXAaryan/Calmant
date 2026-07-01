import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Bell, Mail, Smartphone, Volume2, VolumeX } from "lucide-react";
import { OnboardingState } from "./OnboardingShell";

export function StepNotifications({
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
  const toggleChannel = (channel: string) => {
    const channels = data.notifications.channels.includes(channel)
      ? data.notifications.channels.filter((c) => c !== channel)
      : [...data.notifications.channels, channel];
    updateData({ notifications: { ...data.notifications, channels } });
  };

  const setStrictness = (strictness: string) => {
    updateData({ notifications: { ...data.notifications, strictness } });
  };

  return (
    <div className="animate-in slide-in-from-right-4 fade-in duration-300">
      <div className="mb-6">
        <h2 className="text-2xl font-bold tracking-tight">Notifications</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          How and when should Calmant interrupt you?
        </p>
      </div>

      <div className="space-y-6">
        <div className="space-y-3">
          <label className="text-sm font-medium block">Where should I reach you?</label>
          <div className="grid grid-cols-2 gap-3">
            {[
              { id: "in-app", icon: Bell, label: "In-App" },
              { id: "email", icon: Mail, label: "Email" },
              { id: "telegram", icon: Smartphone, label: "Telegram" },
            ].map((c) => {
              const active = data.notifications.channels.includes(c.id);
              return (
                <button
                  key={c.id}
                  onClick={() => toggleChannel(c.id)}
                  className={`flex items-center gap-3 p-3 rounded-lg border text-sm font-medium transition-colors text-left ${
                    active
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-card hover:bg-accent/50 text-muted-foreground"
                  }`}
                >
                  <c.icon className="h-5 w-5" />
                  {c.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-3">
          <label className="text-sm font-medium block">Interrupt Level</label>
          <div className="flex flex-col gap-3">
            {[
              { id: "critical-only", icon: VolumeX, label: "Critical Only", desc: "Only deadline emergencies" },
              { id: "daily-briefing", icon: Volume2, label: "Daily Briefing + Critical", desc: "Morning summary and emergencies" },
            ].map((s) => (
              <button
                key={s.id}
                onClick={() => setStrictness(s.id)}
                className={`flex items-center gap-4 p-4 rounded-lg border text-left transition-colors ${
                  data.notifications.strictness === s.id
                    ? "border-primary bg-primary/10"
                    : "border-border bg-card hover:bg-accent/50"
                }`}
              >
                <div className={`p-2 rounded-full ${data.notifications.strictness === s.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                  <s.icon className="h-5 w-5" />
                </div>
                <div>
                  <div className={`font-medium text-sm ${data.notifications.strictness === s.id ? "text-primary" : "text-foreground"}`}>{s.label}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{s.desc}</div>
                </div>
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
