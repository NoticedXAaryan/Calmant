"use client";

import { Suspense } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { User, Bell, Blocks, BrainCircuit, Zap, ShieldAlert, Palette, ActivitySquare, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/app/PageHeader";
import { ProfileSettings } from "@/components/settings/ProfileSettings";
import { NotificationSettings } from "@/components/settings/NotificationSettings";
import { IntegrationSettings } from "@/components/settings/IntegrationSettings";
import { AiMemorySettings } from "@/components/settings/AiMemorySettings";
import { AutomationSettings } from "@/components/settings/AutomationSettings";
import { PrivacyDataSettings } from "@/components/settings/PrivacyDataSettings";
import { AppearanceSettings } from "@/components/settings/AppearanceSettings";
import { LogsDiagnosticsSettings } from "@/components/settings/LogsDiagnosticsSettings";

const tabs = [
  { id: "profile", label: "Profile", icon: User },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "integrations", label: "Integrations", icon: Blocks },
  { id: "ai-memory", label: "AI & Memory", icon: BrainCircuit },
  { id: "automations", label: "Automations", icon: Zap },
  { id: "privacy", label: "Privacy & Data", icon: ShieldAlert },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "logs", label: "Logs & Diagnostics", icon: ActivitySquare },
];

function SettingsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  
  const currentTab = searchParams.get("tab") || "profile";

  const setTab = (tabId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", tabId);
    router.push(`${pathname}?${params.toString()}`);
  };

  const renderContent = () => {
    switch (currentTab) {
      case "profile": return <ProfileSettings />;
      case "notifications": return <NotificationSettings />;
      case "integrations": return <IntegrationSettings />;
      case "ai-memory": return <AiMemorySettings />;
      case "automations": return <AutomationSettings />;
      case "privacy": return <PrivacyDataSettings />;
      case "appearance": return <AppearanceSettings />;
      case "logs": return <LogsDiagnosticsSettings />;
      default: return <ProfileSettings />;
    }
  };

  return (
    <div className="flex flex-col md:flex-row gap-8 mt-8">
      {/* Sidebar Nav */}
      <nav className="flex md:flex-col gap-2 overflow-x-auto md:overflow-visible pb-4 md:pb-0 md:w-64 shrink-0 no-scrollbar">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setTab(tab.id)}
            className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap md:whitespace-normal text-left ${
              currentTab === tab.id
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <tab.icon className="h-4 w-4 shrink-0" />
            {tab.label}
          </button>
        ))}
      </nav>

      {/* Content Area */}
      <div className="flex-1 min-w-0">
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-6xl pb-12">
      <PageHeader
        title="Settings"
        description="Manage your account settings and preferences."
      />
      <Suspense fallback={<div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
        <SettingsContent />
      </Suspense>
    </div>
  );
}
