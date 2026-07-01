"use client";

import { SectionCard } from "@/components/app/SectionCard";
import { Switch } from "@/components/ui/switch";
import { BrainCircuit, ShieldCheck, ShieldAlert } from "lucide-react";

export function AiMemorySettings() {
  return (
    <div className="space-y-6">
      <SectionCard title="Memory Retention" description="How much context should the AI remember between sessions?">
        <div className="space-y-3">
          {[
            { id: "auto", label: "Automatic Memory", desc: "Learn from all interactions silently.", icon: BrainCircuit, active: true },
            { id: "ask", label: "Ask Before Saving", desc: "Prompt me before storing new facts.", icon: ShieldCheck, active: false },
            { id: "off", label: "Disable Memory", desc: "Start fresh every session.", icon: ShieldAlert, active: false },
          ].map((mode) => (
            <div key={mode.id} className={`flex items-center gap-4 p-4 border rounded-lg ${mode.active ? "border-primary bg-primary/5" : "bg-card"}`}>
              <mode.icon className={`h-5 w-5 ${mode.active ? "text-primary" : "text-muted-foreground"}`} />
              <div className="flex-1">
                <p className="font-medium text-sm">{mode.label}</p>
                <p className="text-xs text-muted-foreground">{mode.desc}</p>
              </div>
              <div className={`h-4 w-4 rounded-full border flex items-center justify-center ${mode.active ? "border-primary" : "border-muted-foreground"}`}>
                {mode.active && <div className="h-2 w-2 bg-primary rounded-full" />}
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Action Approvals" description="How strictly should AI actions be regulated?">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Require Approval for External Tools</p>
              <p className="text-sm text-muted-foreground">The AI must ask before sending emails or calling webhooks.</p>
            </div>
            <Switch checked={true} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Require Approval for Deletions</p>
              <p className="text-sm text-muted-foreground">The AI must ask before deleting tasks or events.</p>
            </div>
            <Switch checked={true} />
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
