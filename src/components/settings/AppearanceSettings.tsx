"use client";

import { SectionCard } from "@/components/app/SectionCard";
import { ThemeToggle } from "@/components/ThemeToggle";

export function AppearanceSettings() {
  return (
    <div className="space-y-6">
      <SectionCard title="Theme" description="Customize how Calmant looks on your device.">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-medium text-sm">Color Theme</p>
            <p className="text-xs text-muted-foreground">Switch between light and dark modes, or sync with your system.</p>
          </div>
          <ThemeToggle />
        </div>
      </SectionCard>

      <SectionCard title="Layout Density" description="Adjust the spacing and size of elements in the app.">
        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 border border-primary bg-primary/5 rounded-lg text-center cursor-pointer">
            <p className="font-medium text-sm mb-1">Comfortable</p>
            <p className="text-xs text-muted-foreground">Generous spacing, larger text (Default)</p>
          </div>
          <div className="p-4 border border-border bg-card hover:bg-accent/50 rounded-lg text-center cursor-pointer">
            <p className="font-medium text-sm mb-1">Compact</p>
            <p className="text-xs text-muted-foreground">Denser data views for power users</p>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
