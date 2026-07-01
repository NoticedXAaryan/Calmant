"use client";

import { SectionCard } from "@/components/app/SectionCard";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { PauseCircle } from "lucide-react";

export function AutomationSettings() {
  return (
    <div className="space-y-6">
      <SectionCard title="Global Automation Controls" description="Master switches for background routines.">
        <div className="p-4 border border-destructive/20 bg-destructive/5 rounded-lg flex items-start gap-4 mb-6">
          <PauseCircle className="h-5 w-5 text-destructive mt-0.5" />
          <div className="flex-1">
            <p className="font-medium text-destructive">Pause All Automations</p>
            <p className="text-sm text-destructive/80 mb-3">Immediately halt all background workers, recurring rules, and active workflows. Existing running jobs will be terminated.</p>
            <Button variant="destructive" size="sm">Halt System</Button>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-4">
            <div>
              <p className="font-medium text-sm">Smart Routines</p>
              <p className="text-xs text-muted-foreground">Allow AI to autonomously reorganize your schedule when conflicts occur.</p>
            </div>
            <Switch checked={false} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">Task Ingestion</p>
              <p className="text-xs text-muted-foreground">Automatically process and tag raw tasks captured via Telegram or email.</p>
            </div>
            <Switch checked={true} />
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
