"use client";

import { useEffect, useState } from "react";
import { Loader2, Zap, LayoutTemplate, Activity, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AutomationCard } from "@/components/app/automations/AutomationCard";
import { AutomationTemplateCard, AutomationTemplate } from "@/components/app/automations/AutomationTemplateCard";
import { AutomationsHealth } from "@/components/app/automations/AutomationsHealth";

// Mock templates since these are not in the DB yet
const TEMPLATES: AutomationTemplate[] = [
  {
    id: "tpl-1",
    title: "Morning Briefing",
    benefit: "Start your day with a clear picture of what matters most.",
    triggerText: "Every day at 8:00 AM",
    actionText: "Send summary via Telegram",
    setupTime: "1 min",
    requiredIntegrations: ["Telegram"],
    icon: Bell
  },
  {
    id: "tpl-2",
    title: "Deadline Rescue",
    benefit: "Never miss a critical deadline again.",
    triggerText: "Task becomes critical (< 24h)",
    actionText: "Send alert via Email & Telegram",
    setupTime: "2 min",
    requiredIntegrations: ["Email", "Telegram"],
    icon: Zap
  },
  {
    id: "tpl-3",
    title: "Stale Task Cleanup",
    benefit: "Keep your backlog clean automatically.",
    triggerText: "Task untouched for 14 days",
    actionText: "Move to Backlog and notify",
    setupTime: "1 min",
    requiredIntegrations: [],
    icon: Activity
  }
];

export default function AutomationStudioPage() {
  const [data, setData] = useState<{ jobs: any[], policies: any[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function fetchAutomations() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/automations");
      if (!res.ok) throw new Error("Failed to fetch");
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setData(json.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error loading automations");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAutomations();
  }, []);

  const handleUpdatePolicy = (updatedPolicy: any) => {
    setData(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        policies: prev.policies.map(p => p.id === updatedPolicy.id ? updatedPolicy : p)
      };
    });
  };

  const handleDeletePolicy = async (id: string) => {
    // Note: To be implemented in backend, this is a mock frontend implementation
    setData(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        policies: prev.policies.filter(p => p.id !== id)
      };
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-5 md:px-8 md:py-8">
        <header className="flex flex-col gap-4 border-b border-border pb-5 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
              <Zap className="h-3.5 w-3.5" />
              Workflow Engine
            </div>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-foreground md:text-3xl">
              Automation Studio
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={fetchAutomations} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Activity className="h-4 w-4 mr-2" />}
              Refresh
            </Button>
            <Button>
              <Zap className="h-4 w-4 mr-2" /> Create Automation
            </Button>
          </div>
        </header>

        {error && (
          <div className="mb-6 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {loading && !data ? (
          <div className="flex justify-center p-24">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : data ? (
          <Tabs defaultValue="my-automations" className="w-full">
            <TabsList className="mb-6 w-full justify-start overflow-x-auto border-b border-border bg-transparent p-0 rounded-none h-auto">
              <TabsTrigger 
                value="my-automations" 
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4 py-3 text-sm font-medium transition-none"
              >
                My Automations
                <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                  {data.policies.length}
                </span>
              </TabsTrigger>
              <TabsTrigger 
                value="templates" 
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4 py-3 text-sm font-medium transition-none"
              >
                Templates
              </TabsTrigger>
              <TabsTrigger 
                value="health" 
                className="data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4 py-3 text-sm font-medium transition-none"
              >
                System Health
              </TabsTrigger>
            </TabsList>

            <TabsContent value="my-automations" className="m-0 focus-visible:outline-none">
              {data.policies.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-center border border-dashed rounded-lg bg-muted/20 mt-6">
                  <Zap className="h-8 w-8 text-muted-foreground mb-4 opacity-50" />
                  <p className="font-medium text-foreground">No automations configured</p>
                  <p className="text-sm text-muted-foreground max-w-sm mt-1 mb-6">
                    Start automating your workflow by enabling a template or creating a custom rule.
                  </p>
                  <Button variant="outline">Browse Templates</Button>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 mt-6">
                  {data.policies.map((policy) => (
                    <AutomationCard 
                      key={policy.id} 
                      policy={policy} 
                      onUpdate={handleUpdatePolicy}
                      onDelete={handleDeletePolicy}
                    />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="templates" className="m-0 focus-visible:outline-none">
              <div className="grid gap-4 md:grid-cols-3 mt-6">
                {TEMPLATES.map((template) => (
                  <AutomationTemplateCard key={template.id} template={template} />
                ))}
              </div>
            </TabsContent>

            <TabsContent value="health" className="m-0 focus-visible:outline-none">
              <div className="mt-6">
                <AutomationsHealth jobs={data.jobs} />
              </div>
            </TabsContent>
          </Tabs>
        ) : null}
      </div>
    </div>
  );
}
