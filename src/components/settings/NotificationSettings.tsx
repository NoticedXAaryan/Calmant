"use client";

import { SectionCard } from "@/components/app/SectionCard";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Bell, Mail, Smartphone } from "lucide-react";

export function NotificationSettings() {
  return (
    <div className="space-y-6">
      <SectionCard title="Notification Channels" description="Where should Calmant reach you?">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 p-2 rounded-md"><Bell className="h-5 w-5 text-primary" /></div>
              <div>
                <p className="font-medium">In-App Notifications</p>
                <p className="text-sm text-muted-foreground">Deliver alerts inside the web app.</p>
              </div>
            </div>
            <Switch checked={true} disabled />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 p-2 rounded-md"><Mail className="h-5 w-5 text-primary" /></div>
              <div>
                <p className="font-medium">Email Summaries</p>
                <p className="text-sm text-muted-foreground">Daily briefings and critical alerts.</p>
              </div>
            </div>
            <Switch checked={true} />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-[#0088cc]/10 p-2 rounded-md"><Smartphone className="h-5 w-5 text-[#0088cc]" /></div>
              <div>
                <p className="font-medium">Telegram</p>
                <p className="text-sm text-muted-foreground">Instant messages for reminders.</p>
              </div>
            </div>
            <Button variant="outline" size="sm">Connect</Button>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Preferences" description="When and how should we interrupt you?">
        <div className="space-y-4">
          <div className="flex flex-col gap-2">
            <p className="font-medium text-sm">Quiet Hours</p>
            <p className="text-sm text-muted-foreground mb-2">No notifications will be sent during these hours.</p>
            <div className="flex items-center gap-2">
              <select className="bg-background border rounded-md px-3 py-1.5 text-sm">
                <option>10:00 PM</option>
                <option>11:00 PM</option>
              </select>
              <span className="text-sm">to</span>
              <select className="bg-background border rounded-md px-3 py-1.5 text-sm">
                <option>08:00 AM</option>
                <option>09:00 AM</option>
              </select>
            </div>
          </div>
          <div className="flex items-center justify-between pt-4 border-t border-border">
            <div>
              <p className="font-medium">Critical Only Mode</p>
              <p className="text-sm text-muted-foreground">Only send notifications for items marked as critical or overdue.</p>
            </div>
            <Switch checked={false} />
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
